/* ============================================================
   UNDIAN INTERNET MERDEKA — 10 AGUSTUS 2026
   Login Koordinator → Pilih Area → Warga Tekan Spin
   Pemenang otomatis dikeluarkan dari putaran berikutnya
   ============================================================ */

/* ---------- KREDENSIAL KOORDINATOR (HARDCODED) ----------
   Ganti password di sini kalau mau. Format: username -> {nama, pass, agen}
*/
const KOORDINATOR = {
  aldin:  { nama: 'ALDIN',  pass: 'merdeka2026', agen: 'ALDIN' },
  munir:  { nama: 'MUNIR',  pass: 'merdeka2026', agen: 'MUNIR' },
  nasrun: { nama: 'NASRUN', pass: 'merdeka2026', agen: 'NASRUN' },
};

/* ---------- STATE ---------- */
const state = {
  user: null,        // username koordinator yang login
  area: null,        // area yang sedang dikunjungi
  pool: [],          // nama peserta area yang BELUM dapat hadiah
  winners: [],       // semua pemenang
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
  canvasPeserta: $('canvasPeserta'),
  btnSpinPeserta: $('btnSpinPeserta'),
  resultPeserta: $('resultPeserta'),
  counterPeserta: $('counterPeserta'),
  navRow: $('navRow'),
  winnersPanel: $('winnersPanel'),
  winnersList: $('winnersList'),
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
  state.user = null; state.area = null; state.pool = []; state.winners = [];
  els.winnersList.innerHTML = '';
  els.loginScreen.classList.remove('hidden');
  els.appHeader.classList.add('hidden');
  els.stage.classList.add('hidden');
  els.winnersPanel.classList.add('hidden');
  $('loginPass').value = '';
  $('loginUser').value = '';
  $('loginError').classList.add('hidden');
});

function enterApp(k) {
  els.loginScreen.classList.add('hidden');
  els.appHeader.classList.remove('hidden');
  els.stage.classList.remove('hidden');
  els.winnersPanel.classList.remove('hidden');
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
    const btn = document.createElement('button');
    btn.className = 'area-card';
    btn.innerHTML = `<span class="area-name">${area}</span><span class="area-count">${agenData[area].length} warga</span>`;
    btn.addEventListener('click', () => selectArea(area, agenData[area]));
    els.areaGrid.appendChild(btn);
  });
  showPanel('area');
}

function selectArea(area, names) {
  state.area = area;
  state.pool = [...names];          // salin nama — belum ada yang menang
  els.areaInfo.textContent = `📍 ${area} — ${state.pool.length} warga siap undian`;
  els.spinLabel.textContent = 'SPIN UNDIAN — ' + area;
  initWheel();
  showPanel('spin');
}

/* ---------- WHEEL ---------- */
let wheel = null;
let wheelCbId = null;

function initWheel() {
  const names = state.pool;
  clearResult();
  if (!names.length) {
    els.resultPeserta.textContent = '✅ Semua warga sudah dapat hadiah!';
    els.btnSpinPeserta.disabled = true;
    updateCounter();
    return;
  }
  // Font sesuai jumlah segmen
  const fs = names.length > 80 ? 11 : names.length > 40 ? 13 : names.length > 20 ? 15 : 17;
  const segs = names.map((label, i) => ({
    fillStyle: COLORS[i % COLORS.length],
    text: String(label),
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
    const winner = seg ? seg.text : null;
    if (!winner) return;
    els.resultPeserta.textContent = '🏆 ' + winner;
    els.resultPeserta.classList.add('win');
    playFanfare(); fireConfetti();
    // HAPUS pemenang dari pool — tidak muncul lagi di putaran berikutnya
    state.pool = state.pool.filter(n => n !== winner);
    addWinner(winner);
    updateCounter();
    els.btnSpinPeserta.disabled = false;
    state.spinning = false;
  };

  wheel = new Winwheel({
    canvasId: 'canvasPeserta',
    numSegments: names.length,
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
  els.btnSpinPeserta.disabled = false;
  updateCounter();
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
  if (state.spinning || !wheel || !state.pool.length) return;
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
  const sisa = state.pool.length;
  const total = (DATA_PESERTA[KOORDINATOR[state.user].agen][state.area] || []).length;
  els.counterPeserta.textContent = `Belum dapat hadiah: ${sisa} dari ${total} warga`;
}
function addWinner(name) {
  const k = KOORDINATOR[state.user];
  state.winners.push({ name, agen: k.agen, area: state.area });
  const li = document.createElement('li');
  li.innerHTML = `${name} <span class="area">— ${k.agen} / ${state.area}</span>`;
  els.winnersList.appendChild(li);
}

els.btnBack.addEventListener('click', () => {
  if (state.spinning) return;
  renderAreaPicker();
});

/* ---------- INIT: tampilkan login ---------- */
// Tidak ada init otomatis — semua dimulai dari login screen.
