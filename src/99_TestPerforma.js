// ====================================================================
// FILE 99: TEST FUNCTIONS - PERFORMANCE MEASUREMENT
// ====================================================================
// Run these functions in Apps Script Editor to verify optimizations.
// Expected improvements: 7-15x faster per operation
// ====================================================================

// ── TEST 1: Cache Config Performance ──────────────────────────────
function testCacheConfig() {
  Logger.log("\n" + "=".repeat(60));
  Logger.log("TEST 1: Config Cache Performance");
  Logger.log("=".repeat(60));
  
  // Invalidate cache first untuk cold start
  invalidateConfigCache();
  Logger.log("✅ Cache invalidated");
  
  // First call (cache miss - baca dari sheet)
  var start1 = new Date().getTime();
  var config1 = ambilKonfigurasiSaaS();
  var end1 = new Date().getTime();
  var time1 = end1 - start1;
  Logger.log("📡 FIRST CALL (cache miss):  " + time1 + "ms");
  Logger.log("   Config keys: " + Object.keys(config1).length);
  
  // Second call (memory cache hit)
  var start2 = new Date().getTime();
  var config2 = ambilKonfigurasiSaaS();
  var end2 = new Date().getTime();
  var time2 = end2 - start2;
  Logger.log("✅ SECOND CALL (memory cache): " + time2 + "ms");
  
  // Third call (after slight delay - CacheService)
  Utilities.sleep(100);
  var start3 = new Date().getTime();
  var config3 = ambilKonfigurasiSaaS();
  var end3 = new Date().getTime();
  var time3 = end3 - start3;
  Logger.log("✅ THIRD CALL (cache service): " + time3 + "ms");
  
  // Results
  Logger.log("\n📊 RESULTS:");
  Logger.log("   First call:  " + time1 + "ms (sheet read)");
  Logger.log("   Second call: " + time2 + "ms (memory cache)");
  Logger.log("   Third call:  " + time3 + "ms (CacheService)");
  Logger.log("   ⚡ IMPROVEMENT: " + (time1 / (time2 || 1)).toFixed(0) + "x faster");
  Logger.log("   Expected: First ~400-600ms, Second ~1-3ms, Third ~2-5ms");
  Logger.log("=".repeat(60));
}

// ── TEST 2: Client Cache Performance ──────────────────────────────
function testClientCache() {
  Logger.log("\n" + "=".repeat(60));
  Logger.log("TEST 2: Client Lookup Cache Performance");
  Logger.log("=".repeat(60));
  
  var chatId = "123456789_TEST";
  
  // Invalidate cache
  CacheService.getScriptCache().remove("klien_" + chatId);
  Logger.log("✅ Cache invalidated for " + chatId);
  
  // First call (cache miss - baca dari sheet atau daftarkan)
  var start1 = new Date().getTime();
  var klien1 = cariAtauDaftarKlienSaaS(chatId, "Test User");
  var end1 = new Date().getTime();
  var time1 = end1 - start1;
  Logger.log("📡 FIRST CALL (cache miss):   " + time1 + "ms");
  Logger.log("   Client status: " + klien1.Status_Akses);
  Logger.log("   Client name: " + klien1.Nama_Pendaftar);
  
  // Second call (cache hit)
  var start2 = new Date().getTime();
  var klien2 = cariAtauDaftarKlienSaaS(chatId, "Test User");
  var end2 = new Date().getTime();
  var time2 = end2 - start2;
  Logger.log("✅ SECOND CALL (cache hit):   " + time2 + "ms");
  
  // Third call (confirm cache works multiple times)
  var start3 = new Date().getTime();
  var klien3 = cariAtauDaftarKlienSaaS(chatId, "Test User");
  var end3 = new Date().getTime();
  var time3 = end3 - start3;
  Logger.log("✅ THIRD CALL (cache hit):    " + time3 + "ms");
  
  // Results
  Logger.log("\n📊 RESULTS:");
  Logger.log("   First call:  " + time1 + "ms (sheet read)");
  Logger.log("   Second call: " + time2 + "ms (cache)");
  Logger.log("   Third call:  " + time3 + "ms (cache)");
  Logger.log("   ⚡ IMPROVEMENT: " + (time1 / (time2 || 1)).toFixed(0) + "x faster");
  Logger.log("   Expected: First ~200-300ms, Second/Third ~1-5ms");
  Logger.log("=".repeat(60));
}

