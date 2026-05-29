// ====================================================================
// FILE 05: COMMAND CENTER ADMIN SAAS (REVISI V5)
// ====================================================================

function prosesFiturAdminSaaS(update, config) {
  var chatId = update.message.chat.id.toString();
  var text   = update.message.text ? update.message.text.trim() : "";

  // ── /admin broadcast [pesan] ──────────────────────────────────────
  if (text.indexOf("/admin broadcast ") === 0) {
    var isiPesan = text.replace("/admin broadcast ", "");
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var data  = sheet.getDataRange().getValues();
    var sukses = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === "AKTIF") {
        kirimPesanSaaS(data[i][0].toString(),
          "📢 *PENGUMUMAN PLATFORM KINERJA RHK*\n\n" + isiPesan, null, config.BOT_TOKEN);
        sukses++;
        Utilities.sleep(100);
      }
    }
    kirimPesanSaaS(chatId,
      "✅ Broadcast terkirim ke *" + sukses + "* klien aktif.", null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin blokir [ID] [alasan] ───────────────────────────────────
  if (text.indexOf("/admin blokir ") === 0) {
    var params = text.split(" ");
    if (params.length >= 3) {
      var targetId = params[2];
      var alasan   = params.slice(3).join(" ") || "Tidak ada alasan tercatat.";
      perbaruiKolomKlien(targetId, "Status_Akses",  "NONAKTIF");
      perbaruiKolomKlien(targetId, "Catatan_Admin", "Blokir: " + alasan);
      kirimPesanSaaS(chatId,
        "🔒 Akun `" + targetId + "` dinonaktifkan.\n📝 Alasan: _" + alasan + "_",
        null, config.BOT_TOKEN);
      var kbBlokir = {"inline_keyboard": [
        [{"text": "💎 Perpanjang Langganan", "callback_data": "SHORTCUT_BAYAR"}],
        [tombolHubungiAdminWA()]
      ]};
      kirimPesanSaaS(targetId,
        "🔔 *Akses akun Anda telah ditangguhkan.*\n\nAlasan: *" + alasan + "*\n\n" +
        "Hubungi Admin untuk informasi lebih lanjut.",
        kbBlokir, config.BOT_TOKEN);
    } else {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin blokir [Chat_ID] [Alasan]`", null, config.BOT_TOKEN);
    }
    return true;
  }


  // ── /admin aktifkan [ID] [bulan] ──────────────────────────────────
  if (text.indexOf("/admin aktifkan ") === 0) {
    var parts         = text.split(" ");
    var targetAktifId = parts[2] ? parts[2].trim() : "";
    var jmlBulan      = parts[3] ? parseInt(parts[3]) : 1;
    if (!targetAktifId) {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin aktifkan [Chat_ID] [durasi_bulan]`\n" +
        "Contoh: `/admin aktifkan 927597163 3`", null, config.BOT_TOKEN);
      return true;
    }
    var klienAktif = cariAtauDaftarKlienSaaS(targetAktifId, "");
    var tglExp = new Date();
    if (klienAktif.Status_Akses === "AKTIF" && new Date(klienAktif.Masa_Aktif) > new Date()) {
      tglExp = new Date(klienAktif.Masa_Aktif);
    }
    tglExp.setMonth(tglExp.getMonth() + jmlBulan);
    perbaruiKolomKlien(targetAktifId, "Status_Akses",  "AKTIF");
    perbaruiKolomKlien(targetAktifId, "Masa_Aktif",    tglExp);
    perbaruiKolomKlien(targetAktifId, "Warning_Sent",  "");
    var sapAktif = getSapaan(klienAktif.Nama_Pendaftar);
    kirimPesanSaaS(chatId,
      "✅ Akun *" + (klienAktif.Nama_Pendaftar || targetAktifId) + "* aktif *" +
      jmlBulan + " bulan* hingga *" +
      Utilities.formatDate(tglExp, "GMT+7", "dd/MM/yyyy") + "*.",
      null, config.BOT_TOKEN);
    kirimPesanSaaS(targetAktifId,
      "🎉 *Akun berhasil diaktifkan!*\n\n" +
      "Halo *" + sapAktif + "*, akun premium aktif hingga *" +
      Utilities.formatDate(tglExp, "GMT+7", "dd/MM/yyyy") + "*.\n\n" +
      "Ketik /lapor untuk mulai membuat laporan RHK. 🚀",
      null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin kirim_template [ID] ────────────────────────────────────
  if (text.indexOf("/admin kirim_template ") === 0) {
    var tgtId = text.replace("/admin kirim_template ", "").trim();
    if (!tgtId) {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin kirim_template [Chat_ID]`", null, config.BOT_TOKEN);
      return true;
    }
    kirimTemplateKeKlien(tgtId, chatId, config);
    return true;
  }

  // ── /admin kirim [ID] [pesan bebas] ───────────────────────────────
  // Kirim pesan TEKS BEBAS dari admin ke seorang klien hanya dengan Chat_ID.
  // Syarat: klien harus pernah menekan /start pada bot (semua klien terdaftar sudah).
  if (text.indexOf("/admin kirim ") === 0) {
    var sisaKirim = text.substring("/admin kirim ".length).trim();
    var posSpasi  = sisaKirim.indexOf(" ");
    if (posSpasi === -1) {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin kirim [Chat_ID] [pesan]`\n" +
        "Contoh: `/admin kirim 927597163 Halo, mohon lengkapi datanya ya 🙏`",
        null, config.BOT_TOKEN);
      return true;
    }
    var tujuanId   = sisaKirim.substring(0, posSpasi).trim();
    var pesanBebas = sisaKirim.substring(posSpasi + 1).trim();
    if (!pesanBebas) {
      kirimPesanSaaS(chatId,
        "⚠️ Pesan kosong. Format: `/admin kirim [Chat_ID] [pesan]`", null, config.BOT_TOKEN);
      return true;
    }
    var klienTujuan = cariAtauDaftarKlienSaaS(tujuanId, "");
    var resKirim = kirimPesanSaaS(tujuanId,
      "💬 *Pesan dari Admin Kinerja RHK*\n\n" + pesanBebas,
      {"inline_keyboard": [[tombolHubungiAdminWA()]]}, config.BOT_TOKEN);

    var berhasilKirim = false, errDesc = "";
    try {
      var bodyKirim = JSON.parse(resKirim.getContentText());
      berhasilKirim = (bodyKirim.ok === true);
      if (!berhasilKirim) errDesc = bodyKirim.description || "";
    } catch (eKirim) { berhasilKirim = (resKirim.getResponseCode() === 200); }

    if (berhasilKirim) {
      kirimPesanSaaS(chatId,
        "✅ Pesan terkirim ke *" + (klienTujuan.Nama_Pendaftar || "klien") +
        "* (`" + tujuanId + "`).", null, config.BOT_TOKEN);
    } else {
      kirimPesanSaaS(chatId,
        "❌ Gagal mengirim ke `" + tujuanId + "`.\n_" +
        (errDesc || "Pastikan Chat_ID benar & klien pernah menekan /start pada bot.") + "_",
        null, config.BOT_TOKEN);
    }
    return true;
  }

  // ── /admin follow_up [ID] ─────────────────────────────────────────
  if (text.indexOf("/admin follow_up ") === 0) {
    tampilkanInfoFollowUp(text.replace("/admin follow_up ", "").trim(), chatId, config);
    return true;
  }

  // ── /admin follow_up_semua ────────────────────────────────────────
  if (text === "/admin follow_up_semua") {
    tampilkanDaftarFollowUpSemua(chatId, config);
    return true;
  }

  // ── /admin daftar_chatid ──────────────────────────────────────────
  if (text === "/admin daftar_chatid") {
    var dSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var dData  = dSheet.getDataRange().getValues();
    if (dData.length <= 1) {
      kirimPesanSaaS(chatId, "📭 Belum ada klien terdaftar.", null, config.BOT_TOKEN);
      return true;
    }
    var emojiSt = {
      "AKTIF":"🟢","NONAKTIF":"🔴","BELUM_DAFTAR":"⚪",
      "REG_WIZARD":"🟡","PENDING_RHK":"🟠"
    };
    var BATCH = 25;
    var baris = "📋 *DAFTAR KLIEN* _(Total: " + (dData.length-1) + ")_\n\n";
    var batch = [];
    for (var d = 1; d < dData.length; d++) {
      var stD   = dData[d][3] || "BELUM_DAFTAR";
      var expD  = dData[d][4]
        ? Utilities.formatDate(new Date(dData[d][4]), "GMT+7", "dd/MM/yy") : "—";
      baris += d + ". " + (emojiSt[stD]||"⚫") + " *" + (dData[d][1]||"—") + "*\n" +
               "   🆔 `" + dData[d][0] + "` | `" + stD + "`" +
               (stD==="AKTIF" ? " | exp `"+expD+"`" : "") + "\n\n";
      if (d % BATCH === 0 || d === dData.length-1) {
        batch.push(baris);
        baris = "📋 _(Lanjutan " + (batch.length+1) + ")_\n\n";
      }
    }
    for (var b = 0; b < batch.length; b++) {
      kirimPesanSaaS(chatId, batch[b], null, config.BOT_TOKEN);
    }
    var kbCepat = {"inline_keyboard": [
      [{"text":"📊 Cek Sistem","callback_data":"ADM_CEK_SISTEM"},
       {"text":"📋 Cek Pendaftaran Macet","callback_data":"ADM_CEK_DAFTAR"}]
    ]};
    kirimPesanSaaS(chatId, "⚡ *Aksi cepat:*", kbCepat, config.BOT_TOKEN);
    return true;
  }


  // ── /admin cek_antrian ────────────────────────────────────────────
  if (text === "/admin cek_antrian") {
    tampilkanStatusAntrianKeAdmin(chatId, config.BOT_TOKEN);
    return true;
  }

  // ── /admin bersihkan_antrian ──────────────────────────────────────
  if (text === "/admin bersihkan_antrian") {
    bersihkanAntrianFailed(chatId, config.BOT_TOKEN);
    return true;
  }

  // ── /admin reset_antrian ──────────────────────────────────────────
  // Gunakan jika ada item stuck di PROCESSING > 5 menit
  if (text === "/admin reset_antrian") {
    var nReset = resetStuckProcessing();
    kirimPesanSaaS(chatId,
      "🔄 Reset selesai. *" + nReset + "* item stuck dikembalikan ke PENDING.",
      null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin cek_pendaftaran ────────────────────────────────────────
  if (text === "/admin cek_pendaftaran") {
    var shC  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var cD   = shC.getDataRange().getValues();
    var lap  = "📋 *KLIEN PENDAFTARAN BELUM SELESAI*\n\n";
    var ada  = false; var no = 1;
    for (var j = 1; j < cD.length; j++) {
      var st = cD[j][3];
      if (st !== "AKTIF" && st !== "NONAKTIF") {
        var sesiMacet = cD[j][8] || "BELUM MULAI";
        var linkDrive = cD[j][2]
          ? "[Buka Drive](" + cD[j][2] + ")" : "`Belum dikirim`";
        lap += no++ + ". *" + (cD[j][1]||"—") + "* (`" + cD[j][0] + "`)\n" +
               "   📍 Tahap: `" + sesiMacet + "`\n" +
               "   📁 Drive: " + linkDrive + "\n\n";
        ada = true;
      }
    }
    if (!ada) lap += "🎉 Semua pendaftar sudah menyelesaikan administrasi!";
    var kbMacet = {"inline_keyboard": [
      [{"text":"📣 Kirim Reminder ke Semua Macet","callback_data":"ADM_REMINDER_MACET"}]
    ]};
    kirimPesanSaaS(chatId, lap, ada ? kbMacet : null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin cek_template [ID] ──────────────────────────────────────
  // Pindai semua template RHK milik klien, deteksi placeholder, dan
  // otomatis tambahkan yang belum ada ke Kamus_Placeholder.
  if (text.indexOf("/admin cek_template ") === 0) {
    var idCek = text.replace("/admin cek_template ", "").trim();
    if (!idCek) {
      kirimPesanSaaS(chatId,
        "💡 Format: `/admin cek_template [Chat_ID]`", null, config.BOT_TOKEN);
      return true;
    }
    var rcSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RHK_Config");
    var rcD  = rcSh.getDataRange().getValues();
    var semuaTag = [], jmlTpl = 0, tplKosong = 0;
    for (var r = 1; r < rcD.length; r++) {
      if (rcD[r][0].toString() !== idCek) continue;
      var tplId = (rcD[r][4] || "").toString().trim();
      if (!tplId) { tplKosong++; continue; }
      jmlTpl++;
      pindaiTagTemplate(tplId).forEach(function(t) {
        if (semuaTag.indexOf(t) === -1) semuaTag.push(t);
      });
    }
    if (jmlTpl === 0) {
      kirimPesanSaaS(chatId,
        "⚠️ Tidak ada `Template_ID` terisi untuk `" + idCek + "` di sheet RHK_Config" +
        (tplKosong ? " (" + tplKosong + " baris Template_ID kosong)" : "") + ".",
        null, config.BOT_TOKEN);
      return true;
    }
    var tagBaruCek = sinkronkanKamusDariTag(semuaTag);
    kirimPesanSaaS(chatId,
      "🧩 *CEK TEMPLATE — `" + idCek + "`*\n\n" +
      "📄 Template terbaca : *" + jmlTpl + "*\n" +
      "🏷️ Total placeholder: *" + semuaTag.length + "*\n" +
      (semuaTag.length ? "`" + semuaTag.join("`, `") + "`\n\n" : "\n") +
      (tagBaruCek.length
        ? "✅ *" + tagBaruCek.length + "* tag baru ditambahkan ke Kamus_Placeholder:\n`" +
          tagBaruCek.join("`, `") + "`\n\n_Perbaiki kalimat pertanyaannya di sheet bila perlu._"
        : "✅ Semua placeholder sudah ada di Kamus_Placeholder."),
      null, config.BOT_TOKEN);
    return true;
  }

  // ── /admin ringkasan ──────────────────────────────────────────────
  // Dashboard operasional cepat: perlu approve, aktif, akan expired, antrian.
  if (text === "/admin ringkasan") {
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var cShR   = ss.getSheetByName("Client_SaaS");
    var vR     = cShR.getDataRange().getValues();
    var aktif = 0, pending = 0, tungguBukti = 0, akanExp = 0;
    var now    = new Date();
    for (var k = 1; k < vR.length; k++) {
      var st   = vR[k][3];
      var sesi = (vR[k][8] || "").toString();
      if (st === "AKTIF") {
        aktif++;
        if (vR[k][4]) {
          var sisaH = Math.ceil((new Date(vR[k][4]) - now) / 86400000);
          if (sisaH >= 0 && sisaH <= 7) akanExp++;
        }
      } else if (st !== "NONAKTIF") {
        pending++;
      }
      if (sesi === "TUNGGU_BUKTI_BAYAR") tungguBukti++;
    }
    // Hitung transaksi hari ini (LUNAS) + omzet
    var trxSh = ss.getSheetByName("Transaksi");
    var lunasHariIni = 0, omzetHariIni = 0;
    if (trxSh) {
      var tD = trxSh.getDataRange().getValues();
      var hariIni = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
      for (var t = 1; t < tD.length; t++) {
        if ((tD[t][7] || "").toString().toUpperCase() !== "LUNAS") continue;
        if (Utilities.formatDate(new Date(tD[t][0]), "GMT+7", "yyyy-MM-dd") !== hariIni) continue;
        lunasHariIni++;
        omzetHariIni += parseInt(tD[t][4] || 0) || 0;
      }
    }
    // Antrian pending
    var aqSh = ss.getSheetByName("Antrian_Request");
    var qPending = 0, qFailed = 0;
    if (aqSh) {
      var qD = aqSh.getDataRange().getValues();
      for (var q = 1; q < qD.length; q++) {
        if (qD[q][5] === "PENDING")     qPending++;
        else if (qD[q][5] === "FAILED") qFailed++;
      }
    }
    kirimPesanSaaS(chatId,
      "📊 *RINGKASAN OPERASIONAL*\n" +
      "_" + Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm") + " WIB_\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "⏳ *PERLU TINDAKAN:*\n" +
      "   🧾 Tunggu bukti bayar : *" + tungguBukti + "*\n" +
      "   🟠 Pendaftaran proses : *" + pending + "*\n\n" +
      "👥 *KLIEN:*\n" +
      "   🟢 Aktif      : *" + aktif + "*\n" +
      "   ⏰ Akan expired (≤7 hari): *" + akanExp + "*\n\n" +
      "💰 *HARI INI:*\n" +
      "   ✅ Lunas : *" + lunasHariIni + "* transaksi\n" +
      "   💵 Omzet : *Rp " + omzetHariIni.toLocaleString("id-ID") + "*\n\n" +
      "⚙️ *ANTRIAN:* PENDING *" + qPending + "* | FAILED *" + qFailed + "*",
      {"inline_keyboard": [
        [{"text":"📋 Pendaftaran Macet","callback_data":"ADM_CEK_DAFTAR"},
         {"text":"🔄 Cek Antrian","callback_data":"ADM_CEK_ANTRIAN"}]
      ]}, config.BOT_TOKEN);
    return true;
  }

  // ── /admin cek_sistem | /admin ────────────────────────────────────
  if (text === "/admin cek_sistem" || text === "/admin") {
    var cSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
    var tot = cSh.getLastRow() - 1;
    var vD  = cSh.getDataRange().getValues();
    var aktC = 0, pendC = 0, nonC = 0;
    for (var k = 1; k < vD.length; k++) {
      var s = vD[k][3];
      if (s==="AKTIF") aktC++;
      else if (s==="NONAKTIF") nonC++;
      else pendC++;
    }
    var acSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
    var jCmd = 0;
    if (acSh) {
      var acD = acSh.getDataRange().getValues();
      for (var ac = 1; ac < acD.length; ac++) {
        if ((acD[ac][4]||"").toString().toUpperCase() === "TRUE") jCmd++;
      }
    }
    var dashboard =
      "📊 *DASHBOARD KINERJA RHK*\n\n" +
      "👥 *Klien:*\n" +
      "   🟢 Aktif: *" + aktC + "*\n" +
      "   🟡 Pending/Proses: *" + pendC + "*\n" +
      "   🔴 Nonaktif: *" + nonC + "*\n" +
      "   📦 Total: *" + tot + "*\n\n" +
      "⚙️ *Sistem:*\n" +
      "   ▪️ Perintah Sheet Aktif: *" + jCmd + "*\n" +
      "   ▪️ Status Server: *ONLINE* ✅\n\n" +
      "📌 *Pintasan:*\n" +
      "   `/admin bantuan` — Daftar semua perintah\n" +
      "   `/admin daftar_chatid` — Semua Chat ID\n" +
      "   `/admin follow_up_semua` — Klien perlu follow-up\n" +
      "   `/admin cek_antrian` — Status antrian queue";
    var kbDashboard = {"inline_keyboard": [
      [{"text":"🔄 Cek Antrian Queue", "callback_data":"ADM_CEK_ANTRIAN"},
       {"text":"📋 Cek Pendaftaran",   "callback_data":"ADM_CEK_DAFTAR"}]
    ]};
    kirimPesanSaaS(chatId, dashboard, kbDashboard, config.BOT_TOKEN);
    return true;
  }

  // ── /admin bantuan ────────────────────────────────────────────────
  if (text === "/admin bantuan") {
    var bTeks =
      "📖 *PANDUAN PERINTAH ADMIN*\n\n" +
      "━━━ *PERINTAH INTI* ━━━\n" +
      "▪️ `/admin` — Dashboard statistik\n" +
      "▪️ `/admin bantuan` — Panduan ini\n" +
      "▪️ `/admin daftar_chatid` — Semua Chat ID klien\n" +
      "▪️ `/admin cek_pendaftaran` — Pendaftaran macet\n" +
      "▪️ `/admin broadcast [pesan]` — Kirim ke semua aktif\n" +
      "▪️ `/admin blokir [ID] [alasan]` — Blokir akun\n" +
      "▪️ `/admin aktifkan [ID] [bulan]` — Aktifkan akun\n" +
      "▪️ `/admin kirim_template [ID]` — Kirim template ke klien\n" +
      "▪️ `/admin follow_up [ID]` — Info detail + aksi klien\n" +
      "▪️ `/admin follow_up_semua` — Daftar klien expired/hampir\n" +
      "▪️ `/admin ringkasan` — Ringkasan operasional harian\n" +
      "▪️ `/admin kirim [ID] [pesan]` — Kirim pesan bebas ke klien\n" +
      "▪️ `/admin cek_template [ID]` — Pindai placeholder template klien\n\n" +
      "━━━ *PERINTAH ANTRIAN (QUEUE)* ━━━\n" +
      "▪️ `/admin cek_antrian` — Status antrian saat ini\n" +
      "▪️ `/admin bersihkan_antrian` — Hapus item FAILED\n" +
      "▪️ `/admin reset_antrian` — Reset item stuck PROCESSING\n\n" +
      "━━━ *PERINTAH DARI SHEET* ━━━\n";
    var acSh2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
    if (acSh2) {
      var acD2 = acSh2.getDataRange().getValues();
      var adaPC = false;
      for (var ac2 = 1; ac2 < acD2.length; ac2++) {
        var fl = (acD2[ac2][4]||"").toString().toUpperCase() === "TRUE" ? "✅" : "❌";
        bTeks += fl + " `" + acD2[ac2][0] + "` — _" + (acD2[ac2][5]||"—") + "_\n";
        adaPC = true;
      }
      if (!adaPC) bTeks += "_Belum ada perintah di sheet Admin_Commands._\n";
    }
    bTeks += "\n💡 Tambah perintah baru di sheet *Admin_Commands* tanpa ubah kode!";
    kirimPesanSaaS(chatId, bTeks, null, config.BOT_TOKEN);
    return true;
  }

  // ── Engine perintah dinamis dari sheet ────────────────────────────
  var hasilSheet = eksekusiPerintahDariSheet(chatId, text, config);
  if (hasilSheet) return true;

  kirimPesanSaaS(chatId,
    "❓ Perintah tidak dikenali.\n\nKetik `/admin bantuan` untuk panduan lengkap.",
    null, config.BOT_TOKEN);
  return true;
}


// ====================================================================
// ENGINE PERINTAH DINAMIS DARI SHEET Admin_Commands
// Tipe: BALAS_TEKS | BROADCAST | KIRIM_KE_USER
// ====================================================================
function eksekusiPerintahDariSheet(chatId, text, config) {
  var acSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
  if (!acSheet) return false;
  var acData = acSheet.getDataRange().getValues();

  for (var i = 1; i < acData.length; i++) {
    var pSheet = acData[i][0] ? acData[i][0].toString().trim() : "";
    if (!pSheet) continue;
    var cocok = (text === pSheet) || (text.indexOf(pSheet + " ") === 0);
    if (!cocok) continue;

    var tipe      = (acData[i][1]||"").toString().trim().toUpperCase();
    var isiPesan  = (acData[i][3]||"").toString();
    var aktifFlag = (acData[i][4]||"").toString().toUpperCase();

    if (aktifFlag !== "TRUE") {
      kirimPesanSaaS(chatId,
        "⚠️ Perintah `" + pSheet + "` sedang *dinonaktifkan*.", null, config.BOT_TOKEN);
      return true;
    }

    if (tipe === "BALAS_TEKS") {
      kirimPesanSaaS(chatId, isiPesan, null, config.BOT_TOKEN);
      return true;
    }
    if (tipe === "BROADCAST") {
      var cSht = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
      var cDat = cSht.getDataRange().getValues();
      var hit  = 0;
      for (var bc = 1; bc < cDat.length; bc++) {
        if (cDat[bc][3] === "AKTIF") {
          kirimPesanSaaS(cDat[bc][0].toString(),
            "📢 *PENGUMUMAN PLATFORM KINERJA RHK*\n\n" + isiPesan, null, config.BOT_TOKEN);
          hit++; Utilities.sleep(100);
        }
      }
      kirimPesanSaaS(chatId,
        "🚀 Broadcast `" + pSheet + "` terkirim ke *" + hit + "* klien aktif.",
        null, config.BOT_TOKEN);
      return true;
    }
    if (tipe === "KIRIM_KE_USER") {
      var bagian    = text.replace(pSheet, "").trim();
      var targetUID = bagian !== "" ? bagian.split(" ")[0] : "";
      if (!targetUID) {
        kirimPesanSaaS(chatId,
          "💡 Sertakan Chat ID setelah perintah.\nContoh: `" + pSheet + " 927597163`",
          null, config.BOT_TOKEN);
        return true;
      }
      var pFinal = isiPesan.replace(/\{chatId\}/g, targetUID);
      kirimPesanSaaS(targetUID, pFinal, null, config.BOT_TOKEN);
      kirimPesanSaaS(chatId,
        "✅ Pesan `" + pSheet + "` terkirim ke `" + targetUID + "`.",
        null, config.BOT_TOKEN);
      return true;
    }
    kirimPesanSaaS(chatId,
      "⚠️ Tipe `" + tipe + "` tidak dikenal. Gunakan: BALAS_TEKS | BROADCAST | KIRIM_KE_USER",
      null, config.BOT_TOKEN);
    return true;
  }

  // ── FITUR BARU: /admin bantuan ───────────────────────────────────
  // Menampilkan semua perintah: hardcoded + perintah dari sheet Admin_Commands
  if (text === "/admin bantuan") {
    var bantuanTeks = "📖 *PANDUAN LENGKAP PERINTAH ADMIN* 📖\n\n" +
      "━━━ *PERINTAH INTI (BAWAAN SISTEM)* ━━━\n" +
      "▪️ `/admin` atau `/admin cek_sistem` — Dashboard statistik\n" +
      "▪️ `/admin daftar_chatid` — Daftar semua Chat ID klien\n" +
      "▪️ `/admin cek_pendaftaran` — Klien dengan registrasi macet\n" +
      "▪️ `/admin bantuan` — Tampilkan panduan ini\n" +
      "▪️ `/admin broadcast [pesan]` — Kirim pesan ke semua klien aktif\n" +
      "▪️ `/admin blokir [ID] [alasan]` — Blokir akun klien\n" +
      "▪️ `/admin aktifkan [ID]` — Aktifkan akun klien\n\n" +
      "▪️ `/admin aktifkan [ID] [bulan]` — Aktifkan akun klien\n" +
      "▪️ `/admin kirim_template [ID]` — Kirim ulang file template ke klien\n" +
      "▪️ `/admin follow_up [ID]` — Info lengkap + deeplink WA klien\n" +
      "▪️ `/admin follow_up_semua` — Daftar klien expired/hampir expired\n\n" +
      "━━━ *PERINTAH DARI SHEET Admin_Commands* ━━━\n";

    var acSheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
    if (acSheet2) {
      var acData2 = acSheet2.getDataRange().getValues();
      var adaPerintahSheet = false;
      for (var ac2 = 1; ac2 < acData2.length; ac2++) {
        var aktifFlag = acData2[ac2][4] ? acData2[ac2][4].toString().toUpperCase() : "FALSE";
        var labelAktif = (aktifFlag === "TRUE") ? "✅" : "❌";
        bantuanTeks += labelAktif + " `" + acData2[ac2][0] + "`\n   _" + (acData2[ac2][5] || "Tanpa deskripsi") + "_\n";
        adaPerintahSheet = true;
      }
      if (!adaPerintahSheet) bantuanTeks += "_Belum ada perintah di sheet Admin_Commands._\n";
    } else {
      bantuanTeks += "_Sheet Admin_Commands belum dibuat. Jalankan `setupStrukturDatabaseSaaS()` terlebih dahulu._\n";
    }

    bantuanTeks += "\n💡 *Tip:* Tambah perintah baru kapan saja langsung di sheet *Admin_Commands* tanpa mengubah kode!";
    kirimPesanSaaS(chatId, bantuanTeks, null, config.BOT_TOKEN);
    return true;
  }

  // ----------------------------------------------------------------
  // ENGINE PERINTAH DINAMIS — Baca dari sheet Admin_Commands
  // Eksekusi otomatis tanpa ubah kode, cukup tambah baris di sheet
  // ----------------------------------------------------------------
  var hasilSheet = eksekusiPerintahDariSheet(chatId, text, config);
  if (hasilSheet) return true;

  // Tidak ada perintah yang cocok → tampilkan petunjuk
  kirimPesanSaaS(chatId, "❓ Perintah tidak dikenali.\n\nKetik `/admin bantuan` untuk melihat daftar lengkap perintah yang tersedia.", null, config.BOT_TOKEN);
  return true;
}

// ====================================================================
// ENGINE PERINTAH DINAMIS DARI SHEET Admin_Commands
// ====================================================================
// Cara kerja:
//   1. Baca semua baris sheet Admin_Commands
//   2. Cocokkan kolom Perintah dengan teks yang dikirim admin
//   3. Jika cocok & Aktif = TRUE, jalankan sesuai Tipe:
//      - BALAS_TEKS   : kirim Isi_Pesan ke admin
//      - BROADCAST    : kirim Isi_Pesan ke semua klien AKTIF
//      - KIRIM_KE_USER: kirim Isi_Pesan ke Chat ID yang disebut setelah perintah
// ====================================================================
function eksekusiPerintahDariSheet(chatId, text, config) {
  var acSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admin_Commands");
  if (!acSheet) return false;

  var acData = acSheet.getDataRange().getValues();

  for (var i = 1; i < acData.length; i++) {
    var perintahSheet = acData[i][0] ? acData[i][0].toString().trim() : "";
    var tipe          = acData[i][1] ? acData[i][1].toString().trim().toUpperCase() : "";
    var parameter     = acData[i][2] ? acData[i][2].toString().trim() : "";
    var isiPesan      = acData[i][3] ? acData[i][3].toString() : "";
    var aktifFlag     = acData[i][4] ? acData[i][4].toString().toUpperCase() : "FALSE";
    
    if (perintahSheet === "") continue;

    // Cocokkan: perintah sheet harus merupakan awalan dari teks yang dikirim
    var cocok = (text === perintahSheet) || (text.indexOf(perintahSheet + " ") === 0);
    if (!cocok) continue;

    // Lewati perintah yang dinonaktifkan (Aktif = FALSE)
    if (aktifFlag !== "TRUE") {
      kirimPesanSaaS(chatId, "⚠️ Perintah `" + perintahSheet + "` saat ini sedang *dinonaktifkan* oleh pengaturan sheet.", null, config.BOT_TOKEN);
      return true;
    }

    // ── Tipe: BALAS_TEKS ──────────────────────────────────────────
    if (tipe === "BALAS_TEKS") {
      kirimPesanSaaS(chatId, isiPesan, null, config.BOT_TOKEN);
      return true;
    }

    // ── Tipe: BROADCAST ───────────────────────────────────────────
    if (tipe === "BROADCAST") {
      var clientSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Client_SaaS");
      var clientData  = clientSheet.getDataRange().getValues();
      var hitBroadcast = 0;
      for (var bc = 1; bc < clientData.length; bc++) {
        if (clientData[bc][3] === "AKTIF") {
          kirimPesanSaaS(clientData[bc][0].toString(), "📢 *PENGUMUMAN RESMI PLATFORM RHK:*\n\n" + isiPesan, null, config.BOT_TOKEN);
          hitBroadcast++;
        }
      }
      kirimPesanSaaS(chatId, "🚀 Perintah sheet `" + perintahSheet + "` berhasil broadcast ke *" + hitBroadcast + "* klien aktif!", null, config.BOT_TOKEN);
      return true;
    }

    // ── Tipe: KIRIM_KE_USER ───────────────────────────────────────
    // Penggunaan: /admin teguran [CHAT_ID_TARGET]
    if (tipe === "KIRIM_KE_USER") {
      var bagianTeks = text.replace(perintahSheet, "").trim();
      var targetUserId = bagianTeks !== "" ? bagianTeks.split(" ")[0] : "";

      if (!targetUserId) {
        kirimPesanSaaS(chatId, "💡 Sertakan Chat ID target setelah perintah.\nContoh: `" + perintahSheet + " 927597163`", null, config.BOT_TOKEN);
        return true;
      }

      // Ganti placeholder {chatId} jika ada di isi pesan
      var pesanFinal = isiPesan.replace(/\{chatId\}/g, targetUserId);
      kirimPesanSaaS(targetUserId, pesanFinal, null, config.BOT_TOKEN);
      kirimPesanSaaS(chatId, "✅ Pesan dari perintah sheet `" + perintahSheet + "` berhasil dikirim ke `" + targetUserId + "`.", null, config.BOT_TOKEN);
      return true;
    }

    // Tipe tidak dikenal
    kirimPesanSaaS(chatId, "⚠️ Tipe perintah `" + tipe + "` pada baris sheet tidak dikenali. Gunakan: BALAS_TEKS | BROADCAST | KIRIM_KE_USER", null, config.BOT_TOKEN);
    return true;
  }

  return false; // Tidak ada perintah yang cocok di sheet
}


// ====================================================================
// TERIMA TEMPLATE .docx DARI KLIEN
// ====================================================================
// Alur kerja yang benar:
//   1. Klien kirim file .docx setelah akun AKTIF atau saat PENDING_RHK
//   2. Sistem simpan ke Drive Admin (sub-folder nama klien)
//   3. Konversi otomatis ke Google Docs
//   4. Notif admin: nama klien, ID template, tombol aksi langsung
//   5. Admin tambahkan placeholder {{TAG}} di Google Doc
//   6. Admin isi RHK_Config dengan Template_ID
//   7. Admin jalankan /admin aktifkan atau ubah status ke AKTIF
// ====================================================================
function prosesUnduhTemplateWordKlien(chatId, documentObj, config) {
  var klien    = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan   = getSapaan(klien.Nama_Pendaftar);
  var namaFile = documentObj.file_name || "template.docx";

  // ── Validasi format ──────────────────────────────────────────────
  if (namaFile.toLowerCase().indexOf(".docx") === -1) {
    kirimPesanSaaS(chatId,
      "❌ *Format file salah.*\n\n" +
      "Sistem hanya menerima file *Microsoft Word (.docx)*.\n\n" +
      "Pastikan template laporan RHK berformat .docx (bukan .doc/.pdf).",
      {"inline_keyboard": [[tombolHubungiAdminWA()]]}, config.BOT_TOKEN);
    return;
  }

  // ── Best-effort: arsip .docx ke Drive + konversi ke Google Doc ────
  // Tidak menggagalkan alur — file tetap diteruskan ke admin walau ini gagal.
  var templateId = null, linkFolder = null, linkDocx = null;
  try {
    var filePath = JSON.parse(UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getFile?file_id=" + documentObj.file_id,
      {"muteHttpExceptions": true}).getContentText()).result.file_path;
    var blobWord = UrlFetchApp.fetch(
      "https://api.telegram.org/file/bot" + config.BOT_TOKEN + "/" + filePath,
      {"muteHttpExceptions": true}).getBlob().setName(namaFile);

    var adminRoot   = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    var folderNama  = klien.Nama_Pendaftar || ("Klien_" + chatId);
    var iterFolder  = adminRoot.getFoldersByName(folderNama);
    var folderKlien = iterFolder.hasNext() ? iterFolder.next() : adminRoot.createFolder(folderNama);
    linkFolder      = folderKlien.getUrl();
    linkDocx        = folderKlien.createFile(blobWord).getUrl();   // arsip .docx asli (DriveApp)

    // Konversi ke Google Doc lewat Drive REST API (independen advanced service)
    try {
      templateId = _konversiDocxKeGdoc(blobWord, namaFile.replace(/\.docx$/i, ""), folderKlien.getId());
    } catch (eConv) {
      _logSistem("WARN_KONVERSI_DOCX", "ChatID: " + chatId + " | " + eConv.toString());
    }
  } catch (eArsip) {
    _logSistem("WARN_ARSIP_DOCX", "ChatID: " + chatId + " | " + eArsip.toString());
  }

  // ── Update status klien ──────────────────────────────────────────
  if (klien.Status_Akses === "REG_WIZARD" || klien.Status_Akses === "BELUM_DAFTAR") {
    perbaruiKolomKlien(chatId, "Status_Akses", "PENDING_RHK");
  }
  perbaruiKolomKlien(chatId, "State_Sesi", "");

  // ── Teruskan file .docx LANGSUNG ke admin + caption + tombol aksi ─
  var baris = [];
  if (templateId) baris.push([{"text":"📝  Buka & Edit Google Doc",
                               "url":"https://docs.google.com/document/d/" + templateId + "/edit"}]);
  if (linkFolder) baris.push([{"text":"📂  Buka Folder Drive Klien", "url": linkFolder}]);
  baris.push([{"text":"✅  Aktifkan Akun Klien", "callback_data":"ADM_AKTIFKAN_" + chatId}]);

  var caption =
    "📄 *TEMPLATE BARU MASUK*\n\n" +
    "👤 Klien : *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "📁 File  : `" + namaFile + "`\n" +
    (templateId
      ? "🆔 Doc ID: `" + templateId + "`\n"
      : "⚠️ Konversi Google Doc gagal — gunakan file .docx terlampir di atas.\n") +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "📌 *Langkah Admin:*\n" +
    (templateId
      ? "1. Buka Google Doc, tambahkan placeholder `{{TAG}}`\n"
      : "1. Buka file .docx, jadikan Google Doc, tambahkan placeholder `{{TAG}}`\n") +
    "2. Salin *Doc ID* ke kolom `Template_ID` di sheet *RHK_Config*\n" +
    "3. Tekan *Aktifkan Akun* setelah konfigurasi selesai";

  var adminOK = _kirimDokumenKeAdmin(documentObj.file_id, caption,
                                     {"inline_keyboard": baris}, config);
  if (!adminOK) {
    // Fallback: bila forward file gagal, kirim teks + link arsip
    kirimPesanSaaS(config.ADMIN_CHAT_ID,
      caption + (linkDocx ? "\n\n📎 File arsip: " + linkDocx : ""),
      {"inline_keyboard": baris}, config.BOT_TOKEN);
  }

  // ── Bantu admin: pindai placeholder template & sinkronkan Kamus ──
  if (templateId) {
    try {
      var tagTpl  = pindaiTagTemplate(templateId);
      var tagBaru = sinkronkanKamusDariTag(tagTpl);
      kirimPesanSaaS(config.ADMIN_CHAT_ID,
        "🧩 *Placeholder Terdeteksi di Template*\n\n" +
        "👤 " + (klien.Nama_Pendaftar||"—") + " (`" + chatId + "`)\n" +
        "🏷️ " + (tagTpl.length ? "`" + tagTpl.join("`, `") + "`"
                               : "_Tidak ada placeholder kustom (selain HARI/TANGGAL/FOTO)._") + "\n\n" +
        (tagBaru.length
          ? "✅ *" + tagBaru.length + "* tag baru otomatis ditambahkan ke *Kamus_Placeholder*.\n" +
            "Periksa & perbaiki kalimat pertanyaannya di sheet bila perlu."
          : "✅ Semua placeholder sudah ada di Kamus_Placeholder."),
        null, config.BOT_TOKEN);
    } catch (eScanU) {
      _logSistem("WARN_SCAN_TPL", chatId + " | " + eScanU.toString());
    }
  }

  // ── Alert DARURAT: klien baru butuh aktivasi segera ──────────────
  kirimAlertDarurat(config,
    "KLIEN BARU BUTUH AKTIVASI",
    "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "📁 Template `" + namaFile + "` sudah masuk.\n" +
    "Mohon konfigurasi menu RHK lalu *aktifkan akun*.",
    { tombolAksi: [{"text":"✅ Aktifkan Akun Klien", "callback_data":"ADM_AKTIFKAN_" + chatId}] });

  // ── Konfirmasi positif ke klien (file sudah pasti diterima admin) ─
  kirimPesanSaaS(chatId,
    "✅ *File template berhasil diterima!*\n\n" +
    "Terima kasih, *" + sapaan + "*. File *" + namaFile + "* sudah diteruskan ke Admin " +
    "untuk dikonfigurasi.\n\n" +
    "Admin akan menyiapkan menu pelaporan RHK khusus untuk *" + sapaan + "*. " +
    "Notifikasi dikirim begitu menu siap digunakan. 🙏",
    null, config.BOT_TOKEN);
}

// ── Helper: teruskan dokumen (by file_id) ke admin via Telegram ─────
function _kirimDokumenKeAdmin(fileId, caption, kb, config) {
  try {
    var res = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendDocument",
      {"method":"post","payload":{
        "chat_id"      : config.ADMIN_CHAT_ID.toString(),
        "document"     : fileId,
        "caption"      : caption,
        "parse_mode"   : "Markdown",
        "reply_markup" : JSON.stringify(kb)
      }, "muteHttpExceptions": true});
    return res.getResponseCode() === 200;
  } catch (e) { return false; }
}

// ── Helper: konversi .docx → Google Doc lewat Drive REST API v3 ─────
// Tidak butuh Advanced Drive Service. Memakai OAuth token bawaan script
// (scope drive sudah aktif karena project memakai DriveApp).
function _konversiDocxKeGdoc(blobDocx, judul, folderId) {
  var metadata = { name: judul, mimeType: "application/vnd.google-apps.document" };
  if (folderId) metadata.parents = [folderId];

  var boundary = "----kinerjaRHK" + Date.now();
  var nl = "\r\n";
  var head = "--" + boundary + nl +
    "Content-Type: application/json; charset=UTF-8" + nl + nl +
    JSON.stringify(metadata) + nl +
    "--" + boundary + nl +
    "Content-Type: " +
      (blobDocx.getContentType() ||
       "application/vnd.openxmlformats-officedocument.wordprocessingml.document") + nl + nl;
  var tail = nl + "--" + boundary + "--";

  var payloadBytes = Utilities.newBlob(head).getBytes()
    .concat(blobDocx.getBytes())
    .concat(Utilities.newBlob(tail).getBytes());

  var res = UrlFetchApp.fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      "method"      : "post",
      "contentType" : "multipart/related; boundary=" + boundary,
      "payload"     : payloadBytes,
      "headers"     : { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      "muteHttpExceptions": true
    });
  var code = res.getResponseCode();
  var obj  = JSON.parse(res.getContentText());
  if (code >= 200 && code < 300 && obj.id) return obj.id;
  throw new Error("Drive REST convert HTTP " + code + ": " + res.getContentText());
}


// ====================================================================
// INVOICE + QR DINAMIS + OCR AUTO-APPROVE
// ====================================================================
function buatInvoiceOtonomSaaS(chatId, durasiBulan, config) {
  var hargaAwal    = {"1":10000,"3":30000,"6":50000,"12":100000}[durasiBulan];
  var kodeUnik     = Math.floor(Math.random() * 900) + 100;
  var nominalTotal = hargaAwal + kodeUnik;
  var trxId        = "TRX" + new Date().getTime();
  var klien        = cariAtauDaftarKlienSaaS(chatId, "");
  var sapaan       = getSapaan(klien.Nama_Pendaftar);

  var props = PropertiesService.getScriptProperties();
  props.setProperty("pending_trx_"   + chatId, trxId);
  props.setProperty("pending_total_" + chatId, nominalTotal.toString());
  props.setProperty("pending_bulan_" + chatId, durasiBulan);
  perbaruiKolomKlien(chatId, "State_Sesi", "TUNGGU_BUKTI_BAYAR");

  // Catat ke buku besar Transaksi (status awal: DITAGIHKAN)
  _catatTransaksi(chatId, klien.Nama_Pendaftar, durasiBulan, nominalTotal,
                  kodeUnik, trxId, "DITAGIHKAN", "Invoice dibuat");

  // ── Ambil payload QRIS statis (sheet diprioritaskan, lihat 10_QRIS.js) ──
  var qrisStatis = ambilPayloadQrisStatis(config);

  // ── Coba bangun QRIS DINAMIS (nominal otomatis terisi) ───────────
  var qrisDinamis = null;
  try {
    if (qrisStatis) qrisDinamis = buatQrisDinamis(qrisStatis, nominalTotal);
  } catch (eGen) {
    qrisDinamis = null;
    _logSistem("ERR_QRIS_DINAMIS", "ChatID: " + chatId + " | " + eGen.toString());
  }

  if (qrisDinamis) {
    // ===== MODE DINAMIS: klien scan → nominal langsung terisi =====
    var panduanDinamis =
      "🧾 *INVOICE LISENSI PREMIUM*\n\n" +
      "▪️ Nama       : *" + (klien.Nama_Pendaftar||"—") + "*\n" +
      "▪️ Kode Order : `" + trxId + "`\n" +
      "▪️ Paket      : *" + durasiBulan + " Bulan*\n" +
      "▪️ Harga Dasar: `Rp " + hargaAwal.toLocaleString("id-ID") + "`\n" +
      "▪️ Kode Unik  : `+" + kodeUnik + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "💰 *TOTAL TAGIHAN:*\n" +
      "   `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      "✨ *QRIS sudah berisi nominal otomatis!*\n\n" +
      "1️⃣ Scan QRIS di bawah ini dengan aplikasi bank / e-wallet\n" +
      "2️⃣ Pastikan nominal tampil *Rp " + nominalTotal.toLocaleString("id-ID") + "* lalu bayar\n" +
      "3️⃣ Kirim *screenshot bukti pembayaran* ke chat ini\n\n" +
      "_Nominal sudah terkunci pada QR — tidak perlu ketik manual._";

    var terkirim = false;
    try {
      var urlQRD = "https://api.qrserver.com/v1/create-qr-code/" +
        "?size=512x512&margin=16&ecc=M&data=" + encodeURIComponent(qrisDinamis);
      var blobQRD = UrlFetchApp.fetch(urlQRD, {"muteHttpExceptions":true}).getBlob()
                      .setName("QRIS_" + trxId + ".png");
      var resQRD = UrlFetchApp.fetch(
        "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
        {"method":"post","payload":{
          "chat_id":chatId.toString(), "photo":blobQRD,
          "caption":panduanDinamis, "parse_mode":"Markdown"
        }, "muteHttpExceptions":true});
      terkirim = (resQRD.getResponseCode() === 200);
    } catch (eKirim) {
      terkirim = false;
      _logSistem("ERR_KIRIM_QRIS_DINAMIS", "ChatID: " + chatId + " | " + eKirim.toString());
    }

    if (!terkirim) {
      // Fallback: kirim payload sebagai teks agar tetap bisa dibayar
      kirimPesanSaaS(chatId,
        panduanDinamis + "\n\n⚠️ Gambar QR gagal dimuat. Salin kode QRIS berikut:\n`" +
        qrisDinamis + "`", null, config.BOT_TOKEN);
    }

  } else {
    // ===== MODE FALLBACK: QRIS statis lama (input nominal manual) =====
    var panduanStatis =
      "🧾 *INVOICE LISENSI PREMIUM*\n\n" +
      "▪️ Nama       : *" + (klien.Nama_Pendaftar||"—") + "*\n" +
      "▪️ Kode Order : `" + trxId + "`\n" +
      "▪️ Paket      : *" + durasiBulan + " Bulan*\n" +
      "▪️ Harga Dasar: `Rp " + hargaAwal.toLocaleString("id-ID") + "`\n" +
      "▪️ Kode Unik  : `+" + kodeUnik + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "💰 *TOTAL TRANSFER:*\n" +
      "   `Rp " + nominalTotal.toLocaleString("id-ID") + "`\n" +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      "📌 Transfer nominal *persis* termasuk 3 digit kode unik.\n" +
      "Sistem akan memverifikasi otomatis.\n\n" +
      "1️⃣ Scan QRIS di bawah ini\n" +
      "2️⃣ Masukkan nominal *Rp " + nominalTotal.toLocaleString("id-ID") + "* secara manual\n" +
      "3️⃣ Kirim *screenshot bukti pembayaran* ke chat ini";

    var blobQris = DriveApp.getFileById(SAAS_CONFIG.QRIS_FILE_ID).getBlob();
    UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
      {"method":"post","payload":{"chat_id":chatId,"photo":blobQris,
       "caption":panduanStatis,"parse_mode":"Markdown"}});

    // Beritahu admin agar mengisi QRIS_STATIS untuk mengaktifkan mode dinamis
    _logSistem("QRIS_FALLBACK_STATIS",
      "ChatID: " + chatId + " | QRIS_STATIS belum dikonfigurasi → pakai QR statis manual.");
  }

  // ── Notifikasi ke admin: ada tagihan baru menunggu (approve manual) ──
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
    "🧾 *Invoice Baru Dibuat*\n\n" +
    "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "▪️ Paket  : *" + durasiBulan + " Bulan*\n" +
    "▪️ Nominal: *Rp " + nominalTotal.toLocaleString("id-ID") + "*\n" +
    "▪️ Kode   : `" + trxId + "` (unik `+" + kodeUnik + "`)\n" +
    "▪️ Mode QR: " + (qrisDinamis ? "Dinamis ✅" : "Statis (manual) ⚠️") + "\n\n" +
    "_Menunggu klien mengirim bukti bayar. Cocokkan nominal unik di mutasi lalu Setujui/Tolak._",
    null, config.BOT_TOKEN);
}

