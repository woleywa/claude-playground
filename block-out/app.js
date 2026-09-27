const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));

const COLORS = {
  pink: '#EC4899', yellow: '#EAB308', sky: '#38BDF8', lime: '#84CC16', blue: '#2563EB',
  purple: '#9333EA', green: '#10B981', red: '#EF4444', orange: '#F97316', '?': '#475569',
};
const NAMES = {
  pink: 'Pink', yellow: 'Yellow', sky: 'Sky', lime: 'Lime', blue: 'Blue',
  purple: 'Purple', green: 'Green', red: 'Red', orange: 'Orange', '?': 'Unknown',
};
const SIDE = { L: 'left', R: 'right', T: 'top', B: 'bottom' };
const ARROW = { L: '◀', R: '▶', T: '▲', B: '▼' };

const PRESETS = {
  l198: {
    W: 7, H: 10, tickPerCell: false,
    pieces: [
      {id: 1, color: "pink", r: 0, c: 0, h: 2, w: 1, key: false, lock: 0, ice: 0},
      {id: 2, color: "yellow", r: 0, c: 1, h: 2, w: 1, key: false, lock: 0, ice: 0},
      {id: 3, color: "sky", r: 0, c: 2, h: 2, w: 1, key: false, lock: 0, ice: 0},
      {id: 4, color: "lime", r: 0, c: 3, h: 2, w: 1, key: false, lock: 0, ice: 0},
      {id: 5, color: "blue", r: 0, c: 4, h: 2, w: 1, key: true, lock: 0, ice: 0},
      {id: 6, color: "purple", r: 0, c: 5, h: 2, w: 1, key: false, lock: 0, ice: 0},
      {id: 7, color: "green", r: 0, c: 6, h: 2, w: 1, key: true, lock: 0, ice: 0},
      {id: 8, color: "green", r: 2, c: 0, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 9, color: "blue", r: 2, c: 1, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 10, color: "red", r: 2, c: 2, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 11, color: "orange", r: 2, c: 3, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 12, color: "sky", r: 2, c: 4, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 13, color: "yellow", r: 2, c: 5, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 14, color: "lime", r: 2, c: 6, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 15, color: "pink", r: 3, c: 0, h: 3, w: 1, key: false, lock: 0, ice: 0},
      {id: 16, color: "purple", r: 3, c: 1, h: 3, w: 3, key: false, lock: 0, ice: 0},
      {id: 17, color: "pink", r: 3, c: 4, h: 3, w: 3, key: false, lock: 0, ice: 0},
      {id: 18, color: "?", r: 6, c: 0, h: 2, w: 1, key: false, lock: 0, ice: 24},
      {id: 19, color: "?", r: 6, c: 1, h: 2, w: 1, key: false, lock: 0, ice: 32},
      {id: 20, color: "?", r: 6, c: 2, h: 2, w: 1, key: false, lock: 0, ice: 34},
      {id: 21, color: "?", r: 6, c: 3, h: 2, w: 1, key: false, lock: 0, ice: 36},
      {id: 22, color: "?", r: 6, c: 4, h: 2, w: 1, key: false, lock: 0, ice: 38},
      {id: 23, color: "?", r: 6, c: 5, h: 2, w: 1, key: false, lock: 0, ice: 40},
      {id: 24, color: "purple", r: 6, c: 6, h: 3, w: 1, key: false, lock: 0, ice: 0},
      {id: 25, color: "?", r: 8, c: 1, h: 2, w: 1, key: false, lock: 0, ice: 16},
      {id: 26, color: "?", r: 8, c: 2, h: 2, w: 1, key: false, lock: 0, ice: 14},
      {id: 27, color: "?", r: 8, c: 3, h: 2, w: 1, key: false, lock: 0, ice: 14},
      {id: 28, color: "?", r: 8, c: 4, h: 2, w: 1, key: false, lock: 0, ice: 13},
      {id: 29, color: "?", r: 8, c: 5, h: 2, w: 1, key: false, lock: 0, ice: 5},
      {id: 30, color: "blue", r: 9, c: 0, h: 1, w: 1, key: false, lock: 1, ice: 0},
      {id: 31, color: "green", r: 9, c: 6, h: 1, w: 1, key: false, lock: 1, ice: 0},
    ],
    gates: [
      {id: 1, side: "L", start: 3, len: 3, color: "pink", frozen: 0},
      {id: 2, side: "L", start: 9, len: 1, color: "blue", frozen: 0},
      {id: 3, side: "R", start: 3, len: 3, color: "purple", frozen: 0},
      {id: 4, side: "R", start: 9, len: 1, color: "green", frozen: 0},
      {id: 5, side: "T", start: 0, len: 1, color: "?", frozen: 5},
      {id: 6, side: "T", start: 1, len: 1, color: "?", frozen: 5},
      {id: 7, side: "B", start: 1, len: 1, color: "?", frozen: 5},
      {id: 8, side: "B", start: 2, len: 1, color: "?", frozen: 13},
      {id: 9, side: "B", start: 3, len: 1, color: "?", frozen: 14},
      {id: 10, side: "B", start: 4, len: 1, color: "?", frozen: 14},
      {id: 11, side: "B", start: 5, len: 1, color: "?", frozen: 16},
    ],
  },
  demo: {
    W: 5, H: 4, tickPerCell: false,
    pieces: [
      { id: 1, color: 'red', r: 1, c: 1, h: 1, w: 1, key: false, lock: 0, ice: 0 },
      { id: 2, color: 'blue', r: 1, c: 2, h: 2, w: 1, key: true, lock: 0, ice: 0 },
      { id: 3, color: 'yellow', r: 0, c: 4, h: 1, w: 1, key: false, lock: 0, ice: 0 },
      { id: 4, color: 'green', r: 3, c: 0, h: 1, w: 1, key: false, lock: 1, ice: 0 },
      { id: 5, color: 'green', r: 0, c: 0, h: 1, w: 2, key: true, lock: 0, ice: 0 },
    ],
    gates: [
      { id: 1, side: 'R', start: 1, len: 1, color: 'red', frozen: 0 },
      { id: 2, side: 'L', start: 1, len: 2, color: 'blue', frozen: 0 },
      { id: 3, side: 'T', start: 4, len: 1, color: 'yellow', frozen: 2 },
      { id: 4, side: 'L', start: 3, len: 1, color: 'green', frozen: 0 },
      { id: 5, side: 'T', start: 0, len: 2, color: 'green', frozen: 0 },
    ],
  },
  blank: { W: 7, H: 10, tickPerCell: false, pieces: [], gates: [] },
};