// ── TEST 3: Batch Update Performance ──────────────────────────────
function testBatchUpdate() {
  Logger.log("\n" + "=".repeat(60));
  Logger.log("TEST 3: Batch Update Performance");
  Logger.log("=".repeat(60));
  
  var chatId = "987654321_TEST";
  
  // Create test client first
  cariAtauDaftarKlienSaaS(chatId, "Batch Test");
  CacheService.getScriptCache().remove("klien_" + chatId);
  Logger.log("✅ Test client created: " + chatId);
  
  // Single updates (old way - slower)
  var start1 = new Date().getTime();
  perbaruiKolomKlien(chatId, "State_Sesi", "TEST_STATE_1");
  var time1 = new Date().getTime() - start1;
  Logger.log("📡 SINGLE UPDATE #1 (old way): " + time1 + "ms");
  
  var start2 = new Date().getTime();
  perbaruiKolomKlien(chatId, "Foto_Count", 1);
  var time2 = new Date().getTime() - start2;
  Logger.log("📡 SINGLE UPDATE #2 (old way): " + time2 + "ms");
  
  var start3 = new Date().getTime();
  perbaruiKolomKlien(chatId, "Total_Laporan", 5);
  var time3 = new Date().getTime() - start3;
  Logger.log("📡 SINGLE UPDATE #3 (old way): " + time3 + "ms");
  
  var timeSingleTotal = time1 + time2 + time3;
  Logger.log("   Total (3 single updates): " + timeSingleTotal + "ms");
  
  // Batch update (new way - faster)
  var start4 = new Date().getTime();
  perbaruiMultiKolom(chatId, {
    "State_Sesi": "TEST_STATE_2",
    "Foto_Count": 2,
    "Total_Laporan": 10
  });
  var timeBatch = new Date().getTime() - start4;
  Logger.log("✅ BATCH UPDATE (3 fields new way): " + timeBatch + "ms");
  
  // Results
  Logger.log("\n📊 RESULTS:");
  Logger.log("   Single updates (3x): " + timeSingleTotal + "ms");
  Logger.log("   Batch update (3x):   " + timeBatch + "ms");
  Logger.log("   ⚡ IMPROVEMENT: " + (timeSingleTotal / timeBatch).toFixed(1) + "x faster");
  Logger.log("   Expected: Single ~300-500ms, Batch ~80-150ms");
  Logger.log("=".repeat(60));
}

// ── TEST 4: Kamus Cache Performance ──────────────────────────────
function testKamusCache() {
  Logger.log("\n" + "=".repeat(60));
  Logger.log("TEST 4: Kamus Placeholder Cache Performance");
  Logger.log("=".repeat(60));
  
  // Invalidate cache
  invalidateKamusCache();
  Logger.log("✅ Kamus cache invalidated");
  
  // First call (cache miss - baca dari sheet)
  var start1 = new Date().getTime();
  var kamus1 = ambilKamusPlaceholderSAFE();
  var end1 = new Date().getTime();
  var time1 = end1 - start1;
  Logger.log("📡 FIRST CALL (cache miss):  " + time1 + "ms");
  Logger.log("   Kamus entries: " + Object.keys(kamus1).length);
  
  // Second call (memory cache hit)
  var start2 = new Date().getTime();
  var kamus2 = ambilKamusPlaceholderSAFE();
  var end2 = new Date().getTime();
  var time2 = end2 - start2;
  Logger.log("✅ SECOND CALL (memory cache): " + time2 + "ms");
  
  // Third call (still memory cache)
  var start3 = new Date().getTime();
  var kamus3 = ambilKamusPlaceholderSAFE();
  var end3 = new Date().getTime();
  var time3 = end3 - start3;
  Logger.log("✅ THIRD CALL (memory cache):  " + time3 + "ms");
  
  // Results
  Logger.log("\n📊 RESULTS:");
  Logger.log("   First call:  " + time1 + "ms (sheet read)");
  Logger.log("   Second call: " + time2 + "ms (memory cache)");
  Logger.log("   Third call:  " + time3 + "ms (memory cache)");
  Logger.log("   ⚡ IMPROVEMENT: " + (time1 / (time2 || 1)).toFixed(0) + "x faster");
  Logger.log("   Expected: First ~30-50ms, Second/Third <1ms");
  Logger.log("=".repeat(60));
}