// ====================================================================
// TERIMA BUKTI BAYAR + OCR AUTO-APPROVE
// ====================================================================
// Alur:
//   1. Unduh foto ke Drive sementara
//   2. Baca teks via Google Drive OCR (gratis, tanpa API key tambahan)
//   3. Cari angka nominal di teks hasil OCR
//   4. Cocokkan dengan nominal sistem (toleransi ±5 untuk kompresi gambar)
//   5. Jika cocok pasti → AUTO APPROVE
//   6. Jika ada teks tapi nominal tidak cocok → forward ke admin + label RAGU
//   7. Jika OCR gagal/kosong → forward ke admin manual seperti sebelumnya
// ====================================================================
function terimaFotoBuktiTransferKlien(chatId, photoArray, config) {
  var props       = PropertiesService.getScriptProperties();
  var trxId       = props.getProperty("pending_trx_"   + chatId) || "TRX_UNKNOWN";
  var totalSistem = parseInt(props.getProperty("pending_total_" + chatId) || "0");
  var bulan       = props.getProperty("pending_bulan_" + chatId) || "1";
  var fileIdFoto  = photoArray[photoArray.length - 1].file_id;
  var klien       = cariAtauDaftarKlienSaaS(chatId, "");
  perbaruiKolomKlien(chatId, "State_Sesi", "");

  kirimPesanSaaS(chatId,
    "⏳ *Bukti pembayaran diterima!*\n" +
    "Sistem sedang memverifikasi nominal secara otomatis...",
    null, config.BOT_TOKEN);

  // OCR via Drive
  var hasilOCR = ""; var driveFileId = null;
  try {
    var getFileRes = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + config.BOT_TOKEN + "/getFile?file_id=" + fileIdFoto,
      {"muteHttpExceptions":true});
    var filePath   = JSON.parse(getFileRes.getContentText()).result.file_path;
    var fotoBlob   = UrlFetchApp.fetch(
      "https://api.telegram.org/file/bot" + config.BOT_TOKEN + "/" + filePath,
      {"muteHttpExceptions":true}).getBlob()
      .setName("bukti.jpg").setContentType("image/jpeg");
    var ocrFile    = Drive.Files.insert(
      {title:"ocr_"+chatId, mimeType:MimeType.GOOGLE_DOCS}, fotoBlob);
    driveFileId    = ocrFile.id;
    hasilOCR       = DocumentApp.openById(driveFileId).getBody().getText();
    DriveApp.getFileById(driveFileId).setTrashed(true);
  } catch(eOCR) {
    if (driveFileId) { try { DriveApp.getFileById(driveFileId).setTrashed(true); } catch(e2){} }
  }

  var nominalOCR = _ekstrakNominalDariTeks(hasilOCR);
  if (nominalOCR !== null && Math.abs(nominalOCR - totalSistem) <= 5) {
    _logSistem("AUTO_APPROVE", chatId + " | OCR: " + nominalOCR + " | Sistem: " + totalSistem);
    eksekusiApprovePembayaranKlien(chatId + "_" + bulan, config);
    kirimPesanSaaS(config.ADMIN_CHAT_ID,
      "🤖 *Auto-Approve Berhasil* ✅\n\n" +
      "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
      "▪️ OCR: `Rp " + nominalOCR.toLocaleString("id-ID") + "`\n" +
      "▪️ Sistem: `Rp " + totalSistem.toLocaleString("id-ID") + "`\n" +
      "▪️ Paket: *" + bulan + " Bulan*",
      null, config.BOT_TOKEN);
  } else {
    var label = nominalOCR !== null
      ? "RAGU (OCR: Rp " + nominalOCR.toLocaleString("id-ID") +
        ", Sistem: Rp " + totalSistem.toLocaleString("id-ID") + ")"
      : (hasilOCR ? "OCR_NO_NOMINAL" : "OCR_GAGAL");
    _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem, label, config);
  }
}