const STORE = 'blockout_level_v2';
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(level)); } catch {}
}

let level = loadSaved() || clone(PRESETS.l198);
let tool = 'select', color = 'pink', sel = null, sol = null, stepIdx = 0, drag = null;

function metrics() {
  const avail = Math.min(window.innerWidth - 32, 560);
  const cs = Math.floor(Math.min(52, avail / (level.W + 0.8)));
  return { cs, g: Math.round(cs * 0.4) };
}

function el(tag, cls, css) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (css) Object.assign(d.style, css);
  return d;
}

function gateBox(gt, cs, g) {
  const along = gt.start * cs + g + 3, len = gt.len * cs - 6;
  if (gt.side === 'L') return { left: '3px', top: along + 'px', width: (g - 6) + 'px', height: len + 'px' };
  if (gt.side === 'R') return { left: (g + level.W * cs + 3) + 'px', top: along + 'px', width: (g - 6) + 'px', height: len + 'px' };
  if (gt.side === 'T') return { top: '3px', left: along + 'px', height: (g - 6) + 'px', width: len + 'px' };
  return { top: (g + level.H * cs + 3) + 'px', left: along + 'px', height: (g - 6) + 'px', width: len + 'px' };
}
const rectCss = (r, c, h, w, cs, g, pad = 2) => ({
  left: (g + c * cs + pad) + 'px', top: (g + r * cs + pad) + 'px',
  width: (w * cs - 2 * pad) + 'px', height: (h * cs - 2 * pad) + 'px',
});

function currentView() {
  if (!sol) return { view: level, step: null };
  const step = sol.steps[stepIdx] || null;
  return { view: step ? step.before : sol.final, step };
}

