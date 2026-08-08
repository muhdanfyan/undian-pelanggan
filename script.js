/* ============================================================
   UNDIAN INTERNET MERDEKA — 10 AGUSTUS 2026
   3 Tahap: Agen → Area → Pemenang (Winwheel.js + Web Audio)
   ============================================================ */

/* ---------- STATE ---------- */
const state = {
  agen: null,
  area: null,
  spinning: false,
  winners: [],
};

const COLORS = [
  '#00d4ff', '#ff3d5a', '#00ff9d', '#ffd166', '#b44dff',
  '#ff8a3d', '#3dffd1', '#ff4da6', '#4d79ff', '#a8ff3d',
  '#ff3d3d', '#3dff8a', '#d14dff', '#ffd13d', '#3dd1ff',
];
const NEUTRAL = ['#0d1526', '#14213d'];

const $ = (id) => document.getElementById(id);
const panels = {
  agen: $('panel-agen'),
  area: $('panel-area'),
  peserta: $('panel-peserta'),
};

/* ---------- AUDIO (Web Audio API — tanpa file) ---------- */
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

/* ---------- WHEEL BUILDER ---------- */
function segmentLabel(text, fontSize) {
  return { text: text, textFontSize: fontSize || 15, textFillStyle: '#ffffff', textFontFamily: 'Rajdhani', textFontWeight: 'bold', textOrientation: 'horizontal', textAlignment: 'center' };
}

let wheelIdCounter = 0;
const wheelCallbacks = {};
function buildWheel(canvasId, items, onFinish) {
  const count = items.length;
  const segs = items.map((label, i) => ({
    fillStyle: COLORS[i % COLORS.length],
    ...segmentLabel(String(label)),
  }));

  // Winwheel versi npm memanggil callback via eval() — harus STRING,
  // bukan fungsi (eval(fungsi) hanya mengembalikan, tidak mengeksekusi).
  const id = 'wheelCb' + (++wheelIdCounter);
  wheelCallbacks[id] = onFinish;
  window[id] = function () {
    const cb = wheelCallbacks[id];
    if (cb) cb();
  };

  return new Winwheel({
    canvasId,
    numSegments: count,
    outerRadius: 258,
    centerX: 280,
    centerY: 280,
    textFontSize: 16,
    textFillStyle: '#ffffff',
    strokeStyle: '#0d1526',
    lineWidth: 2,
    segments: segs,
    animation: {
      type: 'spinToStop',
      duration: 6,
      spins: 7 + Math.floor(Math.random() * 5),
      callbackFinished: id + '()',
    },
    pointerAngle: 90, // pointer di atas (12 jam)
  });
}

function spinWheel(wheel) {
  ensureAudio();
  wheel.stopAnimation(false);
  wheel.animation.spins = 7 + Math.floor(Math.random() * 6);
  wheel.rotationAngle = 0;
  wheel.draw();
  startTicking();
  wheel.startAnimation();
}

function indicatedSegment(wheel) {
  // Pointer di atas = 12 jam (rotationAngle 0 di atas, pointerAngle 90)
  const seg = wheel.getIndicatedSegment();
  return seg ? seg.text : null;
}

/* ---------- SHOW / HIDE ---------- */
function showPanel(name) {
  Object.keys(panels).forEach(k => panels[k].classList.add('hidden'));
  panels[name].classList.remove('hidden');
  $('navRow').classList.toggle('hidden', name === 'agen');
}
function clearResult(id) {
  const el = $(id);
  el.textContent = '';
  el.classList.remove('win');
}

/* ---------- TAHAP 1: AGEN ---------- */
let wheelAgen = null;
function initAgen() {
  clearResult('resultAgen');
  const agenNames = Object.keys(DATA_PESERTA);
  wheelAgen = buildWheel('canvasAgen', agenNames, () => {
    stopTicking();
    const agen = indicatedSegment(wheelAgen);
    state.agen = agen;
    const el = $('resultAgen');
    el.textContent = '✅ Agen terpilih: ' + agen;
    el.classList.add('win');
    playFanfare(); fireConfetti();
    setTimeout(() => { initArea(); showPanel('area'); }, 1200);
  });
  wheelAgen.draw();
  $('btnSpinAgen').disabled = false;
}

$('btnSpinAgen').addEventListener('click', () => {
  if (state.spinning || !wheelAgen) return;
  state.spinning = true;
  $('btnSpinAgen').disabled = true;
  clearResult('resultAgen');
  spinWheel(wheelAgen);
});