function _ekstrakNominalDariTeks(teks) {
  if (!teks || !teks.trim()) return null;
  var bersih    = teks.replace(/\./g,"").replace(/,/g,"");
  var matches   = bersih.match(/\b\d{4,9}\b/g);
  if (!matches)  return null;
  var kandidat  = matches.map(function(m){return parseInt(m);})
                         .filter(function(n){return n>=10000 && n<=999999;});
  return kandidat.length ? Math.max.apply(null, kandidat) : null;
}

function _forwardBuktiBayarKeAdmin(chatId, fileIdFoto, klien, bulan, totalSistem, label, config) {
  var kbAdmin = {"inline_keyboard": [
    [{"text":"✅ Setujui & Aktifkan","callback_data":"ADM_APP_" + chatId + "_" + bulan}],
    [{"text":"❌ Tolak Transfer",    "callback_data":"ADM_REJ_" + chatId}]
  ]};
  UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendPhoto",
    {"method":"post","payload":{
      "chat_id"      : config.ADMIN_CHAT_ID.toString(),
      "photo"        : fileIdFoto,
      "caption"      :
        "🔔 *BUKTI BAYAR — PERLU REVIEW*\n\n" +
        "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
        "▪️ Paket  : *" + bulan + " Bulan*\n" +
        "▪️ Nominal: *Rp " + totalSistem.toLocaleString("id-ID") + "*\n" +
        "▪️ Kode   : `+" + (totalSistem % 1000) + "`\n" +
        "▪️ Status OCR: `" + label + "`\n\n" +
        "Cek mutasi DANA Bisnis, lalu pilih aksi:",
      "parse_mode"   : "Markdown",
      "reply_markup" : JSON.stringify(kbAdmin)
    }});
  // ── Alert DARURAT: bukti bayar butuh approve manual ──────────────
  kirimAlertDarurat(config,
    "BUKTI BAYAR BUTUH APPROVE",
    "👤 *" + (klien.Nama_Pendaftar||"—") + "* (`" + chatId + "`)\n" +
    "💰 Nominal sistem: *Rp " + totalSistem.toLocaleString("id-ID") + "*\n" +
    "🔎 Status OCR: `" + label + "`\n" +
    "Cek mutasi lalu *Setujui/Tolak*.",
    { tombolAksi: [{"text":"✅ Setujui & Aktifkan", "callback_data":"ADM_APP_" + chatId + "_" + bulan}] });

  kirimPesanSaaS(chatId,
    "✅ *Bukti pembayaran diterima!*\n\n" +
    "Admin sedang memverifikasi pembayaran. " +
    "Akun akan aktif otomatis setelah konfirmasi. 🙏",
    null, config.BOT_TOKEN);
}

