/* ============================================================
   UNDIAN INTERNET MERDEKA — 10 AGUSTUS 2026
   Login Koordinator → Pilih Area → Pilih Warga → Spin HADIAH
   Tabel pemaparan: siapa sudah/belum spin + hadiah apa
   ============================================================ */

/* ---------- KREDENSIAL KOORDINATOR (HARDCODED) ----------
   IRVAN = OWNER (verifikasi ZONK global + area sendiri)
   ALDIN/MUNIR/NASRUN = KOORDINATOR (buka website buat warga spin) */
const KOORDINATOR = {
  aldin:  { nama: 'ALDIN',  pass: 'merdeka2026', agen: 'ALDIN',  role: 'koordinator' },
  munir:  { nama: 'MUNIR',  pass: 'merdeka2026', agen: 'MUNIR',  role: 'koordinator' },
  nasrun: { nama: 'NASRUN', pass: 'merdeka2026', agen: 'NASRUN', role: 'koordinator' },
  irvan:  { nama: 'IRVAN',  pass: 'merdeka2026', agen: 'IRVAN',  role: 'owner' },
};

/* ---------- DAFTAR HADIAH BIASA — KUOTA PER KOORDINATOR (total 61 unit) ----------
   Setiap koordinator hanya melihat & mengundi dari KUOTANYA SENDIRI.
   Sepeda Listrik TIDAK di sini — khusus undian utama 17 Agustus (GRAND_PRIZE). */
const PRIZE_TOTAL = 62; // 61 hadiah biasa + 1 sepeda listrik (grand)
const AGEN_QUOTA = {
  ALDIN: [
    { name: 'Rice Cooker', qty: 1 },
    { name: 'Setrika', qty: 1 },
    { name: 'Kipas Angin Mini', qty: 1 },
    { name: 'Jam Dinding', qty: 1 },
    { name: 'Baju Kaos', qty: 1 },
    { name: 'Gelas Mugs', qty: 2 },
  ],
  MUNIR: [
    { name: 'Rice Cooker', qty: 1 },
    { name: 'Blender', qty: 1 },
    { name: 'Setrika', qty: 2 },
    { name: 'Kipas Angin Mini', qty: 3 },
    { name: 'Jam Dinding', qty: 4 },
    { name: 'Baju Kaos', qty: 4 },
    { name: 'Gelas Mugs', qty: 5 },
  ],
  NASRUN: [
    { name: 'Rice Cooker', qty: 1 },
    { name: 'Blender', qty: 1 },
    { name: 'Setrika', qty: 2 },
    { name: 'Kipas Angin Mini', qty: 3 },
    { name: 'Jam Dinding', qty: 4 },
    { name: 'Baju Kaos', qty: 4 },
    { name: 'Gelas Mugs', qty: 5 },
  ],
  IRVAN: [
    { name: 'Rice Cooker', qty: 1 },
    { name: 'Blender', qty: 1 },
    { name: 'Setrika', qty: 1 },
    { name: 'Kipas Angin Mini', qty: 3 },
    { name: 'Jam Dinding', qty: 3 },
    { name: 'Baju Kaos', qty: 3 },
    { name: 'Gelas Mugs', qty: 2 },
  ],
};

/* ---------- HADIAH UTAMA (GRAND) — SEPEDA LISTRIK ----------
   Hanya aktif otomatis tanggal 17 Agustus (atau test via ?grand=1).
   Terpusat: SEMUA warga dari SEMUA koordinator dalam SATU undian. */
const GRAND_PRIZE = [
  { name: 'Sepeda Listrik', qty: 1 },
];

/* ---------- STATE ---------- */
const state = {
  user: null,        // username koordinator yang login
  area: null,        // area yang sedang dikunjungi
  activeWarga: null, // warga yang sedang spin
  sudah: {},         // { agen: { area: [ {warga, hadiah} ] } } — sudah spin
  tidakHadir: {},    // { agen: { area: [nama, ...] } } — warga ditandai TIDAK HADIR (door-to-door)
  spinning: false,
  grandMode: false,  // mode undian utama (sepeda listrik 17 Agu)
  grandSudah: [],    // [ { warga, agen, hadiah } ] — riwayat grand
};

/* ---------- RESET DATA HADIAH (opsional via URL ?reset=1) ----------
   Bang Dadan: "kembali kosongkan penerimaan hadiah kembali ke default".
   Buka https://undian-pelanggan.vercel.app/?reset=1 → hapus SEMUA riwayat
   pemenang + stok hadiah kembali penuh (kuota awal), lalu reload bersih. */
(function handleResetParam() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('reset') === '1') {
      localStorage.removeItem('undian_session_v1');
      localStorage.removeItem('undian_sudah_v1');
      localStorage.removeItem('undian_qty_v1');
      localStorage.removeItem('undian_grand_v1');
      localStorage.removeItem('undian_tidak_hadir_v1');
      url.searchParams.delete('reset');
      window.location.replace(url.toString());
    }
  } catch (e) { /* abaikan */ }
})();

/* ---------- PERSISTENSI LOCALSTORAGE ----------
   Riwayat pemenang, sisa stok hadiah & riwayat grand disimpan agar
   setelah refresh orang yang sama TIDAK bisa spin/menang lagi. */
(function restoreRiwayat() {
  try {
    const savedSudah = JSON.parse(localStorage.getItem('undian_sudah_v1'));
    if (savedSudah && typeof savedSudah === 'object') state.sudah = savedSudah;
  } catch (e) { /* data rusak — abaikan */ }
  try {
    const savedGrand = JSON.parse(localStorage.getItem('undian_grand_v1'));
    if (Array.isArray(savedGrand)) {
      state.grandSudah = savedGrand;
      if (state.grandSudah.length > 0) {
        const gp = GRAND_PRIZE.find(p => p.name === 'Sepeda Listrik');
        if (gp) gp.qty = Math.max(0, gp.qty - state.grandSudah.length);
      }
    }
  } catch (e) { /* data rusak — abaikan */ }
  try {
    const savedTidakHadir = JSON.parse(localStorage.getItem('undian_tidak_hadir_v1'));
    if (savedTidakHadir && typeof savedTidakHadir === 'object') state.tidakHadir = savedTidakHadir;
  } catch (e) { /* data rusak — abaikan */ }
})();

function saveState() {
  try {
    localStorage.setItem('undian_sudah_v1', JSON.stringify(state.sudah));
    localStorage.setItem('undian_qty_v1', JSON.stringify({
      agen: Object.keys(AGEN_QUOTA).map(name => ({
        name,
        qty: AGEN_QUOTA[name].map(p => ({ name: p.name, qty: p.qty })),
      })),
    }));
    localStorage.setItem('undian_grand_v1', JSON.stringify(state.grandSudah));
    localStorage.setItem('undian_tidak_hadir_v1', JSON.stringify(state.tidakHadir));
  } catch (e) { /* localStorage tidak tersedia — abaikan */ }
}

