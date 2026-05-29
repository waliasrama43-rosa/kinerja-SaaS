// ====================================================================
// FILE 10: MESIN QRIS DINAMIS (GENERATIF)
// ====================================================================
// Konversi QRIS STATIS → QRIS DINAMIS bernominal otomatis.
// Standar: EMVCo QR Code Specification for Payment Systems (MPM).
//
// Cara kerja konversi statis → dinamis:
//   1. Ubah tag 01 (Point of Initiation) dari "11" (statis) → "12" (dinamis)
//   2. Sisipkan tag 54 (Transaction Amount) berisi nominal transaksi
//   3. Buang CRC lama (tag 63) lalu hitung ulang CRC16-CCITT (0x1021, init 0xFFFF)
//   4. Tempel CRC baru (4 digit HEX kapital) di akhir setelah "6304"
//
// Sumber payload QRIS statis (urutan prioritas):
//   1. Sheet "Pengaturan" kunci `QRIS_STATIS`  (mudah diubah tanpa sentuh kode)
//   2. SAAS_CONFIG.QRIS_STATIS_PAYLOAD          (default di 01_Config.js)
//
// Hasilnya adalah payload QRIS yang bila di-scan aplikasi bank/e-wallet
// akan otomatis menampilkan nominal — klien tinggal bayar tanpa ketik manual.
// Dipakai oleh: buatInvoiceOtonomSaaS() di 05_AdminEngine.js
// ====================================================================

// Padding panjang TLV ke 2 digit (mis. 5 → "05")
function _qrisPad2(n) {
  n = n.toString();
  return n.length < 2 ? "0" + n : n;
}

// Parser TLV level atas (template bersarang diperlakukan sebagai 1 TLV utuh)
function _qrisParseTLV(payload) {
  var hasil = [];
  var i = 0;
  while (i + 4 <= payload.length) {
    var tag = payload.substr(i, 2);          i += 2;
    var len = parseInt(payload.substr(i, 2), 10); i += 2;
    if (isNaN(len) || i + len > payload.length) break;
    var val = payload.substr(i, len);        i += len;
    hasil.push({ tag: tag, val: val });
  }
  return hasil;
}

// CRC16-CCITT (FALSE) — polinomial 0x1021, nilai awal 0xFFFF
function _qrisCRC16(str) {
  var crc = 0xFFFF;
  for (var i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (var j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  var hex = (crc & 0xFFFF).toString(16).toUpperCase();
  while (hex.length < 4) hex = "0" + hex;
  return hex;
}

// Builder utama: payload QRIS statis + nominal → payload QRIS dinamis
function buatQrisDinamis(payloadStatis, nominal) {
  if (!payloadStatis) throw new Error("Payload QRIS statis kosong.");
  // Hanya buang baris baru/tab (artefak copy-paste), JANGAN buang spasi internal
  // karena nama merchant (tag 59) & kota (tag 60) sah mengandung spasi.
  var bersih = payloadStatis.toString().replace(/[\r\n\t]/g, "").trim();
  if (bersih.length < 20 || bersih.substr(0, 4) !== "0002") {
    throw new Error("Format payload QRIS statis tidak valid.");
  }

  var nominalStr = Math.round(parseFloat(nominal)).toString();
  var tag54      = "54" + _qrisPad2(nominalStr.length) + nominalStr;

  var tlv      = _qrisParseTLV(bersih);
  var out      = "";
  var disisip  = false;

  for (var k = 0; k < tlv.length; k++) {
    var t = tlv[k];
    if (t.tag === "63") continue;            // buang CRC lama
    if (t.tag === "54") continue;            // buang nominal lama (kita set sendiri)

    if (t.tag === "01") {                    // paksa jadi dinamis (12)
      out += "0102" + "12";
      continue;
    }
    // Sisipkan nominal tepat sebelum tag 58 (kode negara) sesuai urutan EMVCo
    if (t.tag === "58" && !disisip) {
      out += tag54;
      disisip = true;
    }
    out += t.tag + _qrisPad2(t.val.length) + t.val;
  }
  if (!disisip) out += tag54;                // fallback bila tag 58 tak ada

  out += "6304";                             // id+len untuk CRC
  out += _qrisCRC16(out);                    // CRC16 atas seluruh string termasuk "6304"
  return out;
}

// ── Helper: ambil payload QRIS statis dari sheet/config ──────────
// Mengembalikan string payload (atau "" bila belum dikonfigurasi).
function ambilPayloadQrisStatis(config) {
  if (config && config.QRIS_STATIS &&
      config.QRIS_STATIS.toString().replace(/\s+/g, "").indexOf("0002") === 0) {
    return config.QRIS_STATIS.toString();
  }
  return SAAS_CONFIG.QRIS_STATIS_PAYLOAD || "";
}

// ── Tes cepat di editor Apps Script ──────────────────────────────
// Jalankan fungsi ini setelah mengisi QRIS_STATIS untuk verifikasi.
function tesQrisDinamis() {
  var cfg    = ambilKonfigurasiSaaS();
  var statis = ambilPayloadQrisStatis(cfg);
  if (!statis) { Logger.log("⚠️ QRIS_STATIS belum diisi di sheet Pengaturan / Config."); return; }
  var dinamis = buatQrisDinamis(statis, 10523);
  Logger.log("STATIS : " + statis);
  Logger.log("DINAMIS: " + dinamis);
  Logger.log("CRC akhir 4 digit: " + dinamis.slice(-4));
  Logger.log("Valid CRC: " + (_qrisCRC16(dinamis.slice(0, -4)) === dinamis.slice(-4)));
}
