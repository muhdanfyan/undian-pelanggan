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
    { name: 'Setrika', qty: 1 },
    { name: 'Kipas Angin Mini', qty: 1 },
    { name: 'Jam Dinding', qty: 1 },
    { name: 'Baju Kaos', qty: 1 },
    { name: 'Gelas Mugs', qty: 3 },
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
const GRAND_ZONK_SEGMENTS = 4; // jumlah segmen ZONK di roda grand

/* ---------- STATE ---------- */
const state = {
  user: null,        // username koordinator yang login
  area: null,        // area yang sedang dikunjungi
  activeWarga: null, // warga yang sedang spin
  sudah: {},         // { agen: { area: [ {warga, hadiah} ] } } — sudah spin
  tidakHadir: {},    // { agen: { area: [nama, ...] } } — warga ditandai TIDAK HADIR (door-to-door)
  spinning: false,
  grandMode: false,  // mode undian utama (sepeda listrik 17 Agu)
  grandWarga: null,  // { nama, agen } warga yang spin grand
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
    if (Array.isArray(savedGrand)) state.grandSudah = savedGrand;
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
  resultPeserta: $('resultPeserta'),
  counterPeserta: $('counterPeserta'),
  navRow: $('navRow'),
  btnBack: $('btnBack'),
  btnTable: $('btnTable'),
  // UNDIAN UTAMA (GRAND) — sepeda listrik 17 Agu
  panelGrand: $('panelGrand'),
  grandSelect: $('grandSelect'),
  grandSearch: $('grandSearch'),
  btnPickGrand: $('btnPickGrand'),
  grandWargaActive: $('grandWargaActive'),
  grandWargaName: $('grandWargaName'),
  canvasGrand: $('canvasGrand'),
  btnSpinGrand: $('btnSpinGrand'),
  resultGrand: $('resultGrand'),
  counterGrand: $('counterGrand'),
  btnBackGrand: $('btnBackGrand'),
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
    $('loginError').classList.add('hidden');
    enterApp(k);
  } else {
    $('loginError').classList.remove('hidden');
  }
});