const COLORS = [
  '#00d4ff', '#ff3d5a', '#00ff9d', '#ffd166', '#b44dff',
  '#ff8a3d', '#3dffd1', '#ff4da6', '#4d79ff', '#a8ff3d',
  '#ff3d3d', '#3dff8a', '#d14dff', '#ffd13d', '#3dd1ff',
];

const $ = (id) => document.getElementById(id);
const els = {
  loginScreen: $('loginScreen'),
  appHeader: $('appHeader'),
  stage: $('stage'),
  userChip: $('userChip'),
  headerSub: $('headerSub'),
  panelArea: $('panel-area'),
  panelSpin: $('panel-spin'),
  areaGrid: $('areaGrid'),
  spinLabel: $('spinLabel'),
  areaInfo: $('areaInfo'),
  wargaSelect: $('wargaSelect'),
  wargaSearch: $('wargaSearch'),
  btnPickWarga: $('btnPickWarga'),
  btnTidakHadir: $('btnTidakHadir'),
  wargaActive: $('wargaActive'),
  wargaName: $('wargaName'),
  canvasPeserta: $('canvasPeserta'),
  btnSpinPeserta: $('btnSpinPeserta'),
  btnUndoSpin: $('btnUndoSpin'),
  btnResetData: $('btnResetData'),
  resultPeserta: $('resultPeserta'),
  counterPeserta: $('counterPeserta'),
  navRow: $('navRow'),
  btnBack: $('btnBack'),
  btnTable: $('btnTable'),
  // UNDIAN UTAMA (GRAND) — sepeda listrik 17 Agu
  panelGrand: $('panelGrand'),
  grandCountInfo: $('grandCountInfo'),
  canvasGrand: $('canvasGrand'),
  btnSpinGrand: $('btnSpinGrand'),
  btnUndoGrand: $('btnUndoGrand'),
  resultGrand: $('resultGrand'),
  counterGrand: $('counterGrand'),
  btnBackGrand: $('btnBackGrand'),
  grandResults: $('grandResults'),
  grandResultsList: $('grandResultsList'),
  grandLiveName: $('grandLiveName'),
  // VERIFIKASI ZONK (owner)
  panelVerif: $('panelVerif'),
  verifWrap: $('verifWrap'),
  btnBackVerif: $('btnBackVerif'),
};

/* ---------- AUDIO ---------- */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
let tickTimer = null;
let tickLevel = 1;
let tickFading = false;
let tickStopTimer = null; // timeout untuk mulai fade SEBELUM roda berhenti
function startTicking() {
  const ctx = ensureAudio(); if (!ctx) return;
  if (tickStopTimer) { clearTimeout(tickStopTimer); tickStopTimer = null; }
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  tickLevel = 1;
  tickFading = false;
  const tick = () => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1400;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.07);
  };
  tick();
  tickTimer = setInterval(tick, 130);
}
function stopTicking() {
  if (!tickTimer || tickFading) return;
  tickFading = true;
  let _fadeSteps = 0;
  const fadeStep = () => {
    _fadeSteps++;
    tickLevel *= 0.55;
    if (_fadeSteps >= 6 || tickLevel < 0.02) {
      clearInterval(tickTimer); tickTimer = null; tickFading = false; tickLevel = 1;
      return;
    }
    const ctx = audioCtx;
    if (ctx) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 1400;
      g.gain.setValueAtTime(0.08 * tickLevel, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.07);
    }
    clearInterval(tickTimer);
    tickTimer = setInterval(fadeStep, 120 + _fadeSteps * 35);
  };
  clearInterval(tickTimer);
  tickTimer = setInterval(fadeStep, 120);
}

function playFanfare() {
  const ctx = ensureAudio(); if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    const t = ctx.currentTime + i * 0.16;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.55);
  });
}

function playZonkSound() {
  const ctx = ensureAudio(); if (!ctx) return;
  // "Womp womp" kalah: tiga nada menurun (Bb3 → G3 → Eb3)
  const notes = [233.08, 196.0, 155.56];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    const t = ctx.currentTime + i * 0.28;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.6);
  });
}

function fireConfetti() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 }, colors: ['#00d4ff', '#ff3d5a', '#00ff9d', '#ffd166'] });
    setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.6 } }), 300);
    setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.6 } }), 550);
  }
}

/* ---------- LOGIN ---------- */
$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('loginUser').value;
  const pass = $('loginPass').value;
  const k = KOORDINATOR[user];
  if (k && k.pass === pass) {
    state.user = user;
    try { localStorage.setItem('undian_session_v1', user); } catch (e) { /* abaikan */ }
    $('loginError').classList.add('hidden');
    enterApp(k);
  } else {
    $('loginError').classList.remove('hidden');
  }
});

$('btnLogout').addEventListener('click', () => {
  // Logout HANYA keluar sesi — riwayat pemenang, sisa stok hadiah, riwayat grand
  // & tanda tidak hadir TETAP tersimpan (biar tidak ada warga menang 2×).
  // Reset penuh data undian: tombol ♻️ Reset Data Undian atau URL ?reset=1.
  state.user = null; state.area = null; state.activeWarga = null;
  try {
    localStorage.removeItem('undian_session_v1');
  } catch (e) { /* abaikan */ }
  els.loginScreen.classList.remove('hidden');
  els.appHeader.classList.add('hidden');
  els.stage.classList.add('hidden');
  $('modalTable').classList.add('hidden');
  $('loginPass').value = '';
  $('loginUser').value = '';
  $('loginError').classList.add('hidden');
});

function enterApp(k) {
  els.loginScreen.classList.add('hidden');
  els.appHeader.classList.remove('hidden');
  els.stage.classList.remove('hidden');
  els.userChip.textContent = '👤 Koordinator: ' + k.nama;
  els.headerSub.textContent = 'Gebyar Koneksi Setia — Wilayah ' + k.nama + ' · Internet Merdeka';
  renderAreaPicker();
}

// Auto-restore session login (tidak perlu login ulang setelah refresh)
(function restoreSession() {
  try {
    const savedUser = localStorage.getItem('undian_session_v1');
    if (savedUser && KOORDINATOR[savedUser]) {
      state.user = savedUser;
      enterApp(KOORDINATOR[savedUser]);
    }
  } catch (e) { /* abaikan */ }
})();

/* ---------- GRAND MODE (17 AGUSTUS) ---------- */
function isGrandDay() {
  const now = new Date();
  return now.getMonth() === 7 && now.getDate() === 17; // 17 Agustus
}
function isGrandTest() {
  try { return new URLSearchParams(location.search).has('grand'); } catch (e) { return false; }
}
function grandModeEnabled() { return isGrandDay() || isGrandTest(); }