function _logSistem(tipe, detail) {
  var ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Sistem");
  if (ls) ls.appendRow([new Date(), tipe, detail]);
}

// ── Catat transaksi ke buku besar (sheet Transaksi) ──────────────
// status: DITAGIHKAN | LUNAS | DITOLAK
function _catatTransaksi(chatId, nama, paketBulan, nominal, kodeUnik, trxId, status, keterangan) {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transaksi");
    if (!sh) return;
    sh.appendRow([
      new Date(), chatId.toString(), nama || "", paketBulan || "",
      nominal || "", kodeUnik || "", trxId || "", status || "", keterangan || ""
    ]);
  } catch (e) {
    _logSistem("ERR_CATAT_TRX", chatId + " | " + e.toString());
  }
}


// ====================================================================
// APPROVE / REJECT PEMBAYARAN
// ====================================================================
function eksekusiApprovePembayaranKlien(callbackDataStr, config) {
  var last    = callbackDataStr.lastIndexOf("_");
  var targetId = callbackDataStr.substring(0, last);
  var jmlBulan = parseInt(callbackDataStr.substring(last + 1));

  var targetKlien = cariAtauDaftarKlienSaaS(targetId, "");
  var sapaan      = getSapaan(targetKlien.Nama_Pendaftar);
  var expBaru     = new Date();
  if (targetKlien.Status_Akses === "AKTIF" && new Date(targetKlien.Masa_Aktif) > new Date()) {
    expBaru = new Date(targetKlien.Masa_Aktif);
  }
  expBaru.setMonth(expBaru.getMonth() + jmlBulan);

  perbaruiKolomKlien(targetId, "Status_Akses",  "AKTIF");
  perbaruiKolomKlien(targetId, "Masa_Aktif",    expBaru);
  perbaruiKolomKlien(targetId, "Warning_Sent",  "");

  var props = PropertiesService.getScriptProperties();
  // Baca nilai pending SEBELUM dihapus → untuk pencatatan transaksi LUNAS
  var trxLunas = props.getProperty("pending_trx_"   + targetId) || "";
  var totLunas = props.getProperty("pending_total_" + targetId) || "";
  _catatTransaksi(targetId, targetKlien.Nama_Pendaftar, jmlBulan, totLunas,
                  (totLunas ? (parseInt(totLunas) % 1000) : ""), trxLunas,
                  "LUNAS", "Pembayaran disetujui (" + jmlBulan + " bln)");
  props.deleteProperty("pending_trx_"   + targetId);
  props.deleteProperty("pending_total_" + targetId);
  props.deleteProperty("pending_bulan_" + targetId);

  if (config && config.BOT_TOKEN) {
    var expStr = Utilities.formatDate(expBaru, "GMT+7", "dd/MM/yyyy");
    kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
      "✅ Akun `" + targetId + "` aktif *" + jmlBulan + " bulan* hingga *" + expStr + "*.",
      null, config.BOT_TOKEN);
    kirimPesanSaaS(targetId,
      "🎉 *Pembayaran Disetujui!*\n\n" +
      "Halo *" + sapaan + "*, akun premium aktif hingga *" + expStr + "*.\n\n" +
      "Ketik /lapor untuk mulai membuat laporan RHK. 🚀",
      null, config.BOT_TOKEN);
  }
  _logSistem("APPROVE", targetId + " | " + jmlBulan + " bln");
}

