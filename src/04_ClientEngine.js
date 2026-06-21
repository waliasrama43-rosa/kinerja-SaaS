// ====================================================================
// FILE 04: ENGINE UTAMA INTERAKSI & ALUR KERJA KLIEN (REVISI V6)
// ====================================================================

function prosesFiturKlienSaaS(update, config, token) {
  var chatId   = (update.message
    ? update.message.chat.id
    : update.callback_query.message.chat.id).toString();

  var klien   = cariAtauDaftarKlienSaaS(
    chatId,
    update.message ? update.message.from.first_name : ""
  );
  var sapaan  = getSapaan(klien.Nama_Pendaftar);
  // Defensif: State_Sesi selalu diperlakukan sebagai string agar
  // pemanggilan .indexOf() tidak melempar error bila sel bertipe lain.
  var stateSesi = (klien.State_Sesi == null ? "" : klien.State_Sesi).toString();

  if (update.message && update.message.text) {
    var text = update.message.text.trim();

    // ── 1. PERINTAH UTAMA ──────────────────────────────────────────
    if (text === "/start" || text === "/lapor") {

      // Belum daftar → mulai wizard
      if (klien.Status_Akses === "BELUM_DAFTAR") {
        perbaruiKolomKlien(chatId, "State_Sesi", "REG_TUNGGU_NAMA");
        kirimPesanSaaS(chatId,
          "👋 Halo! Selamat datang di *Kinerja RHK* — platform pelaporan " +
          "harian otomatis langsung dari Telegram.\n\n" +
          "Akun Anda belum terdaftar. Mari kita mulai pendaftaran singkat.\n\n" +
          "Silakan ketikkan *Nama Lengkap beserta Gelar* Anda: 👇",
          null, token);
        return;
      }

      // Sedang dalam proses registrasi wizard
      if (klien.Status_Akses === "REG_WIZARD") {
        var kbLanjutReg = {"inline_keyboard": [
          [{"text": "🔄 Lanjutkan Pendaftaran", "callback_data": "REG_LANJUT"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "⏳ *Pendaftaran " + sapaan + " sedang diproses.*\n\n" +
          "Admin sedang memverifikasi berkas dan menyiapkan konfigurasi menu RHK. " +
          "Notifikasi akan dikirimkan begitu sistem siap digunakan.\n\n" +
          "Jika ada pertanyaan, silakan hubungi Admin langsung.",
          kbLanjutReg, token);
        return;
      }

      // Menunggu admin konfigurasi template → arahkan kirim .docx
      if (klien.Status_Akses === "PENDING_RHK") {
        var kbPending = {"inline_keyboard": [
          [{"text": "📄 Kirim File Template .docx", "callback_data": "PENDING_INFO_TEMPLATE"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "⚙️ *Konfigurasi Menu Sedang Disiapkan*\n\n" +
          "Halo *" + sapaan + "*, pembayaran sudah terverifikasi! 🎉\n\n" +
          "Saat ini Admin sedang menyiapkan menu RHK berdasarkan template dokumen " +
          "laporan *" + sapaan + "*.\n\n" +
          "Jika belum mengirimkan file template *(.docx)*, silakan kirimkan sekarang " +
          "langsung ke chat ini — sistem akan meneruskannya ke Admin secara otomatis.",
          kbPending, token);
        return;
      }

      // Akun nonaktif/diblokir
      if (klien.Status_Akses !== "AKTIF") {
        var kbNonaktif = {"inline_keyboard": [
          [{"text": "💎 Perpanjang Langganan", "callback_data": "SHORTCUT_BAYAR"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "🔒 *Akses akun " + sapaan + " saat ini dinonaktifkan.*\n\n" +
          "Silakan hubungi Admin atau lakukan perpanjangan untuk mengaktifkan kembali.",
          kbNonaktif, token);
        return;
      }

      // Masa aktif habis
      if (new Date() > new Date(klien.Masa_Aktif)) {
        var kbExpired = {"inline_keyboard": [
          [{"text": "💎 Perpanjang Sekarang", "callback_data": "SHORTCUT_BAYAR"}],
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "⏰ *Masa aktif akun " + sapaan + " telah berakhir.*\n\n" +
          "Berakhir pada: *" +
          formatDateCached(new Date(klien.Masa_Aktif), "GMT+7", "dd/MM/yyyy") + "*\n\n" +
          "Lakukan perpanjangan untuk melanjutkan pelaporan RHK. " +
          "Semua data & template tetap tersimpan. 💎",
          kbExpired, token);
        return;
      }

      // Limit harian habis
      if (parseInt(klien.Limit_Harian) <= 0) {
        var kbLimit = {"inline_keyboard": [
          [tombolHubungiAdminWA()]
        ]};
        kirimPesanSaaS(chatId,
          "🛑 *Kuota harian " + sapaan + " telah habis.*\n\n" +
          "Sangat produktif hari ini! Kuota cetak akan direset otomatis " +
          "besok pukul 00:01. Silakan kembali melaporkan besok. 🌟",
          kbLimit, token);
        return;
      }

      // ✅ Semua validasi lolos → tampilkan menu RHK
      var props = PropertiesService.getScriptProperties();
      // Bersihkan session properties lama
      var allProps = props.getProperties();
      for (var k in allProps) {
        if (k.indexOf("sess_" + chatId + "_") === 0) props.deleteProperty(k);
      }

      // ✅ OPTIMIZED: Batch update state + foto count (1 lock + 1 flush)
      perbaruiMultiKolom(chatId, {
        "State_Sesi": "PILIH_RHK",
        "Foto_Count": 0
      });
      tampilkanMenuRHKKlien(chatId, token);
      return;
    }

    if (text === "/langganan" || text === "/bayar") {
      tampilkanMenuPaketKomersial(chatId, token);
      return;
    }

    // ── 2. SESI INPUT TANGGAL MANUAL ──────────────────────────────
    if (stateSesi === "TUNGGU_TGL_MANUAL") {
      var polaTgl = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (polaTgl.test(text)) {
        var parts = text.split("/");
        var d     = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
        var hIndo = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
        var bIndo = ["Januari","Februari","Maret","April","Mei","Juni",
                     "Juli","Agustus","September","Oktober","November","Desember"];
        var formatIndo = parts[0] + " " + bIndo[parseInt(parts[1]) - 1] + " " + parts[2];

        perbaruiKolomKlien(chatId, "Tanggal_Terpilih", formatIndo);
        perbaruiKolomKlien(chatId, "Hari_Terpilih",    hIndo[d.getDay()]);
        kirimPesanSaaS(chatId, "🗓️ Tanggal dikunci: *" + formatIndo + "*", null, token);
        analisisDanMulaiPertanyaanDoc(chatId, token);
      } else {
        kirimPesanSaaS(chatId,
          "⚠️ *Format tanggal salah.*\n\n" +
          "Gunakan format `DD/MM/YYYY` — contoh: `22/05/2026`\n\n" +
          "Ketik /batal untuk membatalkan.", null, token);
      }
      return;
    }

    // ── 3. SESI KUESIONER PERTANYAAN ──────────────────────────────
    if (stateSesi.indexOf("TUNGGU_TAG_") === 0) {
      var tagAktif = stateSesi.replace("TUNGGU_TAG_", "");
      PropertiesService.getScriptProperties()
        .setProperty("sess_" + chatId + "_ans_" + tagAktif, text);
      pindahKePertanyaanBerikutnya(chatId, token);
      return;
    }

    // ── 4. FALLBACK — perintah tidak dikenal ──────────────────────
    if (stateSesi === "") {
      // Notif senyap ke admin
      var configFb = ambilKonfigurasiSaaS();
      kirimPesanSaaS(configFb.ADMIN_CHAT_ID,
        "🔔 *Perintah Tidak Dikenal*\n\n" +
        "👤 *" + sapaan + "* (`" + chatId + "`)\n" +
        "💬 Teks: `" + text + "`\n" +
        "📌 Status: `" + klien.Status_Akses + "`",
        null, configFb.BOT_TOKEN);

      var kbFallback = {"inline_keyboard": [
        [{"text": "📋 Mulai Laporan RHK",       "callback_data": "SHORTCUT_LAPOR"}],
        [{"text": "💎 Info & Perpanjang Paket",  "callback_data": "SHORTCUT_BAYAR"}],
        [tombolHubungiAdminWA()]
      ]};
      kirimPesanSaaS(chatId,
        "🤔 *Perintah tidak dikenali.*\n\n" +
        "Gunakan menu di bawah atau perintah:\n" +
        "▪️ `/lapor` — Mulai pelaporan RHK\n" +
        "▪️ `/bayar` — Info & perpanjang langganan\n" +
        "▪️ `/batal` — Batalkan proses saat ini",
        kbFallback, token);

    } else {
      // Masih di tengah sesi
      var kbSesi = {"inline_keyboard": [
        [{"text": "🔄 Batalkan & Mulai Ulang", "callback_data": "SHORTCUT_BATAL"}],
        [tombolHubungiAdminWA()]
      ]};
      kirimPesanSaaS(chatId,
        "⚠️ *Masih dalam sesi pengisian data.*\n\n" +
        "Ikuti instruksi terakhir bot, atau tekan *Batalkan* untuk mengulang dari awal.",
        kbSesi, token);
    }
    return;
  }
}

// ====================================================================
// MENU & ALUR KERJA
// ====================================================================

function tampilkanMenuRHKKlien(chatId, token) {
  var sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
  var data    = sheet.getDataRange().getValues();
  var klien   = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan  = getSapaan(klien.Nama_Pendaftar);
  var buttons = [];

  var userRhk = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === chatId.toString()) {
      userRhk.push({id: data[i][1], label: data[i][2], emoji: data[i][3], urut: data[i][9]});
    }
  }
  userRhk.sort(function(a, b) { return a.urut - b.urut; });
  userRhk.forEach(function(item) {
    buttons.push([{"text": item.emoji + "  " + item.label, "callback_data": "RUN_RHK_" + item.id}]);
  });

  if (buttons.length === 0) {
    var kbBelumSiap = {"inline_keyboard": [
      [tombolHubungiAdminWA()]
    ]};
    kirimPesanSaaS(chatId,
      "⚙️ *Menu RHK " + sapaan + " sedang disiapkan.*\n\n" +
      "Admin sedang mengonfigurasi template dokumen. " +
      "Notifikasi akan dikirimkan begitu menu siap digunakan. 🙏",
      kbBelumSiap, token);
  } else {
    kirimPesanSaaS(chatId,
      "📋 *Pilih RHK yang ingin dilaporkan hari ini, " + sapaan + ":*",
      {"inline_keyboard": buttons}, token);
  }
}

function tampilkanMenuTanggalSaaS(chatId, token) {
  var rows  = [];
  var hIndo = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  var bIndo = ["Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

  for (var i = 0; i < 6; i++) {
    var d    = new Date(); d.setDate(d.getDate() - i);
    var tglF = d.getDate() + " " + bIndo[d.getMonth()] + " " + d.getFullYear();
    var lbl  = i === 0 ? "📅 Hari Ini (" + hIndo[d.getDay()] + ")"
             : i === 1 ? "🗓️ Kemarin (" + hIndo[d.getDay()] + ")"
             : "📆 " + hIndo[d.getDay()] + ", " + tglF;
    rows.push([{"text": lbl, "callback_data": "SET_TGL_" + tglF + "_" + hIndo[d.getDay()]}]);
  }
  rows.push([{"text": "⌨️ Input Tanggal Manual", "callback_data": "SET_TGL_MANUAL"}]);

  kirimPesanSaaS(chatId,
    "🕒 *Pilih tanggal pelaksanaan kegiatan:*",
    {"inline_keyboard": rows}, token);
}

function analisisDanMulaiPertanyaanDoc(chatId, token) {
  try {
    var klien      = cariAtauDaftarKlienSaaS(chatId, "");
    var sheet      = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var data       = sheet.getDataRange().getValues();
    var templateId = "";

    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === chatId.toString() && data[i][1] === klien.RHK_Terpilih) {
        templateId = data[i][4]; break;
      }
    }

    var docText  = DocumentApp.openById(templateId).getBody().getText();
    var regex    = /\{\{([A-Za-z0-9_]+)\}\}/g;
    var daftarTag = [];
    var match;
    var SKIP_TAGS = ["HARI","TANGGAL","FOTO1","FOTO2","FOTO3","FOTO4"];

    while ((match = regex.exec(docText)) !== null) {
      var tag = match[1];
      if (SKIP_TAGS.indexOf(tag) === -1 && daftarTag.indexOf(tag) === -1) {
        daftarTag.push(tag);
      }
    }

    var props = PropertiesService.getScriptProperties();
    props.setProperty("sess_" + chatId + "_list_tags",        daftarTag.join(","));
    props.setProperty("sess_" + chatId + "_current_tag_idx",  "0");

    pindahKePertanyaanBerikutnya(chatId, token);
  } catch(e) {
    var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
    if (logSheet) logSheet.appendRow([new Date(), "ERROR_BACA_DOC",
      "ChatID: " + chatId + " | " + e.toString()]);

    var kbErrTemplate = {"inline_keyboard": [
      [tombolHubungiAdminWA()]
    ]};
    kirimPesanSaaS(chatId,
      "⚠️ *Gagal membaca template RHK.*\n\n" +
      "Kemungkinan file template masih berformat `.docx` atau ID template tidak valid. " +
      "Admin telah menerima notifikasi error ini.",
      kbErrTemplate, token);
  }
}

// ====================================================================
// BANTUAN PLACEHOLDER OTOMATIS (memudahkan admin)
// ====================================================================
// Ubah "NAMA_KEGIATAN" → "Nama Kegiatan"
function _tagKeLabel(tag) {
  return tag.toLowerCase().replace(/_/g, " ")
            .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

// Pindai semua placeholder {{TAG}} pada sebuah Google Doc template
// (mengabaikan tag sistem HARI/TANGGAL/FOTO1..4). Return: array nama tag.
function pindaiTagTemplate(templateId) {
  var SKIP = ["HARI", "TANGGAL", "FOTO1", "FOTO2", "FOTO3", "FOTO4"];
  var hasil = [];
  try {
    var teks = DocumentApp.openById(templateId).getBody().getText();
    var re = /\{\{([A-Za-z0-9_]+)\}\}/g, m;
    while ((m = re.exec(teks)) !== null) {
      var t = m[1];
      if (SKIP.indexOf(t) === -1 && hasil.indexOf(t) === -1) hasil.push(t);
    }
  } catch (e) { /* templateId tak valid / masih .docx */ }
  return hasil;
}

// Tambahkan tag yang BELUM ada ke Kamus_Placeholder dengan pertanyaan default.
// Idempotent + LockService. Return: array tag yang baru ditambahkan.
function sinkronkanKamusDariTag(tags) {
  var baru = [];
  if (!tags || !tags.length) return baru;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kamus_Placeholder");
  if (!sh) return baru;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (eL) {}
  try {
    var data = sh.getDataRange().getValues();
    var ada  = {};
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) ada[data[i][0].toString().toUpperCase()] = true;
    }
    for (var k = 0; k < tags.length; k++) {
      var tag = tags[k];
      if (ada[tag.toUpperCase()]) continue;
      sh.appendRow([tag, "Silakan isi " + _tagKeLabel(tag) + " untuk laporan ini:"]);
      ada[tag.toUpperCase()] = true;
      baru.push(tag);
    }
  } finally {
    try { lock.releaseLock(); } catch (eR) {}
  }
  return baru;
}

function pindahKePertanyaanBerikutnya(chatId, token) {
  var props       = PropertiesService.getScriptProperties();
  var listTagsStr = props.getProperty("sess_" + chatId + "_list_tags") || "";
  var idx         = parseInt(props.getProperty("sess_" + chatId + "_current_tag_idx") || "0");

  if (listTagsStr === "") { lompatKeFaseFoto(chatId, token); return; }

  var tags = listTagsStr.split(",");
  if (idx < tags.length) {
    var tagSekarang = tags[idx];
    perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_TAG_" + tagSekarang);
    props.setProperty("sess_" + chatId + "_current_tag_idx", (idx + 1).toString());

    // ── ✅ OPTIMIZED: Cari pertanyaan dari Kamus cache (in-memory) ────────────
    var kamus = ambilKamusPlaceholderSAFE();
    var kalimatTanya = kamus[tagSekarang.toUpperCase()];

    // Fallback otomatis jika tag tidak ada di kamus:
    if (!kalimatTanya) {
      kalimatTanya = "Silakan isi *" + _tagKeLabel(tagSekarang) + "* untuk laporan ini:";
      try {
        var ditambah = sinkronkanKamusDariTag([tagSekarang]);
        if (ditambah.length) {
          var cfgNotif = ambilKonfigurasiSaaS();
          kirimPesanSaaS(cfgNotif.ADMIN_CHAT_ID,
            "🧩 *Placeholder Baru Terdeteksi*\n\n" +
            "Tag `{{" + tagSekarang + "}}` belum ada di Kamus_Placeholder — " +
            "sudah *ditambahkan otomatis* dengan pertanyaan default.\n" +
            "Perbaiki kalimatnya di sheet *Kamus_Placeholder* bila perlu.",
            null, cfgNotif.BOT_TOKEN);
        }
      } catch (eSync) { /* abaikan; kuesioner tetap lanjut */ }
    }

    var kbOpsi = {"inline_keyboard": [
      [{"text": "⚠️ Laporkan Kesalahan Template", "callback_data": "KOMPLAIN_TAG_" + tagSekarang}],
      [tombolHubungiAdminWA()]
    ]};

    kirimPesanSaaS(chatId,
      "✏️ *Pertanyaan " + (idx + 1) + "/" + tags.length + ":*\n\n" + kalimatTanya,
      kbOpsi, token);

  } else {
    lompatKeFaseFoto(chatId, token);
  }
}

function lompatKeFaseFoto(chatId, token) {
  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_FOTO");
  kirimPesanSaaS(chatId,
    "✅ *Semua data teks berhasil disimpan!*\n\n" +
    "Sekarang kirimkan *Foto Bukti Kegiatan ke-1* " +
    "(minimal 2 foto, maksimal 4 foto):",
    null, token);
}

function tampilkanMenuPaketKomersial(chatId, token) {
  var kb = {"inline_keyboard": [
    [{"text": "💎 Paket 1 Bulan  — Rp 10.000",  "callback_data": "ORDER_PAKET_1"}],
    [{"text": "💎 Paket 3 Bulan  — Rp 30.000",  "callback_data": "ORDER_PAKET_3"}],
    [{"text": "💎 Paket 6 Bulan  — Rp 50.000",  "callback_data": "ORDER_PAKET_6"}],
    [{"text": "💎 Paket 12 Bulan — Rp 100.000", "callback_data": "ORDER_PAKET_12"}]
  ]};
  kirimPesanSaaS(chatId,
    "🛍️ *PILIHAN PAKET PREMIUM KINERJA RHK*\n\n" +
    "Pilih durasi langganan yang sesuai kebutuhan:",
    kb, token);
}

// ====================================================================
// HUBUNGI ADMIN — tampilkan kontak + notif ke admin
// ====================================================================
function tampilkanKontakAdmin(chatId, token) {
  var config  = ambilKonfigurasiSaaS();
  var klien   = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan  = getSapaan(klien.Nama_Pendaftar);

  // Dua tombol WA dengan konteks berbeda
  var urlWAUmum = "https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
    "?text=" + encodeURIComponent(
      "Halo Admin Kinerja RHK, saya " + (klien.Nama_Pendaftar || "pengguna baru") +
      " membutuhkan bantuan terkait sistem RHK.");
  var urlWATelegram = "https://t.me/" + SAAS_CONFIG.ADMIN_TELEGRAM.replace("@", "");

  var kbKontak = {"inline_keyboard": [
    [{"text": "📲  Chat via WhatsApp",  "url": urlWAUmum}],
    [{"text": "✈️  Chat via Telegram",  "url": urlWATelegram}]
  ]};

  kirimPesanSaaS(chatId,
    "📞 *Hubungi Admin Kinerja RHK*\n\n" +
    "Halo *" + sapaan + "*! Tim Admin siap membantu.\n\n" +
    "Pilih saluran komunikasi yang paling nyaman:\n\n" +
    "🕐 _Jam layanan: Senin–Jumat, 08.00–17.00 WIB_",
    kbKontak, token);

  // Notif ke admin
  kirimPesanSaaS(config.ADMIN_CHAT_ID,
    "🔔 *Klien Meminta Bantuan*\n\n" +
    "👤 *" + (klien.Nama_Pendaftar || "—") + "* (`" + chatId + "`)\n" +
    "📌 Status: `" + klien.Status_Akses + "`\n" +
    "🕐 " + Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm") + " WIB\n\n" +
    "_Klien menekan tombol Hubungi Admin dan sedang menunggu respons._",
    null, token);
}