/* ---------- AREA PICKER ---------- */
function renderAreaPicker() {
  const k = KOORDINATOR[state.user];
  const agenData = DATA_PESERTA[k.agen] || {};
  const areas = Object.keys(agenData);
  els.areaGrid.innerHTML = '';

  // 🚲 Halaman khusus UNDIAN SEPEDA LISTRIK — HANYA untuk koordinator IRVAN (owner).
  // Menggabung SEMUA warga dari SEMUA koordinator dalam satu roda undian.
  if (k.role === 'owner') {
    const btnGrand = document.createElement('button');
    btnGrand.className = 'area-card area-card-grand';
    const gpLeft = GRAND_PRIZE.reduce((a, p) => a + p.qty, 0);
    btnGrand.innerHTML = `<span class="area-name">🚲 UNDIAN SEPEDA LISTRIK</span><span class="area-count">Hadiah utama · ${gpLeft ? 'tersedia' : 'SUDAH DIMENANGKAN'} · gabung semua koordinator & warga</span>`;
    btnGrand.addEventListener('click', () => openGrand());
    els.areaGrid.appendChild(btnGrand);
  }

  // Tombol verifikasi ZONK — khusus OWNER (IRVAN)
  if (k.role === 'owner') {
    const btnVerif = document.createElement('button');
    btnVerif.className = 'area-card area-card-verif';
    btnVerif.innerHTML = `<span class="area-name">🛡️ VERIFIKASI ZONK</span><span class="area-count">Cek semua warga yang wajib ZONK (global)</span>`;
    btnVerif.addEventListener('click', () => openVerif());
    els.areaGrid.appendChild(btnVerif);
  }

  areas.forEach((area) => {
    const sudahCount = getSudahCount(k.agen, area);
    const btn = document.createElement('button');
    btn.className = 'area-card';
    btn.innerHTML = `<span class="area-name">${area}</span><span class="area-count">${agenData[area].length} warga · ${sudahCount} sudah spin</span>`;
    btn.addEventListener('click', () => selectArea(area));
    els.areaGrid.appendChild(btn);
  });
  showPanel('area');
}

function getSudahCount(agen, area) {
  return (state.sudah[agen] && state.sudah[agen][area] || []).length;
}
function getSudahList(agen, area) {
  return (state.sudah[agen] && state.sudah[agen][area]) || [];
}
function getBelumList(agen, area) {
  const semua = DATA_PESERTA[agen][area] || [];
  const sudahSet = new Set(getSudahList(agen, area).map(x => x.warga));
  const tidakHadirSet = new Set((state.tidakHadir[agen] && state.tidakHadir[agen][area]) || []);
  return semua.filter(n => !sudahSet.has(n) && !tidakHadirSet.has(n));
}

/* Warga wajib zonk = tetap spin tapi dijamin TIDAK dapat hadiah.
   WAJIB_ZONK (daftar hitam) ATAU BELUM_BAYAR (belum transfer / tanda tanya) → dipaksa ZONK. */
function isWajibZonk(agen, area, nama) {
  if (!nama) return false;
  const target = nama.trim().toUpperCase();
  const wajib = (WAJIB_ZONK[agen] && WAJIB_ZONK[agen][area]) || [];
  const belumBayar = (BELUM_BAYAR[agen] && BELUM_BAYAR[agen][area]) || [];
  return wajib.some(n => n.trim().toUpperCase() === target) ||
         belumBayar.some(n => n.trim().toUpperCase() === target);
}

/* Grand prize: cek ZONK GLOBAL lintas agen — nama yang wajib ZONK di agen MANAPUN
   tidak boleh menang Sepeda Listrik (mencegah lolos via entri agen lain). */
function isWajibZonkGrand(agen, nama) {
  if (!nama) return false;
  const target = nama.trim().toUpperCase();
  // Cek semua agen × semua area (WAJIB_ZONK + BELUM_BAYAR)
  for (const a of Object.keys(WAJIB_ZONK)) {
    for (const ar of Object.keys(WAJIB_ZONK[a] || {})) {
      if ((WAJIB_ZONK[a][ar] || []).some(n => n.trim().toUpperCase() === target)) return true;
    }
  }
  for (const a of Object.keys(BELUM_BAYAR)) {
    for (const ar of Object.keys(BELUM_BAYAR[a] || {})) {
      if ((BELUM_BAYAR[a][ar] || []).some(n => n.trim().toUpperCase() === target)) return true;
    }
  }
  return false;
}

function selectArea(area) {
  state.area = area;
  state.activeWarga = null;
  els.areaInfo.textContent = `📍 ${area}`;
  els.spinLabel.textContent = 'SPIN UNDIAN — ' + area;
  renderWargaPicker();
  initWheel();
  showPanel('spin');
}

/* ---------- WARGA PICKER ---------- */
let _wargaAll = []; // daftar penuh (sebelum filter pencarian)

function renderWargaPicker() {
  const k = KOORDINATOR[state.user];
  const belum = getBelumList(k.agen, state.area);
  // Urutkan A-Z (case-insensitive) — biar dropdown rapi & mudah dicari
  _wargaAll = belum.slice().sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  // Reset pencarian saat pindah area
  if (els.wargaSearch) els.wargaSearch.value = '';
  applyWargaFilter();
  els.wargaActive.classList.add('hidden');
  els.btnPickWarga.disabled = !_wargaAll.length;
  updateCounter();
}

function applyWargaFilter() {
  const q = (els.wargaSearch ? els.wargaSearch.value : '').trim().toLowerCase();
  const filtered = q ? _wargaAll.filter(n => n.toLowerCase().includes(q)) : _wargaAll;
  const sel = els.wargaSelect;
  sel.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = ''; opt.textContent = filtered.length ? '— Pilih nama warga —' : (q ? '— Tidak ditemukan —' : '— Semua warga sudah spin! —');
  sel.appendChild(opt);
  // Nama tampil BERSIH tanpa keterangan ZONK — status zonk tetap diam-diam
  filtered.forEach(n => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    sel.appendChild(o);
  });
  els.btnPickWarga.disabled = !filtered.length;
}

if (els.wargaSearch) {
  els.wargaSearch.addEventListener('input', applyWargaFilter);
}

els.btnPickWarga.addEventListener('click', () => {
  const nama = els.wargaSelect.value;
  if (!nama) return;
  state.activeWarga = nama;
  els.wargaName.textContent = nama;
  els.wargaActive.classList.remove('hidden');
  els.resultPeserta.textContent = '';
  els.resultPeserta.classList.remove('win', 'zonk');
  els.btnSpinPeserta.disabled = false;
  initWheel(); // roda menyesuaikan: wajib zonk → roda ZONK
});