function eksekusiRejectPembayaranKlien(targetId, config) {
  var kbRej = {"inline_keyboard": [
    [{"text":"🔄 Coba Bayar Ulang", "callback_data":"SHORTCUT_BAYAR"}],
    [tombolHubungiAdminWA()]
  ]};
  kirimPesanSaaS(config.ADMIN_CHAT_ID.toString(),
    "❌ Pembayaran ID `" + targetId + "` ditolak.", null, config.BOT_TOKEN);
  kirimPesanSaaS(targetId,
    "🛑 *Pembayaran Tidak Valid*\n\n" +
    "Bukti transfer yang dikirimkan tidak dapat diverifikasi. " +
    "Silakan ulangi pembayaran dengan nominal yang tepat.",
    kbRej, config.BOT_TOKEN);
  _logSistem("REJECT", targetId);
}

// ====================================================================
// FOTO LAPORAN KEGIATAN
// ====================================================================
function terimaFotoLaporanKegiatanKlien(chatId, photoArray, config) {
  var klien = cariAtauDaftarKlienSaaS(chatId, "");
  var count = parseInt(klien.Foto_Count || "0") + 1;

  if (count > 4) {
    kirimPesanSaaS(chatId,
      "🛑 Maksimal *4 foto* per laporan. Silakan ketuk tombol cetak PDF.",
      null, config.BOT_TOKEN);
    return;
  }

  perbaruiKolomKlien(chatId, "Foto_Count", count);
  PropertiesService.getScriptProperties()
    .setProperty("sess_" + chatId + "_foto_" + count, photoArray[photoArray.length-1].file_id);

  if (count < 2) {
    kirimPesanSaaS(chatId,
      "📸 Foto ke-1 tersimpan! Kirimkan *foto ke-2* untuk memenuhi syarat minimal:",
      null, config.BOT_TOKEN);
  } else {
    var kbCetak = {"inline_keyboard": [
      [{"text":"📷 Tambah Foto (" + count + "/4)", "callback_data":"SaaS_PROSES_FOTO_LAGI"}],
      [{"text":"🚀 Rakit Jadi PDF Sekarang!",       "callback_data":"SaaS_PROSES_NOW"}]
    ]};
    kirimPesanSaaS(chatId,
      "✅ *" + count + " foto* tersimpan. Lanjut tambah foto atau cetak PDF?",
      kbCetak, config.BOT_TOKEN);
  }
}