function render() {
  const { cs, g } = metrics();
  const b = $('board');
  b.innerHTML = '';
  b.style.width = (level.W * cs + 2 * g) + 'px';
  b.style.height = (level.H * cs + 2 * g) + 'px';
  const { view, step } = currentView();

  for (let r = 0; r < level.H; r++)
    for (let c = 0; c < level.W; c++) b.appendChild(el('div', 'grid-bg', rectCss(r, c, 1, 1, cs, g, 1)));

  for (const gt of view.gates) {
    const d = el('div', 'gate', { ...gateBox(gt, cs, g), background: COLORS[gt.color] });
    if (gt.frozen) { d.classList.add('frozen'); d.textContent = '❄' + gt.frozen; }
    else d.textContent = gt.color === '?' ? '?' : ARROW[gt.side];
    if (!sol && sel && sel.kind === 'gate' && sel.id === gt.id) d.classList.add('sel');
    if (step && step.kind === 'exit' && step.gateId === gt.id) d.classList.add('target');
    b.appendChild(d);
  }

  for (const p of view.pieces) {
    const d = el('div', 'piece', { ...rectCss(p.r, p.c, p.h, p.w, cs, g), background: COLORS[p.color] });
    const bits = [];
    if (p.ice) { d.classList.add('ice'); bits.push('❄' + p.ice); }
    if (p.lock) bits.push('🔒' + p.lock);
    if (p.key) bits.push('🗝️');
    if (p.color === '?' && !p.ice) bits.push('?');
    bits.forEach(t => d.appendChild(el('span')).textContent = t);
    if (!sol && sel && sel.kind === 'piece' && sel.id === p.id) d.classList.add('sel');
    if (step && step.pieceId === p.id) d.classList.add('moving');
    b.appendChild(d);
  }

  if (step) {
    const p = step.before.pieces.find(x => x.id === step.pieceId);
    if (step.r !== p.r || step.c !== p.c) b.appendChild(el('div', 'ghost', rectCss(step.r, step.c, p.h, p.w, cs, g)));
  }

  if (drag && drag.kind === 'draw') {
    const r = Math.min(drag.r0, drag.r1), c = Math.min(drag.c0, drag.c1);
    b.appendChild(el('div', 'preview', rectCss(r, c, Math.abs(drag.r1 - drag.r0) + 1, Math.abs(drag.c1 - drag.c0) + 1, cs, g)));
  }
  if (drag && drag.kind === 'gate') {
    const s = Math.min(drag.k0, drag.k1);
    b.appendChild(el('div', 'preview', gateBox({ side: drag.side, start: s, len: Math.abs(drag.k1 - drag.k0) + 1 }, cs, g)));
  }
}

// ── Editing ────────────────────────────────────────────────
function locate(e) {
  const rc = $('board').getBoundingClientRect();
  const { cs, g } = metrics();
  const x = e.clientX - rc.left, y = e.clientY - rc.top;
  const c = Math.floor((x - g) / cs), r = Math.floor((y - g) / cs);
  const inC = c >= 0 && c < level.W, inR = r >= 0 && r < level.H;
  const clamp = (v, n) => Math.max(0, Math.min(n - 1, v));
  return { x, y, r, c, rC: clamp(r, level.H), cC: clamp(c, level.W), inside: inC && inR,
    edge: inR && x < g ? ['L', r] : inR && x > g + level.W * cs ? ['R', r]
        : inC && y < g ? ['T', c] : inC && y > g + level.H * cs ? ['B', c] : null };
}
const pieceAt = (r, c) => level.pieces.find(p => r >= p.r && r < p.r + p.h && c >= p.c && c < p.c + p.w);
const gateAt = (side, k) => level.gates.find(gt => gt.side === side && k >= gt.start && k < gt.start + gt.len);
const nextId = list => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;

function changed() { save(); render(); inspector(); }

$('board').addEventListener('pointerdown', e => {
  if (sol) { stopPlay(); stepForward(); return; }
  const h = locate(e);
  if (tool === 'select' || tool === 'erase') {
    const p = h.inside ? pieceAt(h.r, h.c) : null;
    const gt = h.edge ? gateAt(...h.edge) : null;
    if (tool === 'erase') {
      if (p) level.pieces = level.pieces.filter(x => x !== p);
      if (gt) level.gates = level.gates.filter(x => x !== gt);
      sel = null;
    } else sel = p ? { kind: 'piece', id: p.id } : gt ? { kind: 'gate', id: gt.id } : null;
    changed();
    return;
  }
  if (tool === 'draw' && h.inside) drag = { kind: 'draw', r0: h.r, c0: h.c, r1: h.r, c1: h.c };
  if (tool === 'gate' && h.edge) drag = { kind: 'gate', side: h.edge[0], k0: h.edge[1], k1: h.edge[1] };
  if (drag) { $('board').setPointerCapture(e.pointerId); render(); }
});