/* Tandai Tidak Hadir (door-to-door): warga dicoret dari daftar belum spin,
   dipersist ke localStorage, tidak muncul di dropdown setelah refresh. */
els.btnTidakHadir.addEventListener('click', () => {
  const k = KOORDINATOR[state.user];
  if (!k || !state.area) return;
  const nama = state.activeWarga || els.wargaSelect.value;
  if (!nama) {
    els.resultPeserta.textContent = '⚠️ Pilih dulu warga yang tidak hadir.';
    els.resultPeserta.classList.remove('win', 'zonk');
    return;
  }
  if (!state.tidakHadir[k.agen]) state.tidakHadir[k.agen] = {};
  if (!state.tidakHadir[k.agen][state.area]) state.tidakHadir[k.agen][state.area] = [];
  if (!state.tidakHadir[k.agen][state.area].includes(nama)) {
    state.tidakHadir[k.agen][state.area].push(nama);
  }
  saveState(); // persist tanda tidak hadir
  // bersihkan warga aktif + refresh daftar (warga yang ditandai hilang dari dropdown)
  state.activeWarga = null;
  els.wargaActive.classList.add('hidden');
  els.wargaSelect.value = '';
  els.resultPeserta.textContent = `🚫 ${nama} ditandai TIDAK HADIR.`;
  els.resultPeserta.classList.remove('win', 'zonk');
  renderWargaPicker();
  initWheel();
});

/* ---------- WHEEL (HADIAH) ---------- */
let wheel = null;
let wheelCbId = null;

/* ---------- PENGAMAN: animasi roda MACET ----------
   Kalau animasi gagal jalan / callbackFinished tidak pernah dipanggil, tombol
   spin terkunci sampai halaman di-refresh. Watchdog ini memulihkan UI
   (tombol aktif lagi, tick berhenti) TANPA mencatat hasil palsu. */
let spinWatchdog = null;
function clearSpinWatchdog() {
  if (spinWatchdog) { clearTimeout(spinWatchdog); spinWatchdog = null; }
}
function armSpinWatchdog(ms, wheelObj, isGrand) {
  clearSpinWatchdog();
  spinWatchdog = setTimeout(() => {
    spinWatchdog = null;
    if (!state.spinning) return; // normal — callback sudah jalan
    state.spinning = false;
    stopTicking();
    try { if (wheelObj) wheelObj.stopAnimation(false); } catch (e) { /* abaikan */ }
    const wrapP = els.canvasPeserta ? els.canvasPeserta.parentElement : null;
    if (wrapP) wrapP.classList.remove('spinning');
    const wrapG = els.canvasGrand ? els.canvasGrand.parentElement : null;
    if (wrapG) wrapG.classList.remove('spinning');
    if (isGrand) {
      els.btnSpinGrand.disabled = false;
      els.resultGrand.textContent = '⚠️ Animasi roda macet — tombol PUTAR sudah aktif lagi, silakan putar ulang.';
      els.resultGrand.classList.remove('win', 'zonk');
    } else {
      els.btnSpinPeserta.disabled = !state.activeWarga;
      els.resultPeserta.textContent = '⚠️ Animasi roda macet — silakan putar ulang (hasil tidak dicatat).';
      els.resultPeserta.classList.remove('win', 'zonk');
    }
  }, ms);
}
/* Bersihkan callback lama supaya tidak menumpuk di window (leak kecil) */
function dropOldCallback(id) {
  if (id) { try { delete window[id]; } catch (e) { /* abaikan */ } }
}

/* ZONK di roda biasa: segmen abu-abu slate selang-seling (50:50 dengan hadiah) */
const ZONK_SEGMENTS = 8;
const ZONK_COLORS = ['#cbd5e1', '#94a3b8']; // abu-abu slate — ZONK tetap abu-abu sesuai arahan Bang

function getAvailablePrizes(agen) {
  return (AGEN_QUOTA[agen] || []).filter(p => p.qty > 0);
}
function getAgenPrizeTotal(agen) {
  return (AGEN_QUOTA[agen] || []).reduce((a, p) => a + (p.qty0 != null ? p.qty0 : p.qty), 0);
}
/* restore sisa stok hadiah dari localStorage — stok TIDAK reset saat refresh */
try {
  const savedQty = JSON.parse(localStorage.getItem('undian_qty_v1'));
  if (savedQty && Array.isArray(savedQty.agen)) {
    savedQty.agen.forEach(sa => {
      const agen = AGEN_QUOTA[sa.name];
      if (agen && Array.isArray(sa.qty)) {
        sa.qty.forEach(sq => {
          const p = agen.find(x => x.name === sq.name);
          if (p && typeof sq.qty === 'number') p.qty = sq.qty;
        });
      }
    });
  }
} catch (e) { /* data rusak — abaikan */ }
/* snapshot kuota awal — supaya counter "dari X unit" tetap (tidak ikut turun saat qty berkurang) */
Object.keys(AGEN_QUOTA).forEach(agen => {
  AGEN_QUOTA[agen].forEach(p => { p.qty0 = p.qty; });
});

