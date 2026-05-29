// ====================================================================
// FILE 10: GENERATOR QRIS DINAMIS (STANDAR EMVCo)
// ====================================================================
// Mengubah QRIS STATIS (tanpa nominal) menjadi QRIS DINAMIS dengan
// nominal yang sudah tertanam, sehingga klien tidak perlu mengetik
// nominal manual saat membayar.
//
// Cara kerja:
//  1. Ubah tag 01 "Point of Initiation Method" dari 11 (statis) -> 12 (dinamis)
//  2. Sisipkan tag 54 (Transaction Amount) berisi nominal
//  3. Hitung ulang CRC16 (tag 63)
//  4. Render menjadi gambar QR via API.
// ====================================================================

/** CRC16-CCITT (False) — polinomial 0x1021, nilai awal 0xFFFF. */
function hitungCRC16Qris(str) {
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

function _pad2Qris(n) { return (n < 10 ? "0" : "") + n; }

/** Pecah string EMVCo menjadi daftar TLV level-atas: [{tag, val}, ...] */
function _parseTlvQris(s) {
  var out = [], i = 0;
  while (i + 4 <= s.length) {
    var tag = s.substr(i, 2);
    var len = parseInt(s.substr(i + 2, 2), 10);
    if (isNaN(len)) break;
    var val = s.substr(i + 4, len);
    out.push({ tag: tag, val: val });
    i += 4 + len;
  }
  return out;
}

/**
 * Bangun payload QRIS dinamis dari QRIS statis + nominal (rupiah, integer).
 * @return {string} payload QRIS dinamis lengkap dengan CRC.
 */
function buatQrisDinamis(qrisStatis, nominal) {
  var s = String(qrisStatis).trim();

  // Buang CRC lama (pola "6304XXXX" di akhir) bila ada.
  if (s.length >= 8 && s.substr(s.length - 8, 4) === "6304") {
    s = s.substring(0, s.length - 8);
  }

  var tlv = _parseTlvQris(s);
  var nominalStr = String(Math.round(Number(nominal)));
  var tag54 = "54" + _pad2Qris(nominalStr.length) + nominalStr;

  var out = "", sudahSisip = false;
  for (var i = 0; i < tlv.length; i++) {
    var t = tlv[i];
    if (t.tag === "01") { out += "010212"; continue; }   // statis -> dinamis
    if (t.tag === "54") { continue; }                    // buang nominal lama (akan diganti)
    if (t.tag === "58" && !sudahSisip) {                 // sisipkan nominal sebelum kode negara
      out += tag54; sudahSisip = true;
    }
    out += t.tag + _pad2Qris(t.val.length) + t.val;
  }
  if (!sudahSisip) out += tag54;

  out += "6304";
  return out + hitungCRC16Qris(out);
}

/** Render payload QRIS menjadi blob gambar PNG via API QR. */
function generateBlobQris(payload, apiUrl) {
  var base = apiUrl || "https://api.qrserver.com/v1/create-qr-code/";
  var url = base + "?size=512x512&margin=15&data=" + encodeURIComponent(payload);
  return UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getBlob().setName("QRIS_Dinamis.png");
}

/** Uji cepat dari editor: cek payload dinamis terbentuk benar. */
function tesQrisDinamis() {
  var cfg = ambilKonfigurasiSaaS();
  var statis = cfg.QRIS_STATIC_STRING || SAAS_CONFIG.QRIS_STATIC_STRING || "";
  if (!statis) {
    console.log("❌ QRIS_STATIC_STRING belum diisi. Jalankan: /admin set_qris <payload> di Telegram.");
    return;
  }
  var dyn = buatQrisDinamis(statis, 10123);
  console.log("Payload dinamis (Rp 10.123):\n" + dyn);
  console.log("Panjang: " + dyn.length + " | CRC akhir: " + dyn.slice(-4));
}
