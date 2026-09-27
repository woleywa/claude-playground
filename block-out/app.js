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
    W: 7, H: 10, tickPerCell: false, note: 'Level 198 loaded (read from a screenshot).',
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
  l204: {
    W: 7, H: 10, tickPerCell: false, note: 'Level 204 loaded (read from a screenshot).',
    walls: [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[2,0],[2,1],[3,0]],
    pieces: [
      {id: 1, color: "yellow", r: 0, c: 4, h: 3, w: 1, key: false, lock: 0, ice: 0, inner: "purple"},
      {id: 2, color: "green", r: 0, c: 5, h: 1, w: 2, key: false, lock: 0, ice: 0},
      {id: 3, color: "blue", r: 1, c: 5, h: 1, w: 2, key: false, lock: 0, ice: 0},
      {id: 4, color: "blue", r: 2, c: 2, h: 1, w: 2, key: false, lock: 0, ice: 0},
      {id: 5, color: "purple", r: 2, c: 5, h: 1, w: 2, key: false, lock: 0, ice: 0},
      {id: 6, color: "blue", r: 3, c: 6, h: 3, w: 1, key: false, lock: 0, ice: 0},
      {id: 7, color: "yellow", r: 4, c: 0, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 8, color: "yellow", r: 4, c: 1, h: 2, w: 1, key: false, lock: 0, ice: 0},
      {id: 9, color: "yellow", r: 4, c: 2, h: 2, w: 1, key: false, lock: 0, ice: 0},
      {id: 10, color: "purple", r: 4, c: 3, h: 2, w: 2, key: false, lock: 0, ice: 0, shape: [[0,0],[1,0],[1,1]]},
      {id: 11, color: "red", r: 4, c: 4, h: 2, w: 2, key: false, lock: 0, ice: 0, shape: [[0,0],[0,1],[1,1]]},
      {id: 12, color: "blue", r: 5, c: 0, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 13, color: "?", r: 6, c: 0, h: 4, w: 4, key: false, lock: 0, ice: 9, crate: true},
      {id: 14, color: "?", r: 6, c: 4, h: 4, w: 3, key: false, lock: 0, ice: 15, crate: true},
    ],
    gates: [
      {id: 1, side: "L", start: 4, len: 2, color: "red", frozen: 0},
      {id: 2, side: "L", start: 7, len: 3, color: "?", frozen: 12},
      {id: 3, side: "R", start: 3, len: 3, color: "?", frozen: 5},
      {id: 4, side: "T", start: 4, len: 2, color: "blue", frozen: 0},
      {id: 5, side: "B", start: 4, len: 3, color: "?", frozen: 18},
    ],
  },
  l205: {
    W: 7, H: 8, tickPerCell: false, note: 'Level 205 loaded (read from a screenshot).',
    walls: [],
    tracks: [[0,0,"yellow"],[0,1,"yellow"],[0,2,"yellow"],[0,3,"yellow"],[0,4,"yellow"],[0,5,"yellow"],[0,6,"yellow"],[1,0,"yellow"],[1,1,"yellow"],[1,2,"yellow"],[1,3,"yellow"],[1,4,"yellow"],[1,5,"yellow"],[1,6,"yellow"],[2,0,"yellow"],[2,6,"yellow"],[3,0,"yellow"],[3,6,"yellow"],[4,0,"yellow"],[4,6,"yellow"],[5,0,"yellow"],[5,6,"yellow"],[6,0,"yellow"],[6,6,"yellow"]],
    pieces: [
      {id: 1, color: "yellow", r: 2, c: 1, h: 1, w: 3, key: false, lock: 0, ice: 0},
      {id: 2, color: "red", r: 2, c: 4, h: 2, w: 2, key: false, lock: 0, ice: 0, inner: "blue"},
      {id: 3, color: "green", r: 3, c: 1, h: 1, w: 3, key: false, lock: 0, ice: 0, inner: "yellow"},
      {id: 4, color: "red", r: 4, c: 1, h: 2, w: 2, key: false, lock: 0, ice: 0, shape: [[0,0],[0,1],[1,0]], inner: "yellow"},
      {id: 5, color: "blue", r: 4, c: 3, h: 2, w: 1, key: false, lock: 0, ice: 0, inner: "red"},
      {id: 6, color: "yellow", r: 4, c: 4, h: 2, w: 2, key: false, lock: 0, ice: 0},
      {id: 7, color: "yellow", r: 5, c: 1, h: 2, w: 3, key: false, lock: 0, ice: 0, shape: [[0,1],[1,0],[1,1],[1,2]]},
      {id: 8, color: "red", r: 6, c: 4, h: 1, w: 2, key: false, lock: 0, ice: 0, inner: "yellow"},
      {id: 9, color: "yellow", r: 7, c: 0, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 10, color: "green", r: 7, c: 1, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 11, color: "yellow", r: 7, c: 2, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 12, color: "red", r: 7, c: 3, h: 1, w: 2, key: false, lock: 0, ice: 0},
      {id: 13, color: "yellow", r: 7, c: 5, h: 1, w: 1, key: false, lock: 0, ice: 0},
      {id: 14, color: "blue", r: 7, c: 6, h: 1, w: 1, key: false, lock: 0, ice: 0},
    ],
    gates: [
      {id: 1, side: "L", start: 7, len: 1, color: "green", frozen: 0},
      {id: 2, side: "T", start: 2, len: 3, color: "?", frozen: 10},
      {id: 3, side: "B", start: 1, len: 2, color: "red", frozen: 0},
      {id: 4, side: "B", start: 4, len: 2, color: "blue", frozen: 0},
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

// An inner exit sits in wall cells inside the board: `at` is the first open row/column in
// front of it, so its cells are just beyond that on the side it faces.
function innerCells(gt) {
  if (gt.at == null) return null;
  const out = [];
  for (let k = gt.start; k < gt.start + gt.len; k++)
    out.push(gt.side === 'T' ? [gt.at - 1, k] : gt.side === 'B' ? [gt.at + 1, k] : gt.side === 'L' ? [k, gt.at - 1] : [k, gt.at + 1]);
  return out;
}

function gateBox(gt, cs, g) {
  const cells = innerCells(gt);
  if (cells) {
    const r = Math.min(...cells.map(q => q[0])), c = Math.min(...cells.map(q => q[1]));
    const h = Math.max(...cells.map(q => q[0])) - r + 1, w = Math.max(...cells.map(q => q[1])) - c + 1;
    return rectCss(r, c, h, w, cs, g, 4);
  }
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

// A piece is a container of cell tiles, so any shape renders and animates as one unit.
function pieceEl(p, r0, c0, cs, g, ghost) {
  const wrap = el('div', ghost ? 'pwrap ghost' : 'pwrap', { left: (g + c0 * cs) + 'px', top: (g + r0 * cs) + 'px', width: p.w * cs + 'px', height: p.h * cs + 'px' });
  const offs = Engine.cellsOf(p, 0, 0);
  const has = new Set(offs.map(([r, c]) => r + ',' + c));
  for (const [r, c] of offs) {
    const open = (dr, dc) => !has.has((r + dr) + ',' + (c + dc));
    const T = open(-1, 0) ? 2 : 0, B = open(1, 0) ? 2 : 0, L = open(0, -1) ? 2 : 0, R = open(0, 1) ? 2 : 0;
    const d = el('div', 'piece', {
      left: (c * cs + L) + 'px', top: (r * cs + T) + 'px', width: (cs - L - R) + 'px', height: (cs - T - B) + 'px',
      borderRadius: [T && L, T && R, B && R, B && L].map(v => v ? '7px' : '0').join(' '),
    });
    if (!ghost) {
      if (offs.length > 1) d.style.boxShadow = 'none';
      if (p.crate) d.classList.add('crate');
      else if (p.ice) d.classList.add('ice');
      else d.style.background = COLORS[p.color];
      if (p.inner) { d.style.background = COLORS[p.inner]; d.style.boxShadow = `inset 0 0 0 ${Math.round(cs * 0.27)}px ${COLORS[p.color]}`; }
    }
    wrap.appendChild(d);
  }
  if (ghost) return wrap;
  const bits = [];
  if (p.ice) bits.push((p.crate ? '📦' : '❄') + p.ice);
  if (p.lock) bits.push('🔒' + p.lock);
  if (p.key) bits.push('🗝️');
  if (p.item) bits.push(p.item === 'battery' ? '🔋' : '🚀');
  if (p.axis) bits.push(p.axis === 'h' ? '⇔' : '⇕');
  if (p.star) bits.push('★');
  if (p.color === '?' && !p.ice) bits.push('?');
  if (bits.length) {
    const mr = offs.reduce((s, q) => s + q[0], 0) / offs.length, mc = offs.reduce((s, q) => s + q[1], 0) / offs.length;
    const [lr, lc] = p.shape ? offs.reduce((b, q) => Math.hypot(q[0] - mr, q[1] - mc) < Math.hypot(b[0] - mr, b[1] - mc) ? q : b) : [mr, mc];
    const lab = el('div', 'plabel' + (p.ice && !p.crate ? ' dark' : ''), { left: (lc * cs) + 'px', top: (lr * cs) + 'px', width: cs + 'px', height: cs + 'px' });
    bits.forEach(t => lab.appendChild(el('span')).textContent = t);
    wrap.appendChild(lab);
  }
  return wrap;
}

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

  const walls = new Set((level.walls || []).map(([r, c]) => r + ',' + c));
  const tracks = new Map((level.tracks || []).map(([r, c, col]) => [r + ',' + c, col]));
  for (let r = 0; r < level.H; r++)
    for (let c = 0; c < level.W; c++) {
      if (walls.has(r + ',' + c)) continue;
      const d = el('div', 'grid-bg', rectCss(r, c, 1, 1, cs, g, 1));
      const t = tracks.get(r + ',' + c);
      if (t) { d.classList.add('track'); d.style.borderColor = COLORS[t]; if (t !== 'yellow') d.style.backgroundColor = COLORS[t] + '38'; }
      b.appendChild(d);
    }

  for (const gt of view.gates) {
    const d = el('div', 'gate', { ...gateBox(gt, cs, g), background: COLORS[gt.color] });
    if (gt.frozen) { d.classList.add('frozen'); d.textContent = (gt.side === 'L' || gt.side === 'R' ? '❄\n' : '❄') + gt.frozen; }
    else d.textContent = (gt.star ? (gt.side === 'L' || gt.side === 'R' ? '★\n' : '★ ') : '') + (gt.color === '?' ? '?' : ARROW[gt.side]);
    if (!sol && sel && sel.kind === 'gate' && sel.id === gt.id) d.classList.add('sel');
    if (step && step.kind === 'exit' && step.gateId === gt.id) d.classList.add('target');
    b.appendChild(d);
  }

  for (const p of view.pieces) {
    const d = pieceEl(p, p.r, p.c, cs, g);
    if (!sol && sel && sel.kind === 'piece' && sel.id === p.id) d.classList.add('sel');
    if (step && step.pieceId === p.id) d.classList.add('moving');
    b.appendChild(d);
  }

  if (step) {
    const p = step.before.pieces.find(x => x.id === step.pieceId);
    if (step.r !== p.r || step.c !== p.c) b.appendChild(pieceEl(p, step.r, step.c, cs, g, true));
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
const pieceAt = (r, c) => level.pieces.find(p => Engine.cellsOf(p).some(([y, x]) => y === r && x === c));
const isWall = (r, c) => (level.walls || []).some(([y, x]) => y === r && x === c);

// Rebuild r/c/h/w/shape from a list of absolute cells.
function reshape(p, cells) {
  const r = Math.min(...cells.map(q => q[0])), c = Math.min(...cells.map(q => q[1]));
  const h = Math.max(...cells.map(q => q[0])) - r + 1, w = Math.max(...cells.map(q => q[1])) - c + 1;
  Object.assign(p, { r, c, h, w });
  if (cells.length === h * w) delete p.shape;
  else p.shape = cells.map(([y, x]) => [y - r, x - c]);
  return p;
}
const gateAt = (side, k) => level.gates.find(gt => gt.at == null && gt.side === side && k >= gt.start && k < gt.start + gt.len);
const innerGateAt = (r, c) => level.gates.find(gt => (innerCells(gt) || []).some(([y, x]) => y === r && x === c));

// Draw exit on a wall cell: the exit faces the open cell nearest to where it was tapped, and
// joins a matching exit in the next wall cell along.
function addInnerGate(h) {
  const { cs, g } = metrics();
  const dx = h.x - (g + (h.c + 0.5) * cs), dy = h.y - (g + (h.r + 0.5) * cs);
  const open = [[1, 0, 'T'], [-1, 0, 'B'], [0, 1, 'L'], [0, -1, 'R']]
    .filter(([dr, dc]) => { const r = h.r + dr, c = h.c + dc; return r >= 0 && c >= 0 && r < level.H && c < level.W && !isWall(r, c); })
    .sort((a, b) => (b[1] * dx + b[0] * dy) - (a[1] * dx + a[0] * dy));
  if (!open.length) { status('An exit in a wall needs an open cell next to it.', 'err'); return; }
  const [dr, dc, side] = open[0];
  const flat = side === 'L' || side === 'R';
  const k = flat ? h.r : h.c, at = flat ? h.c + dc : h.r + dr;
  level.gates = level.gates.filter(x => x !== innerGateAt(h.r, h.c));
  const next = level.gates.find(x => x.at === at && x.side === side && x.color === color && !x.frozen && (x.start + x.len === k || x.start === k + 1));
  let gt;
  if (next) { gt = next; gt.start = Math.min(gt.start, k); gt.len++; }
  else { gt = { id: nextId(level.gates), side, start: k, len: 1, at, color, frozen: 0 }; level.gates.push(gt); }
  sel = { kind: 'gate', id: gt.id };
  changed();
}
const nextId = list => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;

function changed() { save(); render(); inspector(); }

$('board').addEventListener('pointerdown', e => {
  if (sol) { stopPlay(); stepForward(); return; }
  const h = locate(e);
  if (tool === 'track' && h.inside) {
    if (!isWall(h.r, h.c)) {
      const cur = trackAt(h.r, h.c);
      drag = { kind: 'track', on: cur !== color };
      paintTrack(h.r, h.c, drag.on);
      $('board').setPointerCapture(e.pointerId);
    }
    return;
  }
  if (tool === 'wall' && h.inside) {
    if (!pieceAt(h.r, h.c)) {
      const on = !isWall(h.r, h.c);
      drag = { kind: 'wall', on };
      paintWall(h.r, h.c, on);
      $('board').setPointerCapture(e.pointerId);
    }
    return;
  }
  if (tool === 'join' && h.inside) {
    const p = pieceAt(h.r, h.c);
    const first = sel && sel.kind === 'piece' && level.pieces.find(x => x.id === sel.id);
    if (p && first && p !== first) {
      reshape(first, [...Engine.cellsOf(first), ...Engine.cellsOf(p)]);
      level.pieces = level.pieces.filter(x => x !== p);
      status('Joined. Tap another piece to add it too.', '');
    } else sel = p ? { kind: 'piece', id: p.id } : null;
    changed();
    return;
  }
  if (tool === 'select' || tool === 'erase') {
    const p = h.inside ? pieceAt(h.r, h.c) : null;
    const gt = h.edge ? gateAt(...h.edge) : h.inside && !p ? innerGateAt(h.r, h.c) : null;
    if (tool === 'erase') {
      if (p) level.pieces = level.pieces.filter(x => x !== p);
      if (gt) level.gates = level.gates.filter(x => x !== gt);
      sel = null;
    } else sel = p ? { kind: 'piece', id: p.id } : gt ? { kind: 'gate', id: gt.id } : null;
    changed();
    return;
  }
  if (tool === 'draw' && h.inside) drag = { kind: 'draw', r0: h.r, c0: h.c, r1: h.r, c1: h.c };
  if (tool === 'gate' && h.inside && isWall(h.r, h.c)) { addInnerGate(h); return; }
  if (tool === 'gate' && h.edge) drag = { kind: 'gate', side: h.edge[0], k0: h.edge[1], k1: h.edge[1] };
  if (drag) { $('board').setPointerCapture(e.pointerId); render(); }
});

const trackAt = (r, c) => ((level.tracks || []).find(([y, x]) => y === r && x === c) || [])[2];
function paintTrack(r, c, on) {
  if (isWall(r, c) || (trackAt(r, c) === color) === on) return;
  level.tracks = (level.tracks || []).filter(([y, x]) => y !== r || x !== c);
  if (on) level.tracks.push([r, c, color === '?' ? 'yellow' : color]);
  save(); render();
}

function paintWall(r, c, on) {
  if (pieceAt(r, c) || isWall(r, c) === on) return;
  if (on) level.tracks = (level.tracks || []).filter(([y, x]) => y !== r || x !== c);
  else level.gates = level.gates.filter(gt => gt !== innerGateAt(r, c));
  level.walls = on ? [...(level.walls || []), [r, c]] : level.walls.filter(([y, x]) => y !== r || x !== c);
  save(); render();
}

$('board').addEventListener('pointermove', e => {
  if (!drag) return;
  const h = locate(e);
  if (drag.kind === 'wall') { if (h.inside) paintWall(h.r, h.c, drag.on); return; }
  if (drag.kind === 'track') { if (h.inside) paintTrack(h.r, h.c, drag.on); return; }
  if (drag.kind === 'draw') { drag.r1 = h.rC; drag.c1 = h.cC; }
  else drag.k1 = drag.side === 'L' || drag.side === 'R' ? h.rC : h.cC;
  render();
});

$('board').addEventListener('pointerup', () => {
  if (!drag) return;
  if (drag.kind === 'wall' || drag.kind === 'track') { drag = null; return; }
  if (drag.kind === 'draw') {
    const r = Math.min(drag.r0, drag.r1), c = Math.min(drag.c0, drag.c1);
    const h = Math.abs(drag.r1 - drag.r0) + 1, w = Math.abs(drag.c1 - drag.c0) + 1;
    const inRect = ([y, x]) => y >= r && y < r + h && x >= c && x < c + w;
    level.pieces = level.pieces.filter(p => !Engine.cellsOf(p).some(inRect));
    if (level.walls) level.walls = level.walls.filter(q => !inRect(q));
    const p = { id: nextId(level.pieces), color, r, c, h, w, key: false, lock: 0, ice: 0 };
    level.pieces.push(p);
    sel = { kind: 'piece', id: p.id };
  } else {
    const s = Math.min(drag.k0, drag.k1), len = Math.abs(drag.k1 - drag.k0) + 1;
    level.gates = level.gates.filter(gt => gt.at != null || gt.side !== drag.side || gt.start >= s + len || gt.start + gt.len <= s);
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
    box.appendChild(el('h3')).textContent = `${pieceName(obj)} · row ${obj.r + 1}, col ${obj.c + 1}`;
    box.appendChild(colorRow(obj.color, k => obj.color = k));
    const inner = el('label'); inner.append('Core colour (layered piece):');
    box.appendChild(inner);
    const ir = colorRow(obj.inner || '', k => { if (k === '?' || k === obj.inner) delete obj.inner; else obj.inner = k; });
    ir.lastChild.textContent = '✕'; ir.lastChild.title = 'No core';
    box.appendChild(ir);
    const check = (text, on, set) => {
      const l = el('label', 'check');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!on;
      cb.addEventListener('change', () => { set(cb.checked); changed(); });
      l.append(cb, ' ' + text);
      return l;
    };
    const axis = el('label'); axis.append('Moves ');
    const sel = el('select');
    [['', 'any way'], ['h', '⇔ left/right'], ['v', '⇕ up/down']].forEach(([v, t]) => { const o = el('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
    sel.value = obj.axis || '';
    sel.addEventListener('change', () => { if (sel.value) obj.axis = sel.value; else delete obj.axis; save(); render(); });
    axis.appendChild(sel);
    row.append(axis, check('★ Star piece', obj.star, v => { if (v) obj.star = true; else delete obj.star; }),
      check('🗝️ Key', obj.key, v => obj.key = v), check('📦 Crate', obj.crate, v => { obj.crate = v; if (v) { obj.color = '?'; obj.ice = obj.ice || 1; } }),
      numberField('🔒 Lock', obj.lock, v => obj.lock = v), numberField(obj.crate ? '📦 Count' : '❄ Ice', obj.ice, v => obj.ice = v));
    if (Engine.cellsOf(obj).length > 1) {
      const split = el('button', 'btn'); split.textContent = 'Split into cells';
      split.addEventListener('click', () => {
        const cells = Engine.cellsOf(obj);
        level.pieces = level.pieces.filter(x => x !== obj);
        cells.forEach(([r, c]) => level.pieces.push({ ...obj, id: nextId(level.pieces), r, c, h: 1, w: 1, shape: undefined }));
        sel = null; changed();
      });
      row.appendChild(split);
    }
  } else {
    const span = obj.len > 1 ? `${obj.start + 1}–${obj.start + obj.len}` : obj.start + 1;
    const where = obj.at != null ? `in the wall, out ${ARROW[obj.side]} from ${obj.side === 'L' || obj.side === 'R' ? 'col ' + (obj.at + 1) : 'row ' + (obj.at + 1)},`
      : `${SIDE[obj.side]} side,`;
    box.appendChild(el('h3')).textContent = `${NAMES[obj.color]} exit · ${where} ${obj.side === 'L' || obj.side === 'R' ? 'row' : 'col'} ${span}`;
    box.appendChild(colorRow(obj.color, k => obj.color = k));
    const star = el('label', 'check');
    const sb = el('input'); sb.type = 'checkbox'; sb.checked = !!obj.star;
    sb.addEventListener('change', () => { if (sb.checked) obj.star = true; else delete obj.star; changed(); });
    star.append(sb, ' ★ Star exit');
    row.append(numberField('❄ Frozen', obj.frozen, v => obj.frozen = v), star);
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

// With the edit menu closed, taps on the board just select (to type in counts).
$('edit-menu').addEventListener('toggle', () => {
  if ($('edit-menu').open) return;
  tool = 'select';
  [...$('tools').children].forEach(b => b.classList.toggle('on', b.dataset.tool === 'select'));
});

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
  level.walls = (level.walls || []).filter(([r, c]) => r < H && c < W);
  level.tracks = (level.tracks || []).filter(([r, c]) => r < H && c < W);
  level.gates = level.gates.filter(gt => gt.start + gt.len <= (gt.side === 'L' || gt.side === 'R' ? H : W)
    && (innerCells(gt) || []).every(([r, c]) => r >= 0 && c >= 0 && r < H && c < W));
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
  $('adjust').hidden = true;
  status(PRESETS[v].note || '', '');
  e.target.value = '';
});

function status(msg, cls) { const s = $('status'); s.textContent = msg; s.className = cls || ''; }

// ── Solving ────────────────────────────────────────────────
function pieceName(p) {
  const col = (p.crate ? 'Crate' : NAMES[p.color] + (p.inner ? '/' + NAMES[p.inner].toLowerCase() : '')) + (p.star ? ' ★' : '');
  return `${col} ${p.shape ? p.shape.length + '-block' : p.h + '×' + p.w}`;
}

function describe(s) {
  const p = s.before.pieces.find(x => x.id === s.pieceId);
  const name = `${pieceName(p)} (row ${s.fromR + 1}, col ${s.fromC + 1})`;
  if (s.kind === 'exit') {
    const gt = s.before.gates.find(x => x.id === s.gateId);
    return `${name} → out the ${gt.at != null ? ARROW[gt.side] + ' exit in the wall' : SIDE[gt.side] + ' exit'}` + (p.inner ? ` (the ${NAMES[p.inner].toLowerCase()} core stays)` : '');
  }
  return `Move ${name} → row ${s.r + 1}, col ${s.c + 1}`;
}

// What the player must look at before the solver can go on (colours still hidden), or ''.
function needsLook(st) {
  const pieces = st.pieces.filter(p => p.color === '?' && !p.ice).length;
  const exits = st.gates.filter(gt => gt.color === '?' && !gt.frozen).length;
  const bits = [];
  if (exits) bits.push(`${exits} frozen exit${exits > 1 ? 's have' : ' has'} thawed`);
  if (pieces) bits.push(`${pieces} hidden piece${pieces > 1 ? 's are' : ' is'} uncovered`);
  return bits.length ? `${bits.join(' and ')}, and ${exits + pieces > 1 ? 'their colours' : 'its colour'} can't be seen in this one.` : '';
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

let worker = null;

function showResult(res, ms) {
  const exits = res.steps.filter(s => s.kind === 'exit').length;
  if (!res.steps.length) { status('No piece can get out yet. ' + stuckReason(res.final), 'err'); return; }
  sol = res; stepIdx = 0;
  const hidden = res.final.pieces.length;
  const look = needsLook(res.final);
  if (res.ok && !hidden) status(`✓ Solved: ${res.steps.length} moves (${(ms / 1000).toFixed(1)} s).`, 'ok');
  else if (res.ok) status(`All known pieces cleared in ${res.steps.length} moves. ${hidden} hidden piece${hidden > 1 ? 's' : ''} left: take a new screenshot once they show.`, 'ok');
  else if (look) status(`Play ${res.steps.length === 1 ? 'this move' : `these ${res.steps.length} moves`}` +
    (exits ? ` (${exits} piece${exits === 1 ? '' : 's'} out)` : '') + `, then take a new screenshot: ${look}`, 'ok');
  else status(`${res.steps.length} moves (${exits} piece${exits === 1 ? '' : 's'} out), then no way further was found. ${stuckReason(res.final)}`, 'err');
  openSolution();
}

function stopSolving() {
  if (worker) { worker.terminate(); worker = null; }
  $('solve').textContent = 'Solve ▶';
}

$('solve').addEventListener('click', () => {
  if (worker) { stopSolving(); status('Stopped.', ''); return; }
  if (!level.pieces.length) { status('The board is empty.', 'err'); return; }
  const t0 = performance.now();
  status('Solving…');
  try {
    worker = new Worker('worker.js?v=15');
  } catch {
    setTimeout(() => showResult(Engine.solve(level, 20000), performance.now() - t0), 20);
    return;
  }
  $('solve').textContent = '■ Stop';
  worker.onmessage = e => {
    if (e.data.progress) status(`Solving… ${Math.round(e.data.progress / 1000)}k positions checked (${Math.round((performance.now() - t0) / 1000)} s). Hard levels can take a minute.`);
    if (e.data.done) { const res = e.data.done; stopSolving(); showResult(res, performance.now() - t0); }
  };
  worker.onerror = () => { stopSolving(); status('Solving… (fallback)'); setTimeout(() => showResult(Engine.solve(level, 20000), performance.now() - t0), 20); };
  worker.postMessage({ level, timeMs: 90000 });
});

function openSolution() {
  $('solution').hidden = false;
  $('player').hidden = false;
  ['edit-menu', 'inspector'].forEach(id => $(id).hidden = true);
  const ol = $('steps');
  ol.innerHTML = '';
  sol.steps.forEach((s, i) => {
    const li = el('li'); li.textContent = describe(s);
    li.addEventListener('click', () => { stopPlay(); goStep(i); });
    ol.appendChild(li);
  });
  const end = el('li'); end.textContent = sol.ok ? 'Done' : needsLook(sol.final) ? 'Take a new screenshot' : 'Stuck here';
  end.addEventListener('click', () => { stopPlay(); goStep(sol.steps.length); });
  ol.appendChild(end);
  goStep(0);
  $('board-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goStep(i) {
  stepIdx = Math.max(0, Math.min(sol.steps.length, i));
  [...$('steps').children].forEach((li, k) => li.classList.toggle('on', k === stepIdx));
  const s = sol.steps[stepIdx];
  $('step-text').textContent = s ? `${stepIdx + 1}/${sol.steps.length}: ${describe(s)}`
    : sol.ok ? 'Board after all steps' : needsLook(sol.final) ? '📷 Now take a new screenshot' : 'Stuck here';
  render();
}

function closeSolution() {
  stopPlay();
  sol = null;
  $('solution').hidden = true;
  $('player').hidden = true;
  $('edit-menu').hidden = false;
  render(); inspector();
}

// ── Playback ───────────────────────────────────────────────
let playing = false, animating = false;

function stepForward() {
  if (animating || !sol || stepIdx >= sol.steps.length) return Promise.resolve(false);
  const s = sol.steps[stepIdx];
  const mover = document.querySelector('.pwrap.moving');
  const p = s.before.pieces.find(x => x.id === s.pieceId);
  const pts = Engine.path(level, s.before, s.pieceId, s.r, s.c);
  const leaves = s.kind === 'exit' && !p.inner;
  if (leaves) {
    const gt = s.before.gates.find(x => x.id === s.gateId);
    const at = gt.at ?? (gt.side === 'L' || gt.side === 'T' ? 0 : gt.side === 'R' ? level.W - 1 : level.H - 1);
    pts.push(gt.side === 'L' ? [s.r, at - p.w] : gt.side === 'R' ? [s.r, at + 1]
           : gt.side === 'T' ? [at - p.h, s.c] : [at + 1, s.c]);
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
    left: (g + c * cs) + 'px', top: (g + r * cs) + 'px', offset: dist[i] / total,
    opacity: leaves && i === corners.length - 1 ? 0 : 1,
  }));
  document.querySelectorAll('.pwrap.ghost').forEach(x => x.remove());
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

let pixels = null, lastFound = null;
const WORK_SIDE = 2000;

// Decode straight from the file (Safari can quietly downsample a large <img> drawn to a canvas)
// at a fixed working size, which also keeps detection fast and consistent across phones.
async function readPixels(blob) {
  let src = null;
  try { src = await createImageBitmap(blob); } catch {}
  if (!src) { await img.decode().catch(() => {}); src = img; }
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  const k = Math.min(1, WORK_SIDE / Math.max(w0, h0));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  return ctx.getImageData(0, 0, cv.width, cv.height);
}

async function openImport(blob) {
  closeSolution();
  status('Reading the screenshot…');
  img.src = URL.createObjectURL(blob);
  pixels = await readPixels(blob);
  const found = Detect.locate(pixels);
  lastFound = found;
  preview(found
    ? `Found a ${found.W}×${found.H} board. Check the lines sit on the blocks, then tap Use this board. If not, drag a new box over the grid.`
    : "Couldn't find the board by itself. Drag a box over the grid of blocks, inside the frame.", found);
}

function preview(msg, found) {
  const last = (() => { try { return JSON.parse(localStorage.getItem('blockout_import_size')); } catch { return null; } })() || [7, 10];
  $('imp-msg').textContent = msg;
  $('imp-w').value = found ? found.W : last[0]; $('imp-h').value = found ? found.H : last[1];
  impRect = null; box.hidden = true; $('imp-go').disabled = true;
  $('import').hidden = false; $('editor').hidden = true; $('adjust').hidden = true;
  status('');
  const place = () => {
    if (found) {
      const k = img.getBoundingClientRect().width / pixels.width;
      impRect = { x: found.rect.x * k, y: found.rect.y * k, w: found.rect.w * k, h: found.rect.h * k };
      drawBox(); $('imp-go').disabled = false;
    }
    $('import').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  if (img.complete && img.naturalWidth) requestAnimationFrame(place); else img.onload = () => requestAnimationFrame(place);
}

function useBoard(rect, W, H) {
  lastFound = { rect, W, H };
  level = Detect.run(pixels, rect, W, H);
  sel = null; closeImport(); syncInputs(); changed();
  const counters = level.pieces.filter(p => p.ice || p.lock).length + level.gates.filter(gt => gt.frozen).length;
  const unread = level.pieces.filter(p => (p.ice && !p.read) || p.lock).length + level.gates.filter(gt => gt.frozen && !gt.read).length;
  status(`Read ${level.pieces.length} pieces and ${level.gates.length} exits` +
    (counters ? `, and ${counters - unread} of ${counters} numbers` : '') + '.' +
    (unread ? ` Tap the ${unread} unread one${unread > 1 ? 's' : ''} (❄ ice, 📦 crate, 🔒 lock, frozen exit) to type the number.` : counters ? ' Check them against the game before solving.' : ''), 'ok');
  $('adjust').hidden = false;
}

$('adjust').addEventListener('click', () => {
  if (pixels) preview('Drag a new box over the grid of blocks if the lines are off, then tap Use this board.', lastFound);
});

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
  const k = pixels.width / img.getBoundingClientRect().width;
  useBoard({ x: impRect.x * k, y: impRect.y * k, w: impRect.w * k, h: impRect.h * k }, W, H);
});

window.addEventListener('resize', render);
buildChips(); syncInputs(); render();