// ====================================================================
// FOLLOW-UP KLIEN: INFO DETAIL + TOMBOL AKSI
// ====================================================================
function tampilkanInfoFollowUp(targetChatId, adminChatId, config) {
  var klien   = cariAtauDaftarKlienSaaS(targetChatId, "");
  if (!klien || klien.Status_Akses === "BELUM_DAFTAR") {
    kirimPesanSaaS(adminChatId,
      "❌ Chat ID `" + targetChatId + "` tidak ditemukan.", null, config.BOT_TOKEN);
    return;
  }
  var sapaan   = getSapaan(klien.Nama_Pendaftar);
  var expStr   = klien.Masa_Aktif
    ? Utilities.formatDate(new Date(klien.Masa_Aktif), "GMT+7", "dd/MM/yyyy") : "—";
  var sisaHari = klien.Masa_Aktif
    ? Math.ceil((new Date(klien.Masa_Aktif) - new Date()) / 86400000) : null;
  var infoSisa = sisaHari !== null
    ? (sisaHari > 0 ? "Sisa *" + sisaHari + " hari*" : "⛔ *EXPIRED*") : "—";

  var info =
    "👤 *PROFIL KLIEN*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "▪️ Nama      : *" + (klien.Nama_Pendaftar||"—") + "*\n" +
    "▪️ Chat ID   : `" + targetChatId + "`\n" +
    "▪️ Status    : `" + klien.Status_Akses + "`\n" +
    "▪️ Masa Aktif: `" + expStr + "` — " + infoSisa + "\n" +
    "▪️ Total Cetak: " + (klien.Total_Laporan||0) + "x\n" +
    "▪️ Warning   : `" + (klien.Warning_Sent||"—") + "`\n\n";

  // Deeplink WA dengan pesan kontekstual
  var pesanWA = "Halo " + sapaan + ", saya Admin Kinerja RHK ingin menghubungi " +
    "terkait akun yang " +
    (sisaHari !== null && sisaHari <= 0 ? "sudah expired" : "akan segera expired") + ".";
  var linkWA  = "https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
                "?text=" + encodeURIComponent(pesanWA);

  var kb = {"inline_keyboard": [
    [{"text":"📲  Buka WhatsApp Admin (Kirim ke Klien)", "url": linkWA}],
    [{"text":"💬 Kirim Pesan Bot ke Klien",  "callback_data":"ADM_MSG_"      + targetChatId}],
    [{"text":"📄 Kirim Ulang Template",       "callback_data":"ADM_SEND_TPL_" + targetChatId}]
  ]};
  kirimPesanSaaS(adminChatId, info + "Pilih aksi untuk *" + sapaan + "*:", kb, config.BOT_TOKEN);
}