function initWheel(opts = {}) {
  if (!opts.preserveResult) clearResult();
  const k = KOORDINATOR[state.user];
  const prizes = getAvailablePrizes(k.agen);

  // Probabilitas menang DINAMIS = sisaHadiah / sisaPeserta (cap 0.85 agar tidak pernah 100%).
  const sisaHadiah = prizes.reduce((a, p) => a + p.qty, 0);
  // Peluang SEIMBANG per agen: sisaPeserta = jumlah BELUM SPIN di SEMUA area milik agen.
  const sisaPeserta = Object.keys(DATA_PESERTA[k.agen] || {}).reduce((a, ar) => a + getBelumList(k.agen, ar).length, 0);
  const winProb = (sisaHadiah > 0 && sisaPeserta > 0) ? Math.min(sisaHadiah / sisaPeserta, 0.85) : 0;

  // FONT: semakin banyak segmen, semakin kecil teks.
  // DESAIN FIFTY-FIFTY: N_had segmen hadiah + N_had segmen ZONK = 2×N_had total.
  // Visual 50:50 (hadiah berwarna 180°, ZONK abu-abu 180°), peluang menang TETAP
  // dihitung dari sisaHadiah/sisaPeserta (bukan 50%) — diarahkan via stopAngle di spinWheel().
  const unitList = [];
  prizes.forEach(p => { for (let i = 0; i < p.qty; i++) unitList.push(p.name); });
  const nHad = unitList.length;

  let segs = [];
  if (nHad <= 0) {
    // Hadiah habis → roda 12 segmen ZONK penuh. Spin TETAP BISA — hasil pasti ZONK.
    const emptySegSize = 360 / 12;
    for (let i = 0; i < 12; i++) {
      segs.push({
        fillStyle: ZONK_COLORS[i % ZONK_COLORS.length],
        text: 'ZONK',
        zonk: true,
        textFontSize: 13,
        textFillStyle: '#ffffff',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: emptySegSize,
      });
    }
  } else {
    // Fifty-Fifty: nHad segmen Hadiah + nHad segmen ZONK, selang-seling 1:1.
    const totalSeg = nHad * 2;
    const segSize = 360 / totalSeg;
    const fs = totalSeg > 30 ? 10 : totalSeg > 20 ? 12 : 14;

    // Warna per NAMA hadiah — semua unit senama SEWARNA (konsisten, mudah dikenali).
    const byName = {};
    unitList.forEach(nm => { (byName[nm] = byName[nm] || []).push(nm); });
    const names = Object.keys(byName).sort((a, b) => byName[b].length - byName[a].length);
    const nameColor = {};
    names.forEach((nm, i) => { nameColor[nm] = COLORS[i % COLORS.length]; });

    // Anti-berdampingan untuk hadiah senama: round-robin antar kelompok.
    const orderedUnits = [];
    let maxLen = Math.max(...names.map(n => byName[n].length));
    for (let r = 0; r < maxLen; r++) {
      names.forEach(nm => {
        if (byName[nm][r] !== undefined) orderedUnits.push(byName[nm][r]);
      });
    }

    // Selang-seling: [Hadiah, ZONK, Hadiah, ZONK, ...] — visual 50:50, hadiah tidak pernah berdampingan.
    segs = [];
    for (let i = 0; i < nHad; i++) {
      segs.push({
        fillStyle: nameColor[orderedUnits[i]],
        text: orderedUnits[i],
        zonk: false,
        textFontSize: fs,
        textFillStyle: '#ffffff',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: segSize,
      });
      segs.push({
        fillStyle: ZONK_COLORS[i % ZONK_COLORS.length],
        text: 'ZONK',
        zonk: true,
        textFontSize: fs,
        textFillStyle: '#64748b',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: segSize,
      });
    }
  }

  dropOldCallback(wheelCbId);
  wheelCbId = 'wheelCb' + Date.now();
  window[wheelCbId] = function () {
    stopTicking();
    clearSpinWatchdog(); // animasi selesai normal — matikan pengaman
    const wrap = els.canvasPeserta ? els.canvasPeserta.parentElement : null;
    if (wrap) wrap.classList.remove('spinning');
    const seg = wheel.getIndicatedSegment();
    const prizeName = seg ? seg.text : null;
    // Segmen ZONK punya text 'ZONK' (+ flag zonk:true) — guard aman untuk keduanya.
    if (!prizeName && !(seg && seg.zonk)) return;
    // Hasil = SEGMEN YANG DITUNJUK JARUM (tanda atas). Warga wajib ZONK
    // diarahkan berhenti di segmen ZONK via stopAngle di spinWheel() —
    // TIDAK ada pemaksaan hasil di callback (biar visual = hasil).
    if (prizeName === 'ZONK' || seg.zonk) {
      recordWinner('ZONK');
      els.resultPeserta.textContent = '😬 ' + state.activeWarga + ' — ZONK, coba lagi tahun depan!';
      els.resultPeserta.classList.add('zonk');
      playZonkSound(); // 🔊 suara kalah
      state.activeWarga = null;
      els.wargaActive.classList.add('hidden');
      updateCounter();
      renderWargaPicker();
      els.btnSpinPeserta.disabled = false;
      state.spinning = false;
      return;
    }
    const prize = (AGEN_QUOTA[k.agen] || []).find(p => p.name === prizeName);
    if (prize && prize.qty > 0) {
      prize.qty--;   // kurangi stok hadiah
      saveState();   // simpan sisa stok segera setelah berkurang
      recordWinner(prizeName);
      els.resultPeserta.textContent = '🎁 ' + state.activeWarga + ' mendapatkan ' + prizeName + '!';
      els.resultPeserta.classList.add('win');
      playFanfare(); fireConfetti();
    } else {
      // Jarum menunjuk hadiah tapi stok sudah habis → jujur ZONK (tidak menang).
      recordWinner('ZONK');
      els.resultPeserta.textContent = '😬 ' + state.activeWarga + ' — ZONK, coba lagi tahun depan!';
      els.resultPeserta.classList.add('zonk');
      playZonkSound();
    }
    state.activeWarga = null;
    els.wargaActive.classList.add('hidden');
    updateCounter();
    renderWargaPicker();
    els.btnSpinPeserta.disabled = false;
    state.spinning = false;
  };

  wheel = new Winwheel({
    canvasId: 'canvasPeserta',
    numSegments: segs.length,
    outerRadius: 258,
    centerX: 280,
    centerY: 280,
    strokeStyle: '#0d1526',
    lineWidth: 2,
    segments: segs,
    animation: {
      type: 'spinToStop',
      duration: 7.5,
      spins: 10 + Math.floor(Math.random() * 6), // putaran maksimal 10-15x
      easing: 'Power4.easeOut', // mulai cepat, berhenti lembut (didukung winwheel.min.js/TweenMax)
      callbackFinished: wheelCbId + '()',
    },
    pointerAngle: 0,
  });
  wheel.draw();
  const wrap = els.canvasPeserta ? els.canvasPeserta.parentElement : null;
  if (wrap) wrap.classList.remove('spinning');
  updateCounter();
}

function recordWinner(prizeName) {
  const k = KOORDINATOR[state.user];
  if (!state.sudah[k.agen]) state.sudah[k.agen] = {};
  if (!state.sudah[k.agen][state.area]) state.sudah[k.agen][state.area] = [];
  state.sudah[k.agen][state.area].push({ warga: state.activeWarga, hadiah: prizeName });
  saveState(); // simpan riwayat pemenang + sisa stok ke localStorage
}