$('board').addEventListener('pointermove', e => {
  if (!drag) return;
  const h = locate(e);
  if (drag.kind === 'draw') { drag.r1 = h.rC; drag.c1 = h.cC; }
  else drag.k1 = drag.side === 'L' || drag.side === 'R' ? h.rC : h.cC;
  render();
});

$('board').addEventListener('pointerup', () => {
  if (!drag) return;
  if (drag.kind === 'draw') {
    const r = Math.min(drag.r0, drag.r1), c = Math.min(drag.c0, drag.c1);
    const h = Math.abs(drag.r1 - drag.r0) + 1, w = Math.abs(drag.c1 - drag.c0) + 1;
    level.pieces = level.pieces.filter(p => p.r >= r + h || p.r + p.h <= r || p.c >= c + w || p.c + p.w <= c);
    const p = { id: nextId(level.pieces), color, r, c, h, w, key: false, lock: 0, ice: 0 };
    level.pieces.push(p);
    sel = { kind: 'piece', id: p.id };
  } else {
    const s = Math.min(drag.k0, drag.k1), len = Math.abs(drag.k1 - drag.k0) + 1;
    level.gates = level.gates.filter(gt => gt.side !== drag.side || gt.start >= s + len || gt.start + gt.len <= s);
    const gt = { id: nextId(level.gates), side: drag.side, start: s, len, color, frozen: 0 };
    level.gates.push(gt);
    sel = { kind: 'gate', id: gt.id };
  }
  drag = null;
  changed();
});

function numberField(label, value, onInput) {
  const l = el('label');
  l.append(label + ' ');
  const i = el('input');
  i.type = 'number'; i.min = 0; i.max = 99; i.value = value;
  i.addEventListener('input', () => { onInput(Math.max(0, parseInt(i.value) || 0)); save(); render(); });
  l.appendChild(i);
  return l;
}

function colorRow(current, onPick) {
  const row = el('div', 'chips');
  for (const [k, hex] of Object.entries(COLORS)) {
    const ch = el('div', 'chip' + (k === current ? ' on' : ''), { background: hex, width: '26px', height: '26px' });
    ch.title = NAMES[k];
    if (k === '?') ch.textContent = '?';
    ch.addEventListener('click', () => { onPick(k); changed(); });
    row.appendChild(ch);
  }
  return row;
}

function inspector() {
  const box = $('inspector');
  box.innerHTML = '';
  const obj = sel && !sol && (sel.kind === 'piece' ? level.pieces : level.gates).find(x => x.id === sel.id);
  box.hidden = !obj;
  if (!obj) return;
  const row = el('div', 'row');
  if (sel.kind === 'piece') {
    box.appendChild(el('h3')).textContent = `${NAMES[obj.color]} piece ${obj.h}×${obj.w} · row ${obj.r + 1}, col ${obj.c + 1}`;
    box.appendChild(colorRow(obj.color, k => obj.color = k));
    const key = el('label', 'check');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = obj.key;
    cb.addEventListener('change', () => { obj.key = cb.checked; save(); render(); });
    key.append(cb, ' 🗝️ Key');
    row.append(key, numberField('🔒 Lock', obj.lock, v => obj.lock = v), numberField('❄ Ice', obj.ice, v => obj.ice = v));
  } else {
    const span = obj.len > 1 ? `${obj.start + 1}–${obj.start + obj.len}` : obj.start + 1;
    box.appendChild(el('h3')).textContent = `${NAMES[obj.color]} exit · ${SIDE[obj.side]} side, ${obj.side === 'L' || obj.side === 'R' ? 'row' : 'col'} ${span}`;
    box.appendChild(colorRow(obj.color, k => obj.color = k));
    row.append(numberField('❄ Frozen', obj.frozen, v => obj.frozen = v));
  }
  const del = el('button', 'btn'); del.textContent = 'Delete';
  del.addEventListener('click', () => {
    if (sel.kind === 'piece') level.pieces = level.pieces.filter(x => x !== obj);
    else level.gates = level.gates.filter(x => x !== obj);
    sel = null; changed();
  });
  row.appendChild(del);
  box.appendChild(row);
}