function tampilkanDaftarFollowUpSemua(adminChatId, config) {
  var semua    = cariSemuaKlienByStatus("AKTIF");
  var sekarang = new Date();
  var daftar   = [];

  semua.forEach(function(k) {
    if (!k.Masa_Aktif) return;
    var sisa = Math.ceil((new Date(k.Masa_Aktif) - sekarang) / 86400000);
    if (sisa <= 7) daftar.push({klien:k, sisa:sisa});
  });
  var nonaktif = cariSemuaKlienByStatus("NONAKTIF");
  nonaktif.forEach(function(k) {
    if ((k.Catatan_Admin||"").toString().indexOf("Expired") !== -1)
      daftar.push({klien:k, sisa:-999});
  });

  if (!daftar.length) {
    kirimPesanSaaS(adminChatId,
      "🎉 Tidak ada klien yang expired atau hampir expired (≤7 hari).",
      null, config.BOT_TOKEN);
    return;
  }
  daftar.sort(function(a,b){return a.sisa-b.sisa;});

  var teks = "⚠️ *KLIEN PERLU FOLLOW-UP*\n_(Expired / Sisa ≤ 7 hari)_\n\n";
  var kb   = {"inline_keyboard":[]};

  for (var i = 0; i < daftar.length; i++) {
    var k    = daftar[i].klien;
    var sisa = daftar[i].sisa;
    var lbl  = sisa <= 0 ? "❌ EXPIRED" : "⚠️ H-" + sisa;
    teks += (i+1) + ". *" + (k.Nama_Pendaftar||"—") +
            "* (`" + k.Chat_ID + "`) — " + lbl + "\n";
    var pesanWAFU = "Halo " + getSapaan(k.Nama_Pendaftar) +
      ", masa aktif akun Kinerja RHK " +
      (sisa <= 0 ? "sudah berakhir" : "tersisa " + sisa + " hari") +
      ". Ketik /bayar untuk perpanjangan.";
    kb.inline_keyboard.push([{
      "text": "📲  WA " + getSapaan(k.Nama_Pendaftar) + " (" + lbl + ")",
      "url" : "https://wa.me/" + SAAS_CONFIG.ADMIN_WHATSAPP_NO +
              "?text=" + encodeURIComponent(pesanWAFU)
    }]);
  }
  kirimPesanSaaS(adminChatId, teks, null, config.BOT_TOKEN);
  if (kb.inline_keyboard.length)
    kirimPesanSaaS(adminChatId, "📲 *Tombol WA cepat:*", kb, config.BOT_TOKEN);
}