function spinWheel() {
  ensureAudio();
  wheel.stopAnimation(false);
  wheel.animation.duration = 7.5;
  wheel.animation.spins = 10 + Math.floor(Math.random() * 6);

  // 🎯 DESAIN FIFTY-FIFTY: roda visual 50:50, tapi peluang menang TETAP = sisaHadiah/sisaPeserta.
  // Putusan menang/kalah di-skenario DULU (Math.random() < winProb), lalu stopAngle diarahkan
  // ke segmen hadiah (menang) atau segmen ZONK (kalah) — jarum berhenti di segmen itu,
  // callback membaca hasil dari segmen yang ditunjuk (visual = hasil, tanpa pemaksaan).
  const k = KOORDINATOR[state.user];
  const prizes = getAvailablePrizes(k.agen);
  const sisaHadiah = prizes.reduce((a, p) => a + p.qty, 0);
  const sisaPeserta = Object.keys(DATA_PESERTA[k.agen] || {}).reduce((a, ar) => a + getBelumList(k.agen, ar).length, 0);
  const winProb = (sisaHadiah > 0 && sisaPeserta > 0) ? Math.min(sisaHadiah / sisaPeserta, 0.85) : 0;

  const isWajibKalah = isWajibZonk(k.agen, state.area, state.activeWarga);
  const isMenang = !isWajibKalah && sisaHadiah > 0 && (Math.random() < winProb);

  let targetSegList = [];
  // Winwheel segments 1-indexed (index 0 = dummy).
  for (let i = 1; i < wheel.segments.length; i++) {
    const seg = wheel.segments[i];
    if (isMenang) {
      if (!seg.zonk && seg.text !== 'ZONK') {
        const p = prizes.find(x => x.name === seg.text);
        if (p && p.qty > 0) targetSegList.push(seg);
      }
    } else {
      if (seg.zonk || seg.text === 'ZONK') targetSegList.push(seg);
    }
  }
  // Fallback: kalau tidak ada kandidat (mis. stok berubah), putar acak penuh.
  if (!targetSegList.length) targetSegList = wheel.segments.slice(1);

  const chosenSeg = targetSegList[Math.floor(Math.random() * targetSegList.length)];
  // Jitter kecil di dalam batas segmen (margin 30% dari tepi) supaya tidak selalu mentok tengah.
  const segSpan = chosenSeg.endAngle - chosenSeg.startAngle;
  const jitter = (Math.random() - 0.5) * (segSpan * 0.6);
  wheel.animation.stopAngle = ((chosenSeg.startAngle + chosenSeg.endAngle) / 2) + jitter;

  wheel.rotationAngle = 0;
  wheel.draw();
  const wrap = els.canvasPeserta ? els.canvasPeserta.parentElement : null;
  if (wrap) { wrap.classList.remove('spinning'); void wrap.offsetWidth; wrap.classList.add('spinning'); }
  startTicking();
  // 🔊 Fade tick MULAI sebelum roda berhenti: timeout 5.8s (roda berhenti 7.5s,
  // fade selesai ±7.1s) → suara mati total & terfade SEBELUM roda berhenti.
  tickStopTimer = setTimeout(() => { tickStopTimer = null; stopTicking(); }, 5800);
  wheel.startAnimation();
  armSpinWatchdog(12000, wheel, false); // pengaman kalau animasi roda biasa macet
}

els.btnSpinPeserta.addEventListener('click', () => {
  if (state.spinning || !wheel || !state.activeWarga) return;
  state.spinning = true;
  els.btnSpinPeserta.disabled = true;
  clearResult();
  spinWheel();
});

/* ---------- BATALKAN (UNDO) SPIN TERAKHIR — koreksi operator ----------
   Salah tekan / salah orang sering terjadi di lapangan. Batalkan hasil spin
   TERAKHIR di area ini: nama kembali ke dropdown, stok hadiah dikembalikan,
   entri riwayat dihapus. Tidak menyentuh area lain. */
function undoLastSpin() {
  const k = KOORDINATOR[state.user];
  if (!k || !state.area || state.spinning) return;
  const list = getSudahList(k.agen, state.area); // referensi langsung ke state.sudah
  if (!list.length) {
    els.resultPeserta.textContent = '⚠️ Belum ada spin di area ini untuk dibatalkan.';
    els.resultPeserta.classList.remove('win', 'zonk');
    return;
  }
  const last = list.pop();
  // Kembalikan stok hadiah kalau hasilnya hadiah (ZONK tidak mengurangi stok)
  if (last.hadiah && last.hadiah !== 'ZONK') {
    const p = (AGEN_QUOTA[k.agen] || []).find(x => x.name === last.hadiah);
    if (p && typeof p.qty === 'number') p.qty += 1;
  }
  saveState();
  state.activeWarga = null;
  els.wargaActive.classList.add('hidden');
  els.wargaSelect.value = '';
  renderWargaPicker();
  initWheel();
  els.btnSpinPeserta.disabled = true; // wajib pilih warga lagi
  els.resultPeserta.textContent = '↩️ Dibatalkan: ' + last.warga + ' (' + (last.hadiah === 'ZONK' ? 'ZONK' : last.hadiah) + ') — nama muncul lagi di daftar.';
  els.resultPeserta.classList.remove('win', 'zonk');
}
if (els.btnUndoSpin) els.btnUndoSpin.addEventListener('click', undoLastSpin);

/* ---------- RESET PENUH DATA UNDIAN (terkunci konfirmasi) ----------
   Dipisah dari tombol Keluar supaya logout tidak menghapus riwayat/stok.
   Setara dengan membuka URL ?reset=1. */
function resetAllData() {
  if (state.spinning) return;
  const ok = window.confirm('♻️ Reset SEMUA data undian di perangkat ini?\n\n• Riwayat pemenang terhapus\n• Stok hadiah kembali penuh\n• Riwayat sepeda listrik terhapus\n• Tanda tidak hadir terhapus\n\nTidak bisa dibatalkan. Lanjutkan?');
  if (!ok) return;
  try {
    localStorage.removeItem('undian_sudah_v1');
    localStorage.removeItem('undian_qty_v1');
    localStorage.removeItem('undian_grand_v1');
    localStorage.removeItem('undian_tidak_hadir_v1');
  } catch (e) { /* abaikan */ }
  window.location.replace(window.location.pathname);
}
if (els.btnResetData) els.btnResetData.addEventListener('click', resetAllData);

/* ---------- HELPERS ---------- */
function showPanel(name) {
  els.panelArea.classList.toggle('hidden', name !== 'area');
  els.panelSpin.classList.toggle('hidden', name !== 'spin');
  els.navRow.classList.toggle('hidden', name !== 'spin');
  if (els.panelGrand) els.panelGrand.classList.toggle('hidden', name !== 'grand');
  if (els.panelVerif) els.panelVerif.classList.toggle('hidden', name !== 'verif');
}
function clearResult() {
  els.resultPeserta.textContent = '';
  els.resultPeserta.classList.remove('win', 'zonk');
}
function updateCounter() {
  const k = KOORDINATOR[state.user];
  const belum = getBelumList(k.agen, state.area);
  els.counterPeserta.textContent = `Belum spin: ${belum.length} warga`;
}

els.btnBack.addEventListener('click', () => {
  if (state.spinning) return;
  renderAreaPicker();
});

/* ============================================================
   UNDIAN UTAMA (GRAND) — SEPEDA LISTRIK — 17 AGUSTUS
   Terpusat: SEMUA warga dari SEMUA koordinator dalam SATU roda
   ============================================================ */
let grandWheel = null;
let grandCbId = null;
let grandLiveTimer = null;