function buildChips() {
  const box = $('chips');
  box.innerHTML = '';
  for (const [k, hex] of Object.entries(COLORS)) {
    const ch = el('div', 'chip' + (k === color ? ' on' : ''), { background: hex });
    ch.title = NAMES[k];
    if (k === '?') ch.textContent = '?';
    ch.addEventListener('click', () => { color = k; buildChips(); });
    box.appendChild(ch);
  }
}

$('tools').addEventListener('click', e => {
  const t = e.target.dataset.tool;
  if (!t) return;
  tool = t;
  [...$('tools').children].forEach(b => b.classList.toggle('on', b.dataset.tool === t));
});

function syncInputs() {
  $('w').value = level.W; $('h').value = level.H; $('per-cell').checked = !!level.tickPerCell;
}
function resize() {
  const W = Math.max(3, Math.min(12, parseInt($('w').value) || level.W));
  const H = Math.max(3, Math.min(14, parseInt($('h').value) || level.H));
  level.W = W; level.H = H;
  level.pieces = level.pieces.filter(p => p.r + p.h <= H && p.c + p.w <= W);
  level.gates = level.gates.filter(gt => gt.start + gt.len <= (gt.side === 'L' || gt.side === 'R' ? H : W));
  changed();
}
$('w').addEventListener('change', resize);
$('h').addEventListener('change', resize);
$('per-cell').addEventListener('change', () => { level.tickPerCell = $('per-cell').checked; save(); });

$('preset').addEventListener('change', e => {
  const v = e.target.value;
  if (!v) return;
  level = clone(PRESETS[v]);
  sel = null; closeSolution(); syncInputs(); changed();
  status(v === 'l198' ? 'Level 198 loaded (read from a screenshot).' : '', '');
  e.target.value = '';
});

function status(msg, cls) { const s = $('status'); s.textContent = msg; s.className = cls || ''; }

// ── Solving ────────────────────────────────────────────────
function describe(s) {
  const p = s.before.pieces.find(x => x.id === s.pieceId);
  const name = `${NAMES[p.color]} ${p.h}×${p.w} (row ${s.fromR + 1}, col ${s.fromC + 1})`;
  if (s.kind === 'exit') {
    const gt = s.before.gates.find(x => x.id === s.gateId);
    return `${name} → out the ${SIDE[gt.side]} exit`;
  }
  return `Move ${name} → row ${s.r + 1}, col ${s.c + 1}` + (s.wait ? ' (to thaw an exit)' : '');
}

function stuckReason(st) {
  const unknownPieces = st.pieces.filter(p => p.color === '?' && !p.ice).length;
  const unknownGates = st.gates.filter(gt => gt.color === '?' && !gt.frozen).length;
  if (unknownPieces || unknownGates) {
    const parts = [];
    if (unknownPieces) parts.push(`${unknownPieces} thawed piece${unknownPieces > 1 ? 's' : ''}`);
    if (unknownGates) parts.push(`${unknownGates} thawed exit${unknownGates > 1 ? 's' : ''}`);
    return `Next it needs the colours of ${parts.join(' and ')}. Play these steps, then import a new screenshot.`;
  }
  if (st.pieces.some(p => p.ice)) return 'The rest is waiting on ice, but no piece can leave to count it down. Check the board.';
  return 'No further move found. Check colours, exits and numbers.';
}

$('solve').addEventListener('click', () => {
  if (!level.pieces.length) { status('The board is empty.', 'err'); return; }
  status('Solving…');
  setTimeout(() => {
    const t0 = performance.now();
    const res = Engine.solve(level);
    const ms = Math.round(performance.now() - t0);
    const exits = res.steps.filter(s => s.kind === 'exit').length;
    if (!res.steps.length) { status('No piece can reach a matching exit yet. ' + stuckReason(res.final), 'err'); return; }
    sol = res; stepIdx = 0;
    const hidden = res.final.pieces.length;
    if (res.ok && !hidden) status(`✓ Solved: ${res.steps.length} steps (${ms} ms).`, 'ok');
    else if (res.ok) status(`All known pieces cleared in ${res.steps.length} steps. ${hidden} hidden piece${hidden > 1 ? 's' : ''} left: import a new screenshot once they show.`, 'ok');
    else status(`${res.steps.length} steps (${exits} piece${exits === 1 ? '' : 's'} out), then stuck. ${stuckReason(res.final)}`, 'err');
    openSolution();
  }, 20);
});