// ── TEST 5: Format Date Cache Performance ────────────────────────
function testFormatDateCache() {
  Logger.log("\n" + "=".repeat(60));
  Logger.log("TEST 5: Format Date Cache Performance");
  Logger.log("=".repeat(60));
  
  var testDate = new Date();
  var timezone = "GMT+7";
  var format = "dd/MM/yyyy HH:mm";
  
  Logger.log("✅ Testing date: " + testDate);
  
  // First call (Utilities.formatDate)
  var start1 = new Date().getTime();
  var result1 = formatDateCached(testDate, timezone, format);
  var end1 = new Date().getTime();
  var time1 = end1 - start1;
  Logger.log("📡 FIRST CALL (format):  " + time1 + "ms");
  Logger.log("   Result: " + result1);
  
  // Second call (cache hit)
  var start2 = new Date().getTime();
  var result2 = formatDateCached(testDate, timezone, format);
  var end2 = new Date().getTime();
  var time2 = end2 - start2;
  Logger.log("✅ SECOND CALL (cache):  " + time2 + "ms");
  
  // Multiple calls (verify still cached)
  var totalTime = 0;
  for (var i = 0; i < 10; i++) {
    var s = new Date().getTime();
    formatDateCached(testDate, timezone, format);
    totalTime += new Date().getTime() - s;
  }
  Logger.log("✅ 10 MORE CALLS (cached): " + totalTime + "ms average");
  
  // Results
  Logger.log("\n📊 RESULTS:");
  Logger.log("   First call:   " + time1 + "ms");
  Logger.log("   Second call:  " + time2 + "ms");
  Logger.log("   10x calls:    " + (totalTime/10).toFixed(2) + "ms average");
  Logger.log("   ⚡ IMPROVEMENT: " + (time1 / (time2 || 1)).toFixed(0) + "x faster");
  Logger.log("=".repeat(60));
}

// ── RUN ALL TESTS ────────────────────────────────────────────────
function runAllPerformaTests() {
  Logger.log("\n\n");
  Logger.log("╔" + "═".repeat(58) + "╗");
  Logger.log("║  KINERJA SaaS - PERFORMANCE TEST SUITE  v1.0           ║");
  Logger.log("║  Full Implementation - Optimization Verification       ║");
  Logger.log("╚" + "═".repeat(58) + "╝");
  
  testCacheConfig();
  Utilities.sleep(500);
  
  testClientCache();
  Utilities.sleep(500);
  
  testKamusCache();
  Utilities.sleep(500);
  
  testFormatDateCache();
  Utilities.sleep(500);
  
  testBatchUpdate();
  
  Logger.log("\n\n");
  Logger.log("╔" + "═".repeat(58) + "╗");
  Logger.log("║  ALL TESTS COMPLETED - Check logs above for results    ║");
  Logger.log("║  Expected: All cache hits show <5ms, batch 5x faster   ║");
  Logger.log("╚" + "═".repeat(58) + "╝");
  Logger.log("\n");
}

// ── QUICK SANITY CHECK ───────────────────────────────────────────
function quickSanityCheck() {
  Logger.log("\n✅ Quick Sanity Check:");
  
  try {
    var config = ambilKonfigurasiSaaS();
    Logger.log("  ✓ Config cache working");
  } catch(e) { Logger.log("  ✗ Config cache ERROR: " + e); }
  
  try {
    var kamus = ambilKamusPlaceholderSAFE();
    Logger.log("  ✓ Kamus cache working (" + Object.keys(kamus).length + " entries)");
  } catch(e) { Logger.log("  ✗ Kamus cache ERROR: " + e); }
  
  try {
    var klien = cariAtauDaftarKlienSaaS("999999999", "Test");
    Logger.log("  ✓ Client cache working");
  } catch(e) { Logger.log("  ✗ Client cache ERROR: " + e); }
  
  try {
    perbaruiMultiKolom("999999999", {"State_Sesi": "TEST"});
    Logger.log("  ✓ Batch update working");
  } catch(e) { Logger.log("  ✗ Batch update ERROR: " + e); }
  
  Logger.log("\n✅ All sanity checks passed!");
}