/* Nama LIVE mengikuti jarum selama spin — highlight pemenang saat berhenti */
function startGrandLive() {
  if (grandLiveTimer) clearInterval(grandLiveTimer);
  grandLiveTimer = setInterval(() => {
    if (!grandWheel || !els.grandLiveName) return;
    const seg = grandWheel.getIndicatedSegment();
    if (seg && seg.warga) els.grandLiveName.textContent = seg.warga.nama;
  }, 120);
}
function stopGrandLive(finalSeg) {
  if (grandLiveTimer) { clearInterval(grandLiveTimer); grandLiveTimer = null; }
  if (els.grandLiveName) {
    if (finalSeg && finalSeg.warga) {
      els.grandLiveName.textContent = finalSeg.warga.nama;
      els.grandLiveName.classList.add('winner');
    } else {
      els.grandLiveName.textContent = '— Tekan PUTAR —';
      els.grandLiveName.classList.remove('winner');
    }
  }
}

function getAllWarga() {
  const rows = [];
  Object.keys(DATA_PESERTA).forEach(agen => {
    Object.keys(DATA_PESERTA[agen] || {}).forEach(area => {
      (DATA_PESERTA[agen][area] || []).forEach(nama => {
        rows.push({ nama, agen, area });
      });
    });
  });
  return rows;
}

function openGrand() {
  state.grandMode = true;
  if (els.grandCountInfo) els.grandCountInfo.textContent = getBelumGrand().length;
  if (els.grandLiveName) { els.grandLiveName.textContent = '— Tekan PUTAR —'; els.grandLiveName.classList.remove('winner'); }
  initGrandWheel();
  renderGrandResults();
  showPanel('grand');
}

function renderGrandPicker() {}

function getBelumGrand() {
  const sudahSet = new Set(state.grandSudah.map(x => x.warga + '|' + x.agen));
  return getAllWarga().filter(r => !sudahSet.has(r.nama + '|' + r.agen) && !isWajibZonkGrand(r.agen, r.nama));
}

function getGrandSegments() {
  const list = getBelumGrand(); // [{nama, agen, area}]
  const segs = [];
  if (!list.length) return segs;
  const segSize = 360 / list.length;
  const fs = list.length > 300 ? 4 : list.length > 150 ? 5 : 7;
  list.slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }))
    .forEach((r, i) => {
      segs.push({
        fillStyle: COLORS[i % COLORS.length],
        text: r.nama,
        zonk: false,
        textFontSize: fs,
        textFillStyle: '#ffffff',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: segSize,
        warga: r, // simpan referensi warga di segmen
      });
    });
  return segs;
}

function initGrandWheel(opts = {}) {
  const segs = getGrandSegments();
  const gpLeft = GRAND_PRIZE.reduce((a, p) => a + p.qty, 0);
  if (!gpLeft) {
    if (!opts.preserveResult) {
      els.resultGrand.textContent = '🏆 Sepeda Listrik SUDAH DIMENANGKAN!';
      els.resultGrand.classList.add('win');
    }
    els.btnSpinGrand.disabled = true;
    updateGrandCounter();
    return;
  }
  els.btnSpinGrand.disabled = false;
  dropOldCallback(grandCbId);
  grandCbId = 'grandCb' + Date.now();
  window[grandCbId] = function () {
    stopTicking();
    clearSpinWatchdog(); // animasi selesai normal — matikan pengaman
    const gwrap = els.canvasGrand ? els.canvasGrand.parentElement : null;
    if (gwrap) gwrap.classList.remove('spinning');
    const seg = grandWheel.getIndicatedSegment();
    if (!seg || !seg.warga) return;
    stopGrandLive(seg);
    const pemenang = seg.warga;
    const gp = GRAND_PRIZE.find(p => p.name === 'Sepeda Listrik');
    if (gp) gp.qty--;
    state.grandSudah.push({ warga: pemenang.nama, agen: pemenang.agen, area: pemenang.area, hadiah: 'Sepeda Listrik' });
    saveState();
    renderGrandResults();
    els.resultGrand.textContent = '🏆 SELAMAT! ' + pemenang.nama + ' (' + pemenang.area + ') mendapatkan SEPEDA LISTRIK!';
    els.resultGrand.classList.add('win');
    playFanfare(); fireConfetti();
    setTimeout(fireConfetti, 400);
    updateGrandCounter();
    els.btnSpinGrand.disabled = true; // sepeda sudah menang — tidak bisa spin lagi
    state.spinning = false;
  };
  grandWheel = new Winwheel({
    canvasId: 'canvasGrand',
    numSegments: segs.length,
    outerRadius: 258,
    centerX: 280,
    centerY: 280,
    strokeStyle: 'transparent',
    lineWidth: 0,
    segments: segs,
    animation: {
      type: 'spinToStop',
      duration: 6,
      spins: 8 + Math.floor(Math.random() * 5),
      easing: 'Power4.easeOut',
      callbackFinished: grandCbId + '()',
    },
    pointerAngle: 0,
  });
  grandWheel.draw();
  const gwrap = els.canvasGrand ? els.canvasGrand.parentElement : null;
  if (gwrap) gwrap.classList.remove('spinning');
  updateGrandCounter();
}

function spinGrandWheel() {
  const pool = getBelumGrand();
  const gpLeft = GRAND_PRIZE.reduce((a, p) => a + p.qty, 0);
  if (!pool.length || gpLeft <= 0) {
    state.spinning = false;
    els.btnSpinGrand.disabled = true;
    return;
  }

  ensureAudio();
  grandWheel.stopAnimation(false);
  grandWheel.animation.duration = 6;
  grandWheel.animation.spins = 8 + Math.floor(Math.random() * 5);

  // Ambil semua segmen warga valid dari roda
  const validSegments = grandWheel.segments.slice(1).filter(seg => seg && seg.warga);
  if (!validSegments.length) return;

  const chosenSeg = validSegments[Math.floor(Math.random() * validSegments.length)];
  const segSpan = chosenSeg.endAngle - chosenSeg.startAngle;
  const jitter = (Math.random() - 0.5) * (segSpan * 0.6);
  grandWheel.animation.stopAngle = ((chosenSeg.startAngle + chosenSeg.endAngle) / 2) + jitter;

  grandWheel.rotationAngle = 0;
  grandWheel.draw();
  const gwrap = els.canvasGrand ? els.canvasGrand.parentElement : null;
  if (gwrap) { gwrap.classList.remove('spinning'); void gwrap.offsetWidth; gwrap.classList.add('spinning'); }
  startTicking();
  // 🔊 Fade tick MULAI sebelum roda berhenti (roda berhenti 6s, fade mulai 4.2s, senyap sebelum berhenti).
  tickStopTimer = setTimeout(() => { tickStopTimer = null; stopTicking(); }, 4200);
  if (els.grandLiveName) {
    els.grandLiveName.classList.remove('winner');
    els.grandLiveName.textContent = '…';
  }
  startGrandLive();
  grandWheel.startAnimation();
  armSpinWatchdog(11000, grandWheel, true); // pengaman kalau animasi roda grand macet
}

