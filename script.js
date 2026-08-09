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
function startTicking() {
  const ctx = ensureAudio(); if (!ctx) return;
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
function stopTicking() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

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

/* ZONK di roda biasa: 8 segmen, warna abu-abu bervariasi supaya tidak mencolok */
const ZONK_SEGMENTS = 8;
const ZONK_COLORS = ['#94a3b8', '#8896a8', '#7d8b9d', '#a3b0bf', '#8b98a8', '#9aa7b5', '#8493a4', '#99a6b4'];

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
  // Diterapkan lewat bobot segmen Winwheel (size = derajat busur).
  const sisaHadiah = prizes.reduce((a, p) => a + p.qty, 0);
  // Peluang SEIMBANG per agen: sisaPeserta = jumlah BELUM SPIN di SEMUA area milik agen
  // (bukan hanya area aktif) — proporsi sisaHadiah/sisaPeserta jadi konsisten antar area
  // (ALDIN 7/67 ≈ 10,4%, MUNIR 20/194, NASRUN 20/196, IRVAN 14/134 ≈ 10,3-10,4%).
  const sisaPeserta = Object.keys(DATA_PESERTA[k.agen] || {}).reduce((a, ar) => a + getBelumList(k.agen, ar).length, 0);
  const winProb = (sisaHadiah > 0 && sisaPeserta > 0) ? Math.min(sisaHadiah / sisaPeserta, 0.85) : 0;

  const fs = prizes.length > 12 ? 12 : prizes.length > 8 ? 14 : 17;
  let segs;

  if (winProb <= 0) {
    // Hadiah habis (atau tidak ada peserta tersisa) → roda PENUH ZONK.
    // Spin TETAP BISA — hasil pasti ZONK (callback sudah handle text 'ZONK').
    segs = [];
    for (let i = 0; i < ZONK_SEGMENTS; i++) {
      segs.push({
        fillStyle: ZONK_COLORS[i % ZONK_COLORS.length],
        text: 'ZONK',
        textFontSize: fs,
        textFillStyle: '#ffffff',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: 360 / ZONK_SEGMENTS, // 45° per segmen → total 360°
      });
    }
  } else {
    // Roda normal: segmen hadiah (bobot 1) + 8 segmen ZONK berbobot.
    // Bobot relatif (per tugas): zonkTotalSize = (nHadiah/winProb) - nHadiah
    // → dikonversi ke derajat: hadiah = 360·winProb/nHadiah, ZONK = 360·(1-winProb)/8.
    const prizeDeg = 360 * winProb / prizes.length;
    const zonkDeg = 360 * (1 - winProb) / ZONK_SEGMENTS;
    const prizeSegs = prizes.map((p, i) => ({
      fillStyle: COLORS[i % COLORS.length],
      text: p.name,
      textFontSize: fs,
      textFillStyle: '#ffffff',
      textFontFamily: 'Rajdhani',
      textFontWeight: 'bold',
      textOrientation: 'horizontal',
      textAlignment: 'center',
      size: prizeDeg,
    }));
    const zonkSegs = [];
    for (let i = 0; i < ZONK_SEGMENTS; i++) {
      zonkSegs.push({
        fillStyle: ZONK_COLORS[i % ZONK_COLORS.length],
        text: 'ZONK',
        textFontSize: fs,
        textFillStyle: '#ffffff',
        textFontFamily: 'Rajdhani',
        textFontWeight: 'bold',
        textOrientation: 'horizontal',
        textAlignment: 'center',
        size: zonkDeg,
      });
    }
    // INTERLEAVE: hadiah TERSebar merata di antara ZONK (tidak mengumpul satu sisi).
    // Posisi hadiah = Math.round(i * total / nHadiah) → jarak antar hadiah merata.
    const total = prizes.length + ZONK_SEGMENTS;
    segs = new Array(total);
    prizes.forEach((_, i) => {
      let pos = Math.round(i * total / prizes.length);
      // Safety: kalau posisi sudah terisi (dobel), geser ke slot kosong terdekat.
      while (segs[pos] !== undefined) {
        let shifted = false;
        for (let d = 1; d < total; d++) {
          const fwd = (pos + d) % total, bwd = (pos - d + total) % total;
          if (segs[fwd] === undefined) { pos = fwd; shifted = true; break; }
          if (segs[bwd] === undefined) { pos = bwd; shifted = true; break; }
        }
        if (!shifted) break;
      }
      segs[pos] = prizeSegs[i];
    });
    // Slot kosong sisanya diisi segmen ZONK berurutan.
    let zi = 0;
    for (let i = 0; i < total; i++) {
      if (segs[i] === undefined) segs[i] = zonkSegs[zi++ % ZONK_SEGMENTS];
    }
  }

  wheelCbId = 'wheelCb' + Date.now();
  window[wheelCbId] = function () {
    stopTicking();
    const isZonkWarga = isWajibZonk(k.agen, state.area, state.activeWarga);
    const seg = wheel.getIndicatedSegment();
    const prizeName = seg ? seg.text : null;
    if (!prizeName) return;
    // Peserta wajib ZONK: meskipun jarum menunjuk hadiah, hasil DIPAKSA ZONK
    if (prizeName === 'ZONK' || isZonkWarga) {
      recordWinner('ZONK');
      els.resultPeserta.textContent = '😬 ZONK — belum beruntung!';
      els.resultPeserta.classList.add('zonk');
      state.activeWarga = null;
      els.wargaActive.classList.add('hidden');
      updateCounter();
      initWheel({ preserveResult: true });
      renderWargaPicker();
      els.btnSpinPeserta.disabled = false;
      state.spinning = false;
      return;
    }
    const prize = (AGEN_QUOTA[k.agen] || []).find(p => p.name === prizeName);
    if (prize) {
      prize.qty--;   // kurangi stok hadiah
      saveState();   // simpan sisa stok segera setelah berkurang
      recordWinner(prizeName);
    }
    els.resultPeserta.textContent = '🎁 ' + prizeName;
    els.resultPeserta.classList.add('win');
    playFanfare(); fireConfetti();
    state.activeWarga = null;
    els.wargaActive.classList.add('hidden');
    updateCounter();
    initWheel({ preserveResult: true });   // rebuild roda — hadiah habis tidak muncul lagi
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
      duration: 6,
      spins: 7 + Math.floor(Math.random() * 5),
      easing: 'Power4.easeOut', // mulai cepat, melambat dramatis (didukung winwheel.min.js/TweenMax)
      callbackFinished: wheelCbId + '()',
    },
    pointerAngle: 90,
  });
  wheel.draw();
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
  wheel.animation.spins = 7 + Math.floor(Math.random() * 6);
  wheel.rotationAngle = 0;
  wheel.draw();
  startTicking();
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
    segs.push({
      fillStyle: '#ffd700',
      text: '🏆 Sepeda Listrik',
      textFontSize: 22,
      textFillStyle: '#5b4a00',
      textFontFamily: 'Rajdhani',
      textFontWeight: 'bold',
      textOrientation: 'horizontal',
      textAlignment: 'center',
    });
  }
  for (let i = 0; i < GRAND_ZONK_SEGMENTS; i++) {
    segs.push({
      fillStyle: '#374151',
      text: 'ZONK',
      textFontSize: 30,
      textFillStyle: '#ffffff',
      textFontFamily: 'Rajdhani',
      textFontWeight: 'bold',
      textOrientation: 'horizontal',
      textAlignment: 'center',
    });
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
    const seg = grandWheel.getIndicatedSegment();
    const prizeName = seg ? seg.text.replace(/^🏆\s*/, '') : null;
    if (!prizeName) return;
    if (prizeName === 'ZONK') {
      state.grandSudah.push({ warga: state.grandWarga.nama, agen: state.grandWarga.agen, hadiah: 'ZONK' });
      saveState(); // simpan riwayat grand (ZONK)
      els.resultGrand.textContent = '😬 ZONK — belum beruntung!';
      els.resultGrand.classList.add('zonk');
      state.grandWarga = null;
      els.grandWargaActive.classList.add('hidden');
      updateGrandCounter();
      renderGrandPicker();
      initGrandWheel();
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
    initGrandWheel({ preserveResult: true }); // jangan timpa teks SELAMAT!
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
      duration: 6,
      spins: 7 + Math.floor(Math.random() * 5),
      callbackFinished: grandCbId + '()',
    },
    pointerAngle: 90,
  });
  grandWheel.draw();
  updateGrandCounter();
}

function spinGrandWheel() {
  ensureAudio();
  grandWheel.stopAnimation(false);
  grandWheel.animation.spins = 7 + Math.floor(Math.random() * 6);
  grandWheel.rotationAngle = 0;
  grandWheel.draw();
  startTicking();
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