// ====================================================================
// KIRIM TEMPLATE KE KLIEN
// ====================================================================
function kirimTemplateKeKlien(targetChatId, adminChatId, config) {
  try {
    var klien  = cariAtauDaftarKlienSaaS(targetChatId, "");
    var sapaan = getSapaan(klien.Nama_Pendaftar);
    if (!klien.Nama_Pendaftar) {
      kirimPesanSaaS(adminChatId,
        "❌ Chat ID `" + targetChatId + "` tidak ditemukan.", null, config.BOT_TOKEN);
      return;
    }
    var adminRoot = DriveApp.getFolderById(SAAS_CONFIG.ADMIN_ROOT_FOLDER_ID);
    var iter      = adminRoot.getFoldersByName(klien.Nama_Pendaftar);
    if (!iter.hasNext()) {
      kirimPesanSaaS(adminChatId,
        "❌ Folder Drive untuk *" + sapaan + "* belum ada.\n" +
        "Klien belum pernah mengirim file template.", null, config.BOT_TOKEN);
      return;
    }
    var folder    = iter.next();
    var files     = folder.getFiles();
    var jumlah    = 0; var daftarId = "";

    kirimPesanSaaS(adminChatId,
      "⏳ Mengirim template *" + sapaan + "* ke `" + targetChatId + "`...",
      null, config.BOT_TOKEN);
    kirimPesanSaaS(targetChatId,
      "📄 *Admin mengirimkan file template RHK Anda kembali:*",
      null, config.BOT_TOKEN);

    while (files.hasNext()) {
      var file   = files.next();
      var mime   = file.getMimeType();
      var blob   = mime === MimeType.GOOGLE_DOCS
        ? file.getAs("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
               .setName(file.getName() + ".docx")
        : file.getBlob();
      kirimDokumenSaaS(targetChatId, blob, "📋 " + file.getName(), config.BOT_TOKEN);
      if (mime === MimeType.GOOGLE_DOCS)
        daftarId += "▪️ `" + file.getName() + "` → ID: `" + file.getId() + "`\n";
      jumlah++;
      Utilities.sleep(500);
    }
    if (!jumlah) {
      kirimPesanSaaS(adminChatId, "⚠️ Folder *" + sapaan + "* kosong.", null, config.BOT_TOKEN);
      return;
    }
    kirimPesanSaaS(adminChatId,
      "✅ *" + jumlah + " file* terkirim ke *" + sapaan + "*.\n\n" +
      "📌 *ID untuk RHK_Config:*\n" + daftarId,
      null, config.BOT_TOKEN);
  } catch(eK) {
    kirimPesanSaaS(adminChatId,
      "⚠️ Gagal kirim template: `" + eK.toString() + "`", null, config.BOT_TOKEN);
  }
}
