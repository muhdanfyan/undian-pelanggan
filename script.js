/* ============================================================
   UNDIAN INTERNET MERDEKA — 10 AGUSTUS 2026
   Login Koordinator → Pilih Area → Pilih Warga → Spin HADIAH
   Tabel pemaparan: siapa sudah/belum spin + hadiah apa
   ============================================================ */

/* ---------- KREDENSIAL KOORDINATOR (HARDCODED) ---------- */
const KOORDINATOR = {
  aldin:  { nama: 'ALDIN',  pass: 'merdeka2026', agen: 'ALDIN' },
  munir:  { nama: 'MUNIR',  pass: 'merdeka2026', agen: 'MUNIR' },
  nasrun: { nama: 'NASRUN', pass: 'merdeka2026', agen: 'NASRUN' },
};

/* ---------- DAFTAR HADIAH (total 62 unit) ---------- */
const PRIZE_TOTAL = 62;
const PRIZES = [
  { name: 'Sepeda Listrik', qty: 1 },
  { name: 'Rice Cooker', qty: 3 },
  { name: 'Blender', qty: 3 },
  { name: 'Setrika', qty: 6 },
  { name: 'Kipas Angin Mini', qty: 10 },
  { name: 'Jam Dinding', qty: 12 },
  { name: 'Baju Kaos', qty: 12 },
  { name: 'Gelas Mugs', qty: 15 },
];

/* ---------- STATE ---------- */
const state = {
  user: null,        // username koordinator yang login
  area: null,        // area yang sedang dikunjungi
  activeWarga: null, // warga yang sedang spin
  sudah: {},         // { agen: { area: [ {warga, hadiah} ] } } — sudah spin
  spinning: false,
};

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
  btnPickWarga: $('btnPickWarga'),
  wargaActive: $('wargaActive'),
  wargaName: $('wargaName'),
  canvasPeserta: $('canvasPeserta'),
  btnSpinPeserta: $('btnSpinPeserta'),
  resultPeserta: $('resultPeserta'),
  counterPeserta: $('counterPeserta'),
  navRow: $('navRow'),
  btnBack: $('btnBack'),
  btnTable: $('btnTable'),
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

/* ---------- AREA PICKER ---------- */
function renderAreaPicker() {
  const k = KOORDINATOR[state.user];
  const agenData = DATA_PESERTA[k.agen] || {};
  const areas = Object.keys(agenData);
  els.areaGrid.innerHTML = '';
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
  return semua.filter(n => !sudahSet.has(n));
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
function renderWargaPicker() {
  const k = KOORDINATOR[state.user];
  const belum = getBelumList(k.agen, state.area);
  const sel = els.wargaSelect;
  sel.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = ''; opt.textContent = belum.length ? '— Pilih nama warga —' : '— Semua warga sudah spin! —';
  sel.appendChild(opt);
  belum.forEach(n => {
    const o = document.createElement('option');
    o.value = n; o.textContent = n;
    sel.appendChild(o);
  });
  els.wargaActive.classList.add('hidden');
  els.btnPickWarga.disabled = !belum.length;
  updateCounter();
}

els.btnPickWarga.addEventListener('click', () => {
  const nama = els.wargaSelect.value;
  if (!nama) return;
  state.activeWarga = nama;
  els.wargaName.textContent = nama;
  els.wargaActive.classList.remove('hidden');
  els.resultPeserta.textContent = '';
  els.resultPeserta.classList.remove('win');
  els.btnSpinPeserta.disabled = false;
});

/* ---------- WHEEL (HADIAH) ---------- */
let wheel = null;
let wheelCbId = null;

function getAvailablePrizes() {
  return PRIZES.filter(p => p.qty > 0);
}

function initWheel() {
  const prizes = getAvailablePrizes();
  clearResult();
  if (!prizes.length) {
    els.resultPeserta.textContent = '✅ Semua hadiah sudah habis!';
    els.btnSpinPeserta.disabled = true;
    updateCounter();
    return;
  }
  const fs = prizes.length > 12 ? 12 : prizes.length > 8 ? 14 : 17;
  const segs = prizes.map((p, i) => ({
    fillStyle: COLORS[i % COLORS.length],
    text: p.name,
    textFontSize: fs,
    textFillStyle: '#ffffff',
    textFontFamily: 'Rajdhani',
    textFontWeight: 'bold',
    textOrientation: 'horizontal',
    textAlignment: 'center',
  }));

  wheelCbId = 'wheelCb' + Date.now();
  window[wheelCbId] = function () {
    stopTicking();
    const seg = wheel.getIndicatedSegment();
    const prizeName = seg ? seg.text : null;
    if (!prizeName) return;
    const prize = PRIZES.find(p => p.name === prizeName);
    if (prize) {
      prize.qty--;   // kurangi stok hadiah
      recordWinner(prizeName);
    }
    els.resultPeserta.textContent = '🎁 ' + prizeName;
    els.resultPeserta.classList.add('win');
    playFanfare(); fireConfetti();
    state.activeWarga = null;
    els.wargaActive.classList.add('hidden');
    updateCounter();
    initWheel();   // rebuild roda — hadiah habis tidak muncul lagi
    renderWargaPicker();
    els.btnSpinPeserta.disabled = false;
    state.spinning = false;
  };

  wheel = new Winwheel({
    canvasId: 'canvasPeserta',
    numSegments: prizes.length,
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
}
function clearResult() {
  els.resultPeserta.textContent = '';
  els.resultPeserta.classList.remove('win');
}
function updateCounter() {
  const k = KOORDINATOR[state.user];
  const belum = getBelumList(k.agen, state.area);
  const totalPrizes = PRIZES.reduce((a, p) => a + p.qty, 0);
  els.counterPeserta.textContent = `Belum spin: ${belum.length} warga · Hadiah tersisa: ${totalPrizes} dari ${PRIZE_TOTAL} unit`;
}

els.btnBack.addEventListener('click', () => {
  if (state.spinning) return;
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
    rows += `<tr class="${h ? 'row-done' : 'row-pending'}">
      <td>${n}</td>
      <td>${h ? '✅ Sudah' : '⏳ Belum'}</td>
      <td>${h || '—'}</td>
    </tr>`;
  });
  return `<div class="table-wrap-inner"><table class="table-papar">
    <thead><tr><th>Warga</th><th>Status</th><th>Hadiah</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

/* ---------- INIT: tampilkan login ---------- */