function openSolution() {
  $('solution').hidden = false;
  $('player').hidden = false;
  ['tools', 'chips', 'inspector'].forEach(id => $(id).hidden = true);
  document.querySelector('#editor .size-row').hidden = true;
  const ol = $('steps');
  ol.innerHTML = '';
  sol.steps.forEach((s, i) => {
    const li = el('li'); li.textContent = describe(s);
    li.addEventListener('click', () => { stopPlay(); goStep(i); });
    ol.appendChild(li);
  });
  const end = el('li'); end.textContent = sol.ok ? 'Done' : 'Stuck here';
  end.addEventListener('click', () => { stopPlay(); goStep(sol.steps.length); });
  ol.appendChild(end);
  goStep(0);
  $('board-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goStep(i) {
  stepIdx = Math.max(0, Math.min(sol.steps.length, i));
  [...$('steps').children].forEach((li, k) => li.classList.toggle('on', k === stepIdx));
  const s = sol.steps[stepIdx];
  $('step-text').textContent = s ? `${stepIdx + 1}/${sol.steps.length}: ${describe(s)}` : (sol.ok ? 'Board after all steps' : 'Stuck here');
  render();
}

function closeSolution() {
  stopPlay();
  sol = null;
  $('solution').hidden = true;
  $('player').hidden = true;
  ['tools', 'chips'].forEach(id => $(id).hidden = false);
  document.querySelector('#editor .size-row').hidden = false;
  render(); inspector();
}

// ── Playback ───────────────────────────────────────────────
let playing = false, animating = false;

function stepForward() {
  if (animating || !sol || stepIdx >= sol.steps.length) return Promise.resolve(false);
  const s = sol.steps[stepIdx];
  const mover = document.querySelector('.piece.moving');
  const p = s.before.pieces.find(x => x.id === s.pieceId);
  const pts = Engine.path(level, s.before, s.pieceId, s.r, s.c);
  if (s.kind === 'exit') {
    const gt = s.before.gates.find(x => x.id === s.gateId);
    pts.push(gt.side === 'L' ? [s.r, -p.w] : gt.side === 'R' ? [s.r, level.W]
           : gt.side === 'T' ? [-p.h, s.c] : [level.H, s.c]);
  }
  // Keep only the corners of the path so the piece glides in straight lines.
  const corners = pts.filter((q, i) => i === 0 || i === pts.length - 1 ||
    (pts[i - 1][0] - q[0]) !== (q[0] - pts[i + 1][0]) || (pts[i - 1][1] - q[1]) !== (q[1] - pts[i + 1][1]));
  const dist = [0];
  for (let i = 1; i < corners.length; i++)
    dist.push(dist[i - 1] + Math.abs(corners[i][0] - corners[i - 1][0]) + Math.abs(corners[i][1] - corners[i - 1][1]));
  const total = dist[dist.length - 1] || 1;
  const { cs, g } = metrics();
  const frames = corners.map(([r, c], i) => ({
    left: (g + c * cs + 2) + 'px', top: (g + r * cs + 2) + 'px', offset: dist[i] / total,
    opacity: s.kind === 'exit' && i === corners.length - 1 ? 0 : 1,
  }));
  document.querySelectorAll('.ghost').forEach(x => x.remove());
  animating = true;
  const anim = mover.animate(frames, { duration: Math.max(300, total * 140), easing: 'ease-in-out', fill: 'forwards' });
  return anim.finished.then(() => { animating = false; goStep(stepIdx + 1); return true; },
                            () => { animating = false; return false; });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function play() {
  if (playing) { stopPlay(); return; }
  if (stepIdx >= sol.steps.length) goStep(0);
  playing = true;
  $('play').textContent = '⏸ Pause';
  while (playing && sol && stepIdx < sol.steps.length) {
    await sleep(450);
    if (!playing) break;
    await stepForward();
  }
  stopPlay();
}
function stopPlay() {
  playing = false;
  $('play').textContent = '▶ Play';
}

$('play').addEventListener('click', play);
$('restart').addEventListener('click', () => { stopPlay(); if (!animating) goStep(0); });
$('prev').addEventListener('click', () => { stopPlay(); if (!animating) goStep(stepIdx - 1); });
$('next').addEventListener('click', () => { stopPlay(); stepForward(); });
document.addEventListener('keydown', e => {
  if (!sol || e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') { stopPlay(); stepForward(); }
  else if (e.key === 'ArrowLeft') { stopPlay(); if (!animating) goStep(stepIdx - 1); }
  else if (e.key === ' ') { e.preventDefault(); play(); }
});
$('edit').addEventListener('click', () => { closeSolution(); status(''); });

// ── Screenshot import ──────────────────────────────────────
let impRect = null, impDrag = null;
const img = $('imp-img'), stage = $('imp-stage'), box = $('imp-box');

function openImport(blob) {
  img.src = URL.createObjectURL(blob);
  impRect = null; box.hidden = true; $('imp-go').disabled = true;
  const last = (() => { try { return JSON.parse(localStorage.getItem('blockout_import_size')); } catch { return null; } })() || [7, 10];
  $('imp-w').value = last[0]; $('imp-h').value = last[1];
  closeSolution();
  $('import').hidden = false; $('editor').hidden = true;
  status('');
  $('import').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('file').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) openImport(f);
});

$('paste').addEventListener('click', async () => {
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find(t => t.startsWith('image/'));
      if (type) { openImport(await item.getType(type)); return; }
    }
    status('No image on the clipboard. Copy a screenshot first.', 'err');
  } catch {
    status('This browser blocked clipboard access. Press Ctrl/Cmd+V, or use 📷 Screenshot.', 'err');
  }
});