els.btnSpinGrand.addEventListener('click', () => {
  if (state.spinning || !grandWheel) return;
  state.spinning = true;
  els.btnSpinGrand.disabled = true;
  els.resultGrand.textContent = '';
  els.resultGrand.classList.remove('win', 'zonk');
  spinGrandWheel();
});

function updateGrandCounter() {
  const gpLeft = GRAND_PRIZE.reduce((a, p) => a + p.qty, 0);
  const sisa = getBelumGrand().length;
  if (els.grandCountInfo) els.grandCountInfo.textContent = sisa;
  els.counterGrand.textContent = `Grand (otomatis): ${sisa} warga ikut undian${gpLeft ? '' : ' · 🏆 SUDAH MENANG!'}`;
}

/* Daftar hasil spin — setiap nama yang kena jarum muncul di ATAS halaman */
function renderGrandResults() {
  const list = els.grandResultsList;
  if (!list) return;
  if (!state.grandSudah.length) {
    if (els.grandResults) els.grandResults.classList.add('hidden');
    list.innerHTML = '';
    return;
  }
  if (els.grandResults) els.grandResults.classList.remove('hidden');
  list.innerHTML = state.grandSudah.map((h, i) =>
    '<div class="grand-result-item"><span class="gr-idx">' + (i + 1) + '.</span><span class="gr-name">🏆 ' + h.warga + '</span><span class="gr-lok">(' + (h.area || h.agen) + ')</span><span class="gr-prize">— ' + h.hadiah + '</span></div>'
  ).join('');
}

els.btnBackGrand.addEventListener('click', () => {
  if (state.spinning) return;
  state.grandMode = false;
  renderAreaPicker();
});

/* ---------- BATALKAN (UNDO) PEMENANG SEPEDA LISTRIK TERAKHIR ----------
   Salah klik saat panggung = sepeda listrik jatuh ke orang yang salah.
   Batalkan pemenang terakhir: stok sepeda kembali, nama ikut undian lagi. */
function undoLastGrand() {
  if (state.spinning) return;
  if (!state.grandSudah.length) {
    els.resultGrand.textContent = '⚠️ Belum ada pemenang sepeda listrik untuk dibatalkan.';
    els.resultGrand.classList.remove('win', 'zonk');
    return;
  }
  const last = state.grandSudah.pop();
  const gp = GRAND_PRIZE.find(p => p.name === 'Sepeda Listrik');
  if (gp) gp.qty = Math.min(1, gp.qty + 1);
  saveState();
  renderGrandResults();
  if (els.grandLiveName) {
    els.grandLiveName.textContent = '— Tekan PUTAR —';
    els.grandLiveName.classList.remove('winner');
  }
  initGrandWheel(); // roda dibangun ulang tanpa pemenang → tombol PUTAR aktif lagi
  els.resultGrand.textContent = '↩️ Dibatalkan: ' + last.warga + ' (' + (last.area || last.agen) + ') — ikut undian lagi.';
  els.resultGrand.classList.remove('win', 'zonk');
}
if (els.btnUndoGrand) els.btnUndoGrand.addEventListener('click', undoLastGrand);

/* ============================================================
   VERIFIKASI ZONK — KHUSUS OWNER (IRVAN)
   Menampilkan SEMUA warga SEMUA koordinator + penanda ZONK
   ============================================================ */
function openVerif() {
  renderVerif();
  showPanel('verif');
}

function renderVerif() {
  const wrap = els.verifWrap;
  let html = '';
  Object.keys(DATA_PESERTA).forEach(agen => {
    Object.keys(DATA_PESERTA[agen] || {}).forEach(area => {
      const warga = DATA_PESERTA[agen][area] || [];
      html += `<h4 class="table-area-title">📍 ${area} <span class="verif-agen">(${agen})</span></h4>`;
      html += `<table class="table-papar"><thead><tr><th>Warga</th><th>ZONK</th><th>Status</th><th>Hadiah</th></tr></thead><tbody>`;
      warga.forEach(n => {
        const isZonk = isWajibZonk(agen, area, n);
        const sudah = (state.sudah[agen] && state.sudah[agen][area] || []).find(s => s.warga === n);
        html += `<tr class="${isZonk ? 'row-zonk' : sudah ? 'row-done' : 'row-pending'}">
          <td>${n}</td>
          <td>${isZonk ? '⚡ WAJIB ZONK' : '—'}</td>
          <td>${sudah ? '✅ Sudah' : '⏳ Belum'}</td>
          <td>${sudah ? (sudah.hadiah === 'ZONK' ? '😬 ZONK' : sudah.hadiah) : '—'}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    });
  });
  wrap.innerHTML = html || '<p class="hint">Belum ada data.</p>';
}

els.btnBackVerif.addEventListener('click', () => {
  renderAreaPicker();
});

/* ---------- TABEL PEMAPARAN ---------- */
els.btnTable.addEventListener('click', () => {
  renderTable('area');
  $('modalTable').classList.remove('hidden');
});
$('btnTableArea').addEventListener('click', () => renderTable('area'));
$('btnTableAll').addEventListener('click', () => renderTable('all'));
$('btnTableClose').addEventListener('click', () => $('modalTable').classList.add('hidden'));

function renderTable(mode) {
  const k = KOORDINATOR[state.user];
  const wrap = $('tableWrap');
  let html = '';
  if (mode === 'area') {
    html = buildTable(k.agen, state.area);
  } else {
    const agenData = DATA_PESERTA[k.agen] || {};
    Object.keys(agenData).forEach(area => {
      html += `<h4 class="table-area-title">📍 ${area}</h4>` + buildTable(k.agen, area);
    });
  }
  wrap.innerHTML = html || '<p class="hint">Belum ada data.</p>';
}

function buildTable(agen, area) {
  const semua = DATA_PESERTA[agen][area] || [];
  const sudah = getSudahList(agen, area);
  const sudahMap = {};
  sudah.forEach(s => { sudahMap[s.warga] = s.hadiah; });
  let rows = '';
  semua.forEach(n => {
    const h = sudahMap[n];
    const isZonk = h === 'ZONK';
    rows += `<tr class="${isZonk ? 'row-zonk' : h ? 'row-done' : 'row-pending'}">
      <td>${n}</td>
      <td>${h ? '✅ Sudah' : '⏳ Belum'}</td>
      <td>${isZonk ? '😬 ZONK' : (h || '—')}</td>
    </tr>`;
  });
  return `<div class="table-wrap-inner"><table class="table-papar">
    <thead><tr><th>Warga</th><th>Status</th><th>Hadiah</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

/* ---------- INIT: tampilkan login ---------- */