/* ---------- TAHAP 2: AREA ---------- */
let wheelArea = null;
function initArea() {
  clearResult('resultArea');
  $('resultArea').textContent = 'Area dari agen: ' + state.agen;
  const areas = Object.keys(DATA_PESERTA[state.agen] || {});
  if (!areas.length) return;
  wheelArea = buildWheel('canvasArea', areas, () => {
    stopTicking();
    state.area = indicatedSegment(wheelArea);
    const el = $('resultArea');
    el.textContent = '✅ Area terpilih: ' + state.area;
    el.classList.add('win');
    playFanfare(); fireConfetti();
    setTimeout(() => { initPeserta(); showPanel('peserta'); }, 1200);
  });
  wheelArea.draw();
  $('btnSpinArea').disabled = false;
}

$('btnSpinArea').addEventListener('click', () => {
  if (state.spinning || !wheelArea) return;
  state.spinning = true;
  $('btnSpinArea').disabled = true;
  clearResult('resultArea');
  spinWheel(wheelArea);
});

/* ---------- TAHAP 3: PESERTA ---------- */
let wheelPeserta = null;
function initPeserta() {
  clearResult('resultPeserta');
  const names = DATA_PESERTA[state.agen][state.area] || [];
  $('resultPeserta').textContent = names.length + ' pelanggan siap diputar…';
  // Roda besar: jika > 40 nama, kecilkan font
  const fs = names.length > 80 ? 11 : names.length > 40 ? 13 : 16;
  wheelPeserta = buildWheel('canvasPeserta', names, () => {
    stopTicking();
    const winner = indicatedSegment(wheelPeserta);
    const el = $('resultPeserta');
    el.textContent = '🏆 ' + winner;
    el.classList.add('win');
    playFanfare(); fireConfetti();
    addWinner(winner);
    $('btnSpinPeserta').disabled = false;
    state.spinning = false;
  });
  wheelPeserta.textFontSize = fs;
  wheelPeserta.draw();
  $('btnSpinPeserta').disabled = false;
}

$('btnSpinPeserta').addEventListener('click', () => {
  if (state.spinning || !wheelPeserta) return;
  state.spinning = true;
  $('btnSpinPeserta').disabled = true;
  clearResult('resultPeserta');
  spinWheel(wheelPeserta);
});

/* ---------- WINNERS LIST ---------- */
function addWinner(name) {
  state.winners.push({ name, agen: state.agen, area: state.area });
  const li = document.createElement('li');
  li.innerHTML = `${name} <span class="area">— ${state.agen} / ${state.area}</span>`;
  $('winnersList').appendChild(li);
}

/* ---------- NAVIGATION ---------- */
$('btnBack').addEventListener('click', () => {
  if (state.spinning) return;
  if (!panels.peserta.classList.contains('hidden')) {
    showPanel('area');
  } else if (!panels.area.classList.contains('hidden')) {
    showPanel('agen');
  }
});

$('btnNew').addEventListener('click', () => {
  if (state.spinning) return;
  state.agen = null; state.area = null;
  wheelAgen = null; wheelArea = null; wheelPeserta = null;
  initAgen();
  showPanel('agen');
});

/* ---------- UPLOAD CSV ---------- */
$('btnUpload').addEventListener('click', () => {
  $('modalUpload').classList.remove('hidden');
  $('csvStatus').textContent = '';
});
$('btnCsvCancel').addEventListener('click', () => $('modalUpload').classList.add('hidden'));

$('btnCsvOk').addEventListener('click', () => {
  const file = $('fileCsv').files[0];
  if (!file) { $('csvStatus').textContent = '⚠️ Pilih file CSV dulu.'; return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = parseCsv(e.target.result);
      if (!Object.keys(parsed).length) throw new Error('Data kosong');
      window.DATA_PESERTA = parsed;
      $('csvStatus').textContent = '✅ ' + countTotal(parsed) + ' peserta dimuat dari CSV.';
      $('modalUpload').classList.add('hidden');
      // Reset ke tahap 1 dengan data baru
      state.agen = null; state.area = null;
      wheelAgen = null; wheelArea = null; wheelPeserta = null;
      initAgen();
      showPanel('agen');
    } catch (err) {
      $('csvStatus').textContent = '❌ Gagal: ' + err.message;
    }
  };
  reader.readAsText(file);
});

function parseCsv(text) {
  const data = {};
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  lines.forEach((line, idx) => {
    if (idx === 0 && /agen/i.test(line) && /area/i.test(line) && /nama/i.test(line)) return; // header
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 3) return;
    const [agen, area, name] = parts;
    if (!name) return;
    if (!data[agen]) data[agen] = {};
    if (!data[agen][area]) data[agen][area] = [];
    data[agen][area].push(name);
  });
  return data;
}
function countTotal(data) {
  let n = 0;
  Object.values(data).forEach(a => Object.values(a).forEach(names => n += names.length));
  return n;
}

/* ---------- INIT ---------- */
initAgen();