document.addEventListener('paste', e => {
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  openImport(item.getAsFile());
});

function drawBox() {
  if (!impRect) { box.hidden = true; return; }
  box.hidden = false;
  Object.assign(box.style, { left: impRect.x + 'px', top: impRect.y + 'px', width: impRect.w + 'px', height: impRect.h + 'px' });
  box.style.setProperty('--w', $('imp-w').value || 1);
  box.style.setProperty('--h', $('imp-h').value || 1);
}
const stagePos = e => { const r = img.getBoundingClientRect(); return [Math.max(0, Math.min(r.width, e.clientX - r.left)), Math.max(0, Math.min(r.height, e.clientY - r.top))]; };
// iOS Safari treats a finger on an image as an image drag, so the image ignores pointers
// and touch events are handled directly alongside pointer events.
function boxStart(pt) { impDrag = stagePos(pt); }
function boxMove(pt) {
  if (!impDrag) return;
  const [x, y] = stagePos(pt);
  impRect = { x: Math.min(x, impDrag[0]), y: Math.min(y, impDrag[1]), w: Math.abs(x - impDrag[0]), h: Math.abs(y - impDrag[1]) };
  drawBox();
}
function boxEnd() {
  impDrag = null;
  $('imp-go').disabled = !(impRect && impRect.w > 20 && impRect.h > 20);
}
stage.addEventListener('pointerdown', e => { e.preventDefault(); boxStart(e); try { stage.setPointerCapture(e.pointerId); } catch {} });
stage.addEventListener('pointermove', e => boxMove(e));
stage.addEventListener('pointerup', boxEnd);
stage.addEventListener('pointercancel', boxEnd);
stage.addEventListener('touchstart', e => { e.preventDefault(); boxStart(e.touches[0]); }, { passive: false });
stage.addEventListener('touchmove', e => { e.preventDefault(); boxMove(e.touches[0]); }, { passive: false });
stage.addEventListener('touchend', boxEnd);
$('imp-w').addEventListener('input', drawBox);
$('imp-h').addEventListener('input', drawBox);

function closeImport() { $('import').hidden = true; $('editor').hidden = false; }
$('imp-cancel').addEventListener('click', closeImport);
$('imp-go').addEventListener('click', () => {
  const W = parseInt($('imp-w').value), H = parseInt($('imp-h').value);
  try { localStorage.setItem('blockout_import_size', JSON.stringify([W, H])); } catch {}
  const k = img.naturalWidth / img.getBoundingClientRect().width;
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  level = Detect.run(ctx.getImageData(0, 0, cv.width, cv.height),
    { x: impRect.x * k, y: impRect.y * k, w: impRect.w * k, h: impRect.h * k }, W, H);
  sel = null; closeImport(); syncInputs(); changed();
  const nums = level.pieces.filter(p => p.ice || p.lock).length + level.gates.filter(gt => gt.frozen).length;
  status(`Read ${level.pieces.length} pieces and ${level.gates.length} exits.` +
    (nums ? ` Now set the numbers: tap each ❄ ice block, 🔒 lock and frozen exit (${nums}) and type its count.` : ''), 'ok');
});

window.addEventListener('resize', render);
buildChips(); syncInputs(); render();