$('btnLogout').addEventListener('click', () => {
  state.user = null; state.area = null; state.activeWarga = null;
  state.sudah = {};
  state.tidakHadir = {};
  // logout = reset undian: hapus semua data persistensi
  try {
    localStorage.removeItem('undian_sudah_v1');
    localStorage.removeItem('undian_qty_v1');
    localStorage.removeItem('undian_grand_v1');
    localStorage.removeItem('undian_tidak_hadir_v1');
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

  // Tombol undian utama (grand) — muncul 17 Agu atau saat test ?grand=1
  if (grandModeEnabled()) {
    const btnGrand = document.createElement('button');
    btnGrand.className = 'area-card area-card-grand';
    const gpLeft = GRAND_PRIZE.reduce((a, p) => a + p.qty, 0);
    btnGrand.innerHTML = `<span class="area-name">🎁 UNDIAN UTAMA</span><span class="area-count">Sepeda Listrik · ${gpLeft ? 'tersedia' : 'SUDAH DIMENANGKAN'} · terpusat semua warga</span>`;
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
let _grandAll = []; // daftar penuh grand (sebelum filter pencarian)

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

  wheelCbId = 'wheelCb' + Date.now();
  window[wheelCbId] = function () {
    stopTicking();
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
}

els.btnSpinPeserta.addEventListener('click', () => {
  if (state.spinning || !wheel || !state.activeWarga) return;
  state.spinning = true;
  els.btnSpinPeserta.disabled = true;
  clearResult();
  spinWheel();
});

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
  state.grandWarga = null;
  renderGrandPicker();
  initGrandWheel();
  showPanel('grand');
}

function renderGrandPicker() {
  const sudahSet = new Set(state.grandSudah.map(x => x.warga + '|' + x.agen));
  const rows = getAllWarga().filter(r => !sudahSet.has(r.nama + '|' + r.agen));
  // Urutkan A-Z (case-insensitive)
  _grandAll = rows.slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  if (els.grandSearch) els.grandSearch.value = '';
  applyGrandFilter();
  els.grandWargaActive.classList.add('hidden');
  els.btnPickGrand.disabled = !_grandAll.length;
  updateGrandCounter();
}

function getBelumGrand() {
  const sudahSet = new Set(state.grandSudah.map(x => x.warga + '|' + x.agen));
  return getAllWarga().filter(r => !sudahSet.has(r.nama + '|' + r.agen));
}

function applyGrandFilter() {
  const q = (els.grandSearch ? els.grandSearch.value : '').trim().toLowerCase();
  const filtered = q ? _grandAll.filter(r => r.nama.toLowerCase().includes(q)) : _grandAll;
  const sel = els.grandSelect;
  sel.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = '';
  opt.textContent = filtered.length ? '— Pilih warga (semua koordinator) —' : (q ? '— Tidak ditemukan —' : '— Semua warga sudah spin grand! —');
  sel.appendChild(opt);
  // Nama tampil BERSIH tanpa keterangan ZONK
  filtered.forEach(r => {
    const o = document.createElement('option');
    o.value = r.nama + '|' + r.agen;
    o.textContent = `${r.nama} · ${r.agen}`;
    sel.appendChild(o);
  });
  els.btnPickGrand.disabled = !filtered.length;
}

if (els.grandSearch) {
  els.grandSearch.addEventListener('input', applyGrandFilter);
}

els.btnPickGrand.addEventListener('click', () => {
  const val = els.grandSelect.value;
  if (!val) return;
  const [nama, agen] = val.split('|');
  state.grandWarga = { nama, agen };
  els.grandWargaName.textContent = nama + ' (' + agen + ')';
  els.grandWargaActive.classList.remove('hidden');
  els.resultGrand.textContent = '';
  els.resultGrand.classList.remove('win', 'zonk');
  els.btnSpinGrand.disabled = false;
  initGrandWheel();
});

function getGrandSegments() {
  const gp = GRAND_PRIZE.filter(p => p.qty > 0);
  const segs = [];
  if (gp.length) {
    // FIFTY-FIFTY grand: selang-seling [Sepeda Listrik, ZONK, Sepeda Listrik, ZONK] — visual 50:50.
    const segSize = 90;
    for (let i = 0; i < 2; i++) {
      segs.push({
        fillStyle: '#ffd700',
        text: '🏆 Sepeda Listrik',
        textFontSize: 22,
        textFillStyle: '#5b4a00',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: segSize,
      });
      segs.push({
        fillStyle: '#94a3b8',
        text: 'ZONK',
        textFontSize: 30,
        textFillStyle: '#ffffff',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: segSize,
      });
    }
  }
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
  grandCbId = 'grandCb' + Date.now();
  window[grandCbId] = function () {
    stopTicking();
    const gwrap = els.canvasGrand ? els.canvasGrand.parentElement : null;
    if (gwrap) gwrap.classList.remove('spinning');
    const seg = grandWheel.getIndicatedSegment();
    const prizeName = seg ? seg.text.replace(/^🏆\s*/, '') : null;
    if (!prizeName) return;
    // 🛡️ Safety net GRAND: warga wajib ZONK global — hasil dipaksa ZONK meski jarum
    // sempat menunjuk Sepeda Listrik (anti-bocor jika stopAngle gagal/off).
    const isWajibKalahCb = isWajibZonkGrand(state.grandWarga ? state.grandWarga.agen : null, state.grandWarga ? state.grandWarga.nama : null);
    if (prizeName === 'ZONK' || isWajibKalahCb) {
      state.grandSudah.push({ warga: state.grandWarga.nama, agen: state.grandWarga.agen, hadiah: 'ZONK' });
      saveState(); // simpan riwayat grand (ZONK)
      els.resultGrand.textContent = '😬 ZONK — coba lagi tahun depan!';
      els.resultGrand.classList.add('zonk');
      playZonkSound(); // 🔊 suara kalah
      state.grandWarga = null;
      els.grandWargaActive.classList.add('hidden');
      updateGrandCounter();
      renderGrandPicker();
      els.btnSpinGrand.disabled = false;
      state.spinning = false;
      return;
    }
    const gp = GRAND_PRIZE.find(p => p.name === prizeName);
    if (gp) gp.qty--; // sepeda listrik habis — tidak bisa dimenangkan lagi
    state.grandSudah.push({ warga: state.grandWarga.nama, agen: state.grandWarga.agen, hadiah: prizeName });
    saveState(); // simpan riwayat grand + stok grand
    els.resultGrand.textContent = '🏆 SELAMAT! ' + prizeName + ' untuk ' + state.grandWarga.nama + '!';
    els.resultGrand.classList.add('win');
    playFanfare(); fireConfetti();
    setTimeout(fireConfetti, 400);
    state.grandWarga = null;
    els.grandWargaActive.classList.add('hidden');
    updateGrandCounter();
    renderGrandPicker();
    els.btnSpinGrand.disabled = true; // sepeda sudah menang — tidak bisa spin lagi
    state.spinning = false;
  };
  grandWheel = new Winwheel({
    canvasId: 'canvasGrand',
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
  ensureAudio();
  grandWheel.stopAnimation(false);
  grandWheel.animation.duration = 7.5;
  grandWheel.animation.spins = 10 + Math.floor(Math.random() * 6);

  // 🎯 GRAND FIFTY-FIFTY: visual 50:50, tapi peluang menang TETAP = 1/sisaPesertaGrand.
  // Putusan menang/kalah di-skenario dulu, lalu stopAngle diarahkan ke segmen target.
  const sisaGrand = getBelumGrand().length;
  const gpLeft = GRAND_PRIZE.reduce((a, p) => a + p.qty, 0);
  const winProb = (gpLeft > 0 && sisaGrand > 0) ? Math.min(1 / sisaGrand, 0.85) : 0;
  // 🛡️ FIX GRAND: warga wajib ZONK (di agennya sendiri ATAU agen lain) TIDAK boleh menang Sepeda Listrik.
  const isWajibKalahGrand = isWajibZonkGrand(state.grandWarga ? state.grandWarga.agen : null, state.grandWarga ? state.grandWarga.nama : null);
  const isMenang = !isWajibKalahGrand && gpLeft > 0 && (Math.random() < winProb);

  let targetSegList = [];
  for (let i = 1; i < grandWheel.segments.length; i++) {
    const seg = grandWheel.segments[i];
    if (isMenang) {
      if (!seg.zonk && seg.text !== 'ZONK') targetSegList.push(seg);
    } else {
      if (seg.zonk || seg.text === 'ZONK') targetSegList.push(seg);
    }
  }
  if (!targetSegList.length) targetSegList = grandWheel.segments.slice(1);
  const chosenSeg = targetSegList[Math.floor(Math.random() * targetSegList.length)];
  const segSpan = chosenSeg.endAngle - chosenSeg.startAngle;
  const jitter = (Math.random() - 0.5) * (segSpan * 0.6);
  grandWheel.animation.stopAngle = ((chosenSeg.startAngle + chosenSeg.endAngle) / 2) + jitter;

  grandWheel.rotationAngle = 0;
  grandWheel.draw();
  const gwrap = els.canvasGrand ? els.canvasGrand.parentElement : null;
  if (gwrap) { gwrap.classList.remove('spinning'); void gwrap.offsetWidth; gwrap.classList.add('spinning'); }
  startTicking();
  // 🔊 Fade tick MULAI sebelum roda berhenti (sama seperti roda biasa).
  tickStopTimer = setTimeout(() => { tickStopTimer = null; stopTicking(); }, 5800);
  grandWheel.startAnimation();
}

els.btnSpinGrand.addEventListener('click', () => {
  if (state.spinning || !grandWheel || !state.grandWarga) return;
  state.spinning = true;
  els.btnSpinGrand.disabled = true;
  els.resultGrand.textContent = '';
  els.resultGrand.classList.remove('win', 'zonk');
  spinGrandWheel();
});

function updateGrandCounter() {
  const gpLeft = GRAND_PRIZE.reduce((a, p) => a + p.qty, 0);
  const sudahSet = new Set(state.grandSudah.map(x => x.warga + '|' + x.agen));
  const total = getAllWarga().length;
  const sisa = total - sudahSet.size;
  els.counterGrand.textContent = `Grand (terpusat): ${sisa} dari ${total} warga belum spin${gpLeft ? '' : ' · 🏆 SUDAH MENANG!'}`;
}

els.btnBackGrand.addEventListener('click', () => {
  if (state.spinning) return;
  state.grandMode = false;
  renderAreaPicker();
});

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
