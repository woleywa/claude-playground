const COLORS = [
  { name: 'Forest',    hex: '#5c9e5c' },
  { name: 'Sky',       hex: '#78b8e8' },
  { name: 'Lemon',     hex: '#d8c840' },
  { name: 'Tangerine', hex: '#e89050' },
  { name: 'Olive',     hex: '#8a8a3a' },
  { name: 'Cocoa',     hex: '#a07040' },
  { name: 'Rose',      hex: '#e090b0' },
  { name: 'Lavender',  hex: '#b890d0' },
  { name: 'Teal',      hex: '#48a898' },
  { name: 'Coral',     hex: '#e07068' },
  { name: 'Sand',      hex: '#c8a040' },
  { name: 'Slate',     hex: '#8090a8' },
];

const ERASER = -1;
const X_MARK_MODE = -2;
const CAT_MODE = -3;

let _xmarkDragIntent = null;
let _catGestureCells = null;

// Parse "#rrggbb", "rgb(r,g,b)", or "rgba(r,g,b,a)" into [r,g,b] (0–255), or null.
function parseColorRGB(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return [+m[1], +m[2], +m[3]];
  const h = str.replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(h)) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

function approxColorName(color) {
  const rgb = parseColorRGB(color);
  if (!rgb) return 'Color';
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  if (s < 0.12) return l < 0.25 ? 'Black' : l > 0.75 ? 'White' : 'Grey';
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h / 6 * 360;
  }
  if (h >= 15 && h < 50 && l < 0.52) return 'Brown';
  if (h < 15 || h >= 345) return 'Red';
  if (h < 38) return 'Orange';
  if (h < 65) return 'Yellow';
  if (h < 80) return 'Lime';
  if (h < 160) return 'Green';
  if (h < 195) return 'Teal';
  if (h < 255) return 'Blue';
  if (h < 285) return 'Purple';
  if (h < 325) return 'Pink';
  if (h < 345) return 'Magenta';
  return 'Red';
}

function namedCustomColors(colors) {
  const base = colors.map(hex => hex ? approxColorName(hex) : 'Color');
  const count = {};
  for (const n of base) count[n] = (count[n] || 0) + 1;
  const seen = {};
  return base.map(n => {
    if (count[n] === 1) return n;
    seen[n] = (seen[n] || 0) + 1;
    return `${n} ${seen[n]}`;
  });
}

const state = {
  size: 10,
  grid: [],
  selectedColor: 0,
  painting: false,
  solution: null,      // placed[row] = col, or null
  revealedRows: new Set(), // rows whose cats have been shown via Hint/Apply
  customColors: null,  // rgb strings from screenshot, or null for palette mode
  xMarks: null,        // boolean[row][col] — X marks (imported + user-applied via Explain)
  importedCats: [],    // [{row,col}] — cats already placed in the imported screenshot
  hintCells: [],       // [{row,col,role}] — cells highlighted by the active hint
  pendingAction: null, // {type:'cat',row,col} | {type:'xmarks',cells:[{row,col}]}
};

function createGrid(size) {
  return Array.from({ length: size }, () => new Array(size).fill(-1));
}

function cellColor(idx) {
  if (idx < 0) return null;
  return state.customColors?.[idx] ?? COLORS[idx]?.hex ?? '#ccc';
}

// ── Palette ────────────────────────────────────────────────────────────────

function renderPalette() {
  const palette = document.getElementById('palette');
  palette.innerHTML = '';
  palette.appendChild(makeSwatch(ERASER));
  palette.appendChild(makeSwatch(X_MARK_MODE));
  palette.appendChild(makeSwatch(CAT_MODE));
  for (let i = 0; i < state.size; i++) palette.appendChild(makeSwatch(i));

  // Fade the right edge only when there's actually more to scroll to.
  const container = document.getElementById('palette-container');
  requestAnimationFrame(() => {
    container.classList.toggle('has-overflow', palette.scrollWidth > container.clientWidth + 1);
  });
}

function makeSwatch(idx) {
  const isEraser = idx === ERASER;
  const isXMark = idx === X_MARK_MODE;
  const isCat = idx === CAT_MODE;
  const btn = document.createElement('button');
  btn.className = 'swatch' +
    (isEraser ? ' eraser' : '') +
    (isXMark ? ' xmark' : '') +
    (isCat ? ' catmode' : '') +
    (state.selectedColor === idx ? ' selected' : '');

  if (isEraser) {
    btn.textContent = '✕';
    btn.title = 'Erase';
  } else if (isXMark) {
    btn.textContent = '✕';
    btn.title = 'Mark / unmark X';
  } else if (isCat) {
    btn.textContent = '🐱';
    btn.title = 'Place / remove cat';
  } else {
    btn.style.backgroundColor = cellColor(idx);
    btn.title = state.customColors ? namedCustomColors(state.customColors)[idx] : (COLORS[idx]?.name ?? '');
  }

  btn.addEventListener('click', () => { state.selectedColor = idx; renderPalette(); });
  return btn;
}

// ── Grid ───────────────────────────────────────────────────────────────────

function renderGrid() {
  const gridEl = document.getElementById('grid');
  gridEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
  document.documentElement.style.setProperty('--grid-size', state.size);
  gridEl.innerHTML = '';

  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      const color = cellColor(state.grid[r][c]);
      if (color) cell.style.backgroundColor = color;

      const isImportedCat = state.importedCats.some(ic => ic.row === r && ic.col === c);
      const isRevealedCat = state.solution !== null && state.revealedRows.has(r) && state.solution[r] === c;
      const isRevealedX   = state.solution !== null && state.revealedRows.has(r) && state.solution[r] !== c;

      if (isImportedCat || isRevealedCat) {
        cell.classList.add('cat');
        const span = document.createElement('span');
        span.textContent = '🐱';
        cell.appendChild(span);
      } else if (isRevealedX) {
        cell.classList.add('excluded');
        const span = document.createElement('span');
        span.textContent = '✕';
        cell.appendChild(span);
      } else if (state.xMarks?.[r]?.[c]) {
        cell.classList.add('imported-x');
        const span = document.createElement('span');
        span.textContent = '✕';
        cell.appendChild(span);
      }

      const hc = state.hintCells?.find(h => h.row === r && h.col === c);
      if (hc) cell.classList.add(`hint-${hc.role}`);

      gridEl.appendChild(cell);
    }
  }

  updateStatus();
}

function paintCell(row, col) {
  const colorIdx = state.selectedColor;

  if (colorIdx === X_MARK_MODE) {
    if (!state.xMarks) {
      state.xMarks = Array.from({ length: state.size }, () => new Array(state.size).fill(false));
    }
    if (_xmarkDragIntent === null) {
      _xmarkDragIntent = state.xMarks[row][col] ? 'clear' : 'set';
    }
    state.xMarks[row][col] = (_xmarkDragIntent === 'set');
    renderGrid();
    return;
  }

  if (colorIdx === CAT_MODE) {
    // Toggle a hand-placed cat. Guard so a drag toggles each cell at most once.
    const key = `${row},${col}`;
    if (!_catGestureCells) _catGestureCells = new Set();
    if (_catGestureCells.has(key)) return;
    _catGestureCells.add(key);
    // A placed solution is no longer valid once the board changes by hand.
    if (state.solution !== null) {
      state.solution = null;
      state.revealedRows.clear();
      clearHint();
    }
    const i = state.importedCats.findIndex(c => c.row === row && c.col === col);
    if (i >= 0) {
      state.importedCats.splice(i, 1);
    } else {
      state.importedCats.push({ row, col });
      if (state.xMarks?.[row]?.[col]) state.xMarks[row][col] = false;
    }
    renderGrid();
    return;
  }

  if (colorIdx === ERASER) {
    // Erase clears color, any hand-placed cat, and any X mark on the cell.
    if (state.solution !== null) {
      state.solution = null;
      state.revealedRows.clear();
      clearHint();
    }
    state.grid[row][col] = -1;
    const i = state.importedCats.findIndex(c => c.row === row && c.col === col);
    if (i >= 0) state.importedCats.splice(i, 1);
    if (state.xMarks?.[row]?.[col]) state.xMarks[row][col] = false;
    renderGrid();
    return;
  }

  // Painting after a solve — clear cats and re-render fully
  if (state.solution !== null) {
    state.solution = null;
    state.revealedRows.clear();
    clearHint();
    state.grid[row][col] = colorIdx;
    renderGrid();
    return;
  }

  if (state.grid[row][col] === colorIdx) return;
  state.grid[row][col] = colorIdx;

  const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;

  const color = cellColor(colorIdx);
  if (color) {
    cell.style.backgroundColor = color;
  } else {
    cell.style.removeProperty('background-color');
  }

  updateStatus();
}

function getCellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest('.cell');
  if (!cell) return null;
  return { row: parseInt(cell.dataset.row, 10), col: parseInt(cell.dataset.col, 10) };
}

// ── Events ─────────────────────────────────────────────────────────────────

function bindEvents() {
  const gridEl = document.getElementById('grid');

  window.addEventListener('resize', () => {
    const palette = document.getElementById('palette');
    const container = document.getElementById('palette-container');
    container.classList.toggle('has-overflow', palette.scrollWidth > container.clientWidth + 1);
  });

  document.getElementById('size-slider').addEventListener('input', (e) => {
    state.size = parseInt(e.target.value, 10);
    document.getElementById('size-label').textContent = `${state.size} × ${state.size}`;
    state.grid = createGrid(state.size);
    state.solution = null;
    state.revealedRows.clear();
    state.customColors = null;
    state.xMarks = null;
    if (state.selectedColor !== ERASER && state.selectedColor >= state.size) state.selectedColor = 0;
    clearHint();
    document.getElementById('ai-btn').hidden = true;
    renderPalette();
    renderGrid();
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    state.grid = createGrid(state.size);
    state.solution = null;
    state.revealedRows.clear();
    state.customColors = null;
    state.xMarks = null;
    state.importedCats = [];
    clearHint();
    document.getElementById('ai-btn').hidden = true;
    renderPalette();
    renderGrid();
  });

  document.getElementById('solve-btn').addEventListener('click', runSolveAll);
  document.getElementById('hint-btn').addEventListener('click', runHint);
  document.getElementById('explain-btn').addEventListener('click', runExplain);
  document.getElementById('apply-btn').addEventListener('click', runApply);
  document.getElementById('cancel-btn').addEventListener('click', clearHint);

  document.getElementById('photo-btn').addEventListener('click', () => {
    openImagePicker(state.size, handleImageResult);
  });

  document.getElementById('paste-btn').addEventListener('click', () => {
    openImageFromClipboard(state.size, handleImageResult);
  });

  document.getElementById('ai-btn').addEventListener('click', () => {
    detectWithGemini(state.size, handleImageResult, (msg) => {
      const el = document.getElementById('status');
      el.textContent = msg;
      el.className = 'status';
    });
  });

  document.addEventListener('paste', (e) => {
    const item = Array.from(e.clipboardData?.items ?? []).find(it => it.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    loadImageBlob(item.getAsFile(), state.size, handleImageResult);
  });

  // Mouse painting
  gridEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    state.painting = true;
    const cell = e.target.closest('.cell');
    if (cell) paintCell(+cell.dataset.row, +cell.dataset.col);
  });

  document.addEventListener('mousemove', (e) => {
    if (!state.painting) return;
    const cell = e.target.closest?.('.cell');
    if (cell) paintCell(+cell.dataset.row, +cell.dataset.col);
  });

  document.addEventListener('mouseup', () => { state.painting = false; _xmarkDragIntent = null; _catGestureCells = null; });

  // Touch painting
  gridEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    state.painting = true;
    const t = e.touches[0];
    const pos = getCellFromPoint(t.clientX, t.clientY);
    if (pos) paintCell(pos.row, pos.col);
  }, { passive: false });

  gridEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!state.painting) return;
    const t = e.touches[0];
    const pos = getCellFromPoint(t.clientX, t.clientY);
    if (pos) paintCell(pos.row, pos.col);
  }, { passive: false });

  document.addEventListener('touchend', () => { state.painting = false; _xmarkDragIntent = null; _catGestureCells = null; });
  document.addEventListener('touchcancel', () => { state.painting = false; _xmarkDragIntent = null; _catGestureCells = null; });
}

// ── Status ─────────────────────────────────────────────────────────────────

function countColors() {
  const seen = new Set();
  for (const row of state.grid) for (const c of row) if (c >= 0) seen.add(c);
  return seen.size;
}

function countUncolored() {
  let n = 0;
  for (const row of state.grid) for (const c of row) if (c < 0) n++;
  return n;
}

function updateStatus() {
  const el = document.getElementById('status');
  const totalShown = state.revealedRows.size + (state.importedCats || []).length;
  if (state.solution !== null && totalShown >= state.size) {
    el.textContent = '✓ Solved!';
    el.className = 'status success';
    return;
  }
  if (state.solution !== null && state.revealedRows.size > 0) {
    el.textContent = `${totalShown}/${state.size} placed`;
    el.className = 'status ready';
    return;
  }

  const uncolored = countUncolored();
  const colors = countColors();
  const n = state.size;

  if (uncolored > 0) {
    el.textContent = `${colors} color${colors !== 1 ? 's' : ''} · ${uncolored} uncolored cell${uncolored !== 1 ? 's' : ''}`;
    el.className = 'status';
  } else if (colors !== n) {
    el.textContent = `${colors} colors for ${n}×${n} — need exactly ${n}`;
    el.className = 'status warn';
  } else {
    el.textContent = `Ready · ${n} colors, ${n}×${n} grid`;
    el.className = 'status ready';
  }
}

// ── Hint box ───────────────────────────────────────────────────────────────

function clearHint() {
  state.hintCells = [];
  state.pendingAction = null;
  const box = document.getElementById('hint-box');
  box.innerHTML = '';
  box.classList.remove('visible');
  document.getElementById('hint-actions').hidden = true;
  renderGrid();
}

// Every lesson has three parts: Name (the technique), Rule (the general
// principle — what you actually learn), Here (how it applies to this board).
// A dimmed "checked" trail above the name shows which simpler techniques were
// tried first and found nothing — so the player learns the checking order too.
function showHint(hint, cells = [], action = null) {
  const { name, rule, here, checked } = hint;
  state.hintCells = cells;
  state.pendingAction = action;
  const box = document.getElementById('hint-box');
  box.innerHTML = '';
  if (checked && checked.length > 0) {
    const checkedEl = document.createElement('div');
    checkedEl.className = 'hint-checked';
    checkedEl.textContent = `Checked first, no luck: ${checked.join(' → ')}`;
    box.appendChild(checkedEl);
  }
  const nameEl = document.createElement('div');
  nameEl.className = 'hint-name';
  nameEl.textContent = name;
  box.appendChild(nameEl);
  if (rule) {
    const ruleEl = document.createElement('div');
    ruleEl.className = 'hint-rule';
    ruleEl.textContent = rule;
    box.appendChild(ruleEl);
  }
  const hereEl = document.createElement('div');
  hereEl.className = 'hint-here';
  hereEl.textContent = here;
  box.appendChild(hereEl);
  box.classList.add('visible');
  document.getElementById('hint-actions').hidden = (action === null);
  renderGrid();
}

// Technique names used by the tactic engine below. Every deduction is taught
// as Name → Rule (the general principle) → Here (how it applies right now) —
// see docs/features/coaching-system.md for the full catalogue.
const T_LASTSPOT = '🎯 Last Spot';
const T_LINELOCK = '📏 Line Lock';
const T_CROWDING = '👥 Crowding';
const T_SQUEEZE = '🤏 Shared Shadow';
const T_WHATIF = '🤔 What-If';
const T_BEYOND = '🧩 Beyond the Rules';

function generateHintText() {
  const { solution, grid, customColors, size: n, importedCats, revealedRows, xMarks } = state;
  const named = customColors ? namedCustomColors(customColors) : null;
  const cName = (ci) => named ? named[ci] : (COLORS[ci]?.name ?? `Color ${ci + 1}`);

  // Build current placed state from revealedRows + importedCats
  const usedCols = new Set();
  const usedColors = new Set();
  const cats = [];
  const placedRowSet = new Set();
  for (const ic of (importedCats || [])) {
    usedCols.add(ic.col);
    usedColors.add(grid[ic.row][ic.col]);
    cats.push({ row: ic.row, col: ic.col });
    placedRowSet.add(ic.row);
  }
  for (const r of revealedRows) {
    if (placedRowSet.has(r)) continue;
    usedCols.add(solution[r]);
    usedColors.add(grid[r][solution[r]]);
    cats.push({ row: r, col: solution[r] });
    placedRowSet.add(r);
  }

  // A cell is valid if: row unplaced, cell colored, col unused, color unused, not X-marked, no king-move clash
  const isValid = (r, c) => {
    if (placedRowSet.has(r)) return false;
    const ci = grid[r][c];
    if (ci < 0 || usedCols.has(c) || usedColors.has(ci)) return false;
    if (xMarks?.[r]?.[c]) return false;
    return !cats.some(p => Math.abs(p.row - r) === 1 && Math.abs(p.col - c) <= 1);
  };

  const allRegionCells = (ci) => {
    const cells = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (grid[r][c] === ci) cells.push({ row: r, col: c });
    return cells;
  };

  const unplacedColors = [];
  for (let ci = 0; ci < n; ci++) {
    if (!usedColors.has(ci)) unplacedColors.push(ci);
  }

  // Returns all k-element subsets of arr
  function combinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    return [
      ...combinations(rest, k - 1).map(c => [first, ...c]),
      ...combinations(rest, k),
    ];
  }

  // Trail of techniques whose full scan found nothing before the one that
  // fires — shown dimmed above the lesson so the player learns what to check
  // (and in what order) even when the simple stuff doesn't apply here.
  const checked = [];
  const noteChecked = (name) => { if (checked[checked.length - 1] !== name) checked.push(name); };

  // ── Last Spot — by color region ─────────────────────────────────────────
  // Each color gets exactly one cat. If a region has exactly one open cell left,
  // that's where the cat goes.
  for (const ci of unplacedColors) {
    const regionCells = allRegionCells(ci);
    const valid = regionCells.filter(({ row, col }) => isValid(row, col));
    if (valid.length === 1) {
      const { row, col } = valid[0];
      return {
        name: T_LASTSPOT,
        rule: 'Each color gets exactly one cat — if only one of its cells is still open, that must be it.',
        here: `${cName(ci)} has a single open cell left: row ${row + 1}, col ${col + 1}.`,
        cells: [
          { row, col, role: 'cat' },
          ...regionCells.filter(c => !(c.row === row && c.col === col)).map(c => ({ ...c, role: 'region' })),
        ],
        action: { type: 'cat', row, col },
      };
    }
  }

  // ── Last Spot — by row ───────────────────────────────────────────────────
  // Every row needs exactly one cat. If a row is down to one open cell, that's
  // where its cat goes.
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    const valid = [];
    for (let c = 0; c < n; c++) if (isValid(r, c)) valid.push(c);
    if (valid.length === 1) {
      const col = valid[0];
      const ci = grid[r][col];
      const locked = [];
      for (let c = 0; c < n; c++) if (c !== col) locked.push({ row: r, col: c, role: 'locked' });
      return {
        name: T_LASTSPOT,
        rule: 'Every row needs a cat — if a row is down to one open cell, the cat goes there.',
        here: `Row ${r + 1} has only row ${r + 1}, col ${col + 1} open — place the ${cName(ci)} cat there.`,
        cells: [{ row: r, col, role: 'cat' }, ...locked],
        action: { type: 'cat', row: r, col },
      };
    }
  }

  // ── Last Spot — by column ────────────────────────────────────────────────
  // Every column needs exactly one cat. If a column is down to one open cell,
  // that's where its cat goes.
  for (let c = 0; c < n; c++) {
    if (usedCols.has(c)) continue;
    const valid = [];
    for (let r = 0; r < n; r++) if (isValid(r, c)) valid.push(r);
    if (valid.length === 1) {
      const row = valid[0];
      const ci = grid[row][c];
      const locked = [];
      for (let r = 0; r < n; r++) if (r !== row) locked.push({ row: r, col: c, role: 'locked' });
      return {
        name: T_LASTSPOT,
        rule: 'Every column needs a cat — if a column is down to one open cell, the cat goes there.',
        here: `Column ${c + 1} has only row ${row + 1}, col ${c + 1} open — place the ${cName(ci)} cat there.`,
        cells: [{ row, col: c, role: 'cat' }, ...locked],
        action: { type: 'cat', row, col: c },
      };
    }
  }
  noteChecked(T_LASTSPOT);

  // ── Line Lock — color confined to a line ─────────────────────────────────
  // If all of a color's open cells sit in one row, that color owns the row —
  // no other color can use it, and the region can't use any other row either.
  for (const ci of unplacedColors) {
    const regionCells = allRegionCells(ci);
    const validCells = regionCells.filter(({ row, col }) => isValid(row, col));
    const validRows = new Set(validCells.map(({ row }) => row));
    if (validRows.size !== 1) continue;
    const lr = [...validRows][0];
    const toMark = [];
    for (const { row, col } of regionCells)
      if (row !== lr && !xMarks?.[row]?.[col]) toMark.push({ row, col });
    for (let c = 0; c < n; c++)
      if (grid[lr][c] !== ci && isValid(lr, c) && !xMarks?.[lr]?.[c]) toMark.push({ row: lr, col: c });
    if (toMark.length === 0) continue;
    const validInRow = validCells.filter(({ row }) => row === lr);
    const hasVectorElim = toMark.some(({ row }) => row === lr);
    const here = hasVectorElim
      ? `${cName(ci)} only fits in row ${lr + 1} — cross the other colors out of row ${lr + 1} (and any of ${cName(ci)}'s own cells elsewhere).`
      : `${cName(ci)} only fits in row ${lr + 1} — cross out the rest of its cells elsewhere.`;
    return {
      name: T_LINELOCK,
      rule: "If all of a color's open cells sit in one row, that color owns the row — nobody else can use it.",
      here,
      cells: [
        ...validInRow.map(c => ({ ...c, role: 'cat' })),
        ...toMark.map(c => ({ ...c, role: c.row !== lr ? 'region' : 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
      checked: [...checked],
    };
  }

  // ── Line Lock — column ───────────────────────────────────────────────────
  // Mirror of the row case.
  for (const ci of unplacedColors) {
    const regionCells = allRegionCells(ci);
    const validCells = regionCells.filter(({ row, col }) => isValid(row, col));
    const validCols = new Set(validCells.map(({ col }) => col));
    if (validCols.size !== 1) continue;
    const lc = [...validCols][0];
    const toMark = [];
    for (const { row, col } of regionCells)
      if (col !== lc && !xMarks?.[row]?.[col]) toMark.push({ row, col });
    for (let r = 0; r < n; r++)
      if (grid[r][lc] !== ci && isValid(r, lc) && !xMarks?.[r]?.[lc]) toMark.push({ row: r, col: lc });
    if (toMark.length === 0) continue;
    const validInCol = validCells.filter(({ col }) => col === lc);
    const hasVectorElim = toMark.some(({ col }) => col === lc);
    const here = hasVectorElim
      ? `${cName(ci)} only fits in column ${lc + 1} — cross the other colors out of column ${lc + 1} (and any of ${cName(ci)}'s own cells elsewhere).`
      : `${cName(ci)} only fits in column ${lc + 1} — cross out the rest of its cells elsewhere.`;
    return {
      name: T_LINELOCK,
      rule: "If all of a color's open cells sit in one column, that color owns the column — nobody else can use it.",
      here,
      cells: [
        ...validInCol.map(c => ({ ...c, role: 'cat' })),
        ...toMark.map(c => ({ ...c, role: c.col !== lc ? 'region' : 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
      checked: [...checked],
    };
  }

  // ── Line Lock — line confined to a color (reverse) ───────────────────────
  // If all of a ROW's open cells happen to be the same color, that row can
  // only be filled by that color — even if the color also has candidates
  // elsewhere. Cross that color out everywhere outside this row.
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    const validCells = [];
    for (let c = 0; c < n; c++) if (isValid(r, c)) validCells.push({ row: r, col: c });
    if (validCells.length < 1) continue;
    const colorsHere = new Set(validCells.map(({ col }) => grid[r][col]));
    if (colorsHere.size !== 1) continue;
    const ci = [...colorsHere][0];
    const toMark = allRegionCells(ci).filter(({ row, col }) => row !== r && isValid(row, col) && !xMarks?.[row]?.[col]);
    if (toMark.length === 0) continue;
    return {
      name: T_LINELOCK,
      rule: "If all of a row's open cells are the same color, that row can only be filled by that color — cross that color out everywhere else, even if it still has other candidates.",
      here: `Row ${r + 1} only has open ${cName(ci)} cells left — ${cName(ci)}'s cat is in row ${r + 1}, so cross out its cells everywhere else.`,
      cells: [
        ...validCells.map(c => ({ ...c, role: 'cat' })),
        ...toMark.map(c => ({ ...c, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
      checked: [...checked],
    };
  }

  // ── Line Lock — line confined to a color (reverse, column) ───────────────
  // Mirror of the row case.
  for (let c = 0; c < n; c++) {
    if (usedCols.has(c)) continue;
    const validCells = [];
    for (let r = 0; r < n; r++) if (isValid(r, c)) validCells.push({ row: r, col: c });
    if (validCells.length < 1) continue;
    const colorsHere = new Set(validCells.map(({ row }) => grid[row][c]));
    if (colorsHere.size !== 1) continue;
    const ci = [...colorsHere][0];
    const toMark = allRegionCells(ci).filter(({ row, col }) => col !== c && isValid(row, col) && !xMarks?.[row]?.[col]);
    if (toMark.length === 0) continue;
    return {
      name: T_LINELOCK,
      rule: "If all of a column's open cells are the same color, that column can only be filled by that color — cross that color out everywhere else, even if it still has other candidates.",
      here: `Column ${c + 1} only has open ${cName(ci)} cells left — ${cName(ci)}'s cat is in column ${c + 1}, so cross out its cells everywhere else.`,
      cells: [
        ...validCells.map(cc => ({ ...cc, role: 'cat' })),
        ...toMark.map(cc => ({ ...cc, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
      checked: [...checked],
    };
  }
  noteChecked(T_LINELOCK);

  // ── Crowding — rows (K = 2..4) ───────────────────────────────────────────
  // If K colors are collectively confined to the same K rows, those rows are
  // fully booked by those colors — every other color is squeezed out of them.
  // K=2 is the classic "naked pair"; K=3,4 are the triple/quad.
  for (let k = 2; k <= Math.min(4, unplacedColors.length); k++) {
    const colorRowSets = unplacedColors.map(ci => ({
      ci,
      rows: new Set(allRegionCells(ci).filter(({ row, col }) => isValid(row, col)).map(({ row }) => row)),
    }));
    for (const combo of combinations(colorRowSets, k)) {
      const union = new Set(combo.flatMap(({ rows }) => [...rows]));
      if (union.size !== k) continue;
      const colorSet = new Set(combo.map(({ ci }) => ci));
      const rowList = [...union].sort((a, b) => a - b);
      const toMark = [];
      for (const r of rowList)
        for (let c = 0; c < n; c++)
          if (!colorSet.has(grid[r][c]) && isValid(r, c) && !xMarks?.[r]?.[c])
            toMark.push({ row: r, col: c });
      if (toMark.length === 0) continue;
      const names = combo.map(({ ci }) => cName(ci)).join(', ');
      const rowStr = rowList.map(r => r + 1).join(', ');
      return {
        name: T_CROWDING,
        rule: `If ${k} colors can only fit in the same ${k} rows, those rows are fully booked — every other color is squeezed out of them.`,
        here: `${names} all live in rows ${rowStr} — cross everyone else out of those rows.`,
        cells: [
          ...combo.flatMap(({ ci }) => allRegionCells(ci).filter(({ row, col }) => isValid(row, col)).map(c => ({ ...c, role: 'cat' }))),
          ...toMark.map(c => ({ ...c, role: 'locked' })),
        ],
        action: { type: 'xmarks', cells: toMark },
        checked: [...checked],
      };
    }
  }

  // ── Crowding — columns (K = 2..4) ────────────────────────────────────────
  // Mirror of the row case.
  for (let k = 2; k <= Math.min(4, unplacedColors.length); k++) {
    const colorColSets = unplacedColors.map(ci => ({
      ci,
      cols: new Set(allRegionCells(ci).filter(({ row, col }) => isValid(row, col)).map(({ col }) => col)),
    }));
    for (const combo of combinations(colorColSets, k)) {
      const union = new Set(combo.flatMap(({ cols }) => [...cols]));
      if (union.size !== k) continue;
      const colorSet = new Set(combo.map(({ ci }) => ci));
      const colList = [...union].sort((a, b) => a - b);
      const toMark = [];
      for (const c of colList)
        for (let r = 0; r < n; r++)
          if (!colorSet.has(grid[r][c]) && isValid(r, c) && !xMarks?.[r]?.[c])
            toMark.push({ row: r, col: c });
      if (toMark.length === 0) continue;
      const names = combo.map(({ ci }) => cName(ci)).join(', ');
      const colStr = colList.map(c => c + 1).join(', ');
      return {
        name: T_CROWDING,
        rule: `If ${k} colors can only fit in the same ${k} columns, those columns are fully booked — every other color is squeezed out of them.`,
        here: `${names} all live in columns ${colStr} — cross everyone else out of those columns.`,
        cells: [
          ...combo.flatMap(({ ci }) => allRegionCells(ci).filter(({ row, col }) => isValid(row, col)).map(c => ({ ...c, role: 'cat' }))),
          ...toMark.map(c => ({ ...c, role: 'locked' })),
        ],
        action: { type: 'xmarks', cells: toMark },
        checked: [...checked],
      };
    }
  }

  // ── Hidden Crowding — rows (K = 2..4) ────────────────────────────────────
  // Dual of Crowding: if K rows can only be reached by K colors combined (no
  // other color has any open cell in any of those rows), those K colors MUST
  // place their cats inside those K rows — each row needs one, and only these
  // colors can supply it. Cross those colors' cells outside the K rows.
  for (let k = 2; k <= Math.min(4, n); k++) {
    const rowSets = [];
    for (let r = 0; r < n; r++) {
      if (placedRowSet.has(r)) continue;
      const colorsHere = new Set();
      for (let c = 0; c < n; c++) if (isValid(r, c)) colorsHere.add(grid[r][c]);
      rowSets.push({ r, colors: colorsHere });
    }
    for (const combo of combinations(rowSets, k)) {
      const union = new Set(combo.flatMap(({ colors }) => [...colors]));
      if (union.size !== k) continue;
      const rowSet = new Set(combo.map(({ r }) => r));
      const toMark = [];
      for (const ci of union)
        for (const { row, col } of allRegionCells(ci))
          if (!rowSet.has(row) && isValid(row, col) && !xMarks?.[row]?.[col]) toMark.push({ row, col });
      if (toMark.length === 0) continue;
      const names = [...union].map(ci => cName(ci)).join(', ');
      const rowStr = [...rowSet].sort((a, b) => a - b).map(r => r + 1).join(', ');
      return {
        name: T_CROWDING,
        rule: `If K rows can only be reached by K colors combined (no other color has an open cell in any of them), those colors must place inside those rows — cross their other cells out everywhere else.`,
        here: `Only ${names} can reach rows ${rowStr} — their cats must go there, so cross their other cells out everywhere else.`,
        cells: [
          ...combo.flatMap(({ r }) => { const row = []; for (let c = 0; c < n; c++) if (isValid(r, c)) row.push({ row: r, col: c, role: 'cat' }); return row; }),
          ...toMark.map(c => ({ ...c, role: 'locked' })),
        ],
        action: { type: 'xmarks', cells: toMark },
        checked: [...checked],
      };
    }
  }

  // ── Hidden Crowding — columns (K = 2..4) ─────────────────────────────────
  // Mirror of the row case.
  for (let k = 2; k <= Math.min(4, n); k++) {
    const colSets = [];
    for (let c = 0; c < n; c++) {
      if (usedCols.has(c)) continue;
      const colorsHere = new Set();
      for (let r = 0; r < n; r++) if (isValid(r, c)) colorsHere.add(grid[r][c]);
      colSets.push({ c, colors: colorsHere });
    }
    for (const combo of combinations(colSets, k)) {
      const union = new Set(combo.flatMap(({ colors }) => [...colors]));
      if (union.size !== k) continue;
      const colSet = new Set(combo.map(({ c }) => c));
      const toMark = [];
      for (const ci of union)
        for (const { row, col } of allRegionCells(ci))
          if (!colSet.has(col) && isValid(row, col) && !xMarks?.[row]?.[col]) toMark.push({ row, col });
      if (toMark.length === 0) continue;
      const names = [...union].map(ci => cName(ci)).join(', ');
      const colStr = [...colSet].sort((a, b) => a - b).map(c => c + 1).join(', ');
      return {
        name: T_CROWDING,
        rule: `If K columns can only be reached by K colors combined (no other color has an open cell in any of them), those colors must place inside those columns — cross their other cells out everywhere else.`,
        here: `Only ${names} can reach columns ${colStr} — their cats must go there, so cross their other cells out everywhere else.`,
        cells: [
          ...combo.flatMap(({ c }) => { const col = []; for (let r = 0; r < n; r++) if (isValid(r, c)) col.push({ row: r, col: c, role: 'cat' }); return col; }),
          ...toMark.map(c => ({ ...c, role: 'locked' })),
        ],
        action: { type: 'xmarks', cells: toMark },
        checked: [...checked],
      };
    }
  }
  noteChecked(T_CROWDING);

  // ── Shared Shadow — generalized common elimination ──────────────────────
  // Take any unit that still needs a cat — a color region, a row, or a
  // column — and look at ALL of its remaining candidate cells (any count, not
  // just 2–3). A cat placed at any candidate u eliminates: u's row, u's
  // column, u's color, and its 8 king-move neighbours. If some other open
  // cell is eliminated by EVERY candidate in the unit (whichever one wins),
  // that cell is dead regardless of which candidate gets the cat — no
  // hypothesis needed. This subsumes and generalizes the old fixed-shape
  // "line segment / diagonal pinch / conjugate pair" special cases: it works
  // for any number of candidates and catches everything they did (and more,
  // since it also reasons about shared color/line, not just king-move touch).
  const kills = (u, x) =>
    u.row === x.row || u.col === x.col ||
    grid[u.row][u.col] === grid[x.row][x.col] ||
    (Math.abs(u.row - x.row) <= 1 && Math.abs(u.col - x.col) <= 1);

  const sharedShadowUnits = [];
  for (const ci of unplacedColors) {
    const v = allRegionCells(ci).filter(({ row, col }) => isValid(row, col));
    if (v.length >= 2) sharedShadowUnits.push({ v, label: cName(ci), kind: 'color' });
  }
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    const v = []; for (let c = 0; c < n; c++) if (isValid(r, c)) v.push({ row: r, col: c });
    if (v.length >= 2) sharedShadowUnits.push({ v, label: `Row ${r + 1}`, kind: 'row' });
  }
  for (let c = 0; c < n; c++) {
    if (usedCols.has(c)) continue;
    const v = []; for (let r = 0; r < n; r++) if (isValid(r, c)) v.push({ row: r, col: c });
    if (v.length >= 2) sharedShadowUnits.push({ v, label: `Column ${c + 1}`, kind: 'col' });
  }
  for (const { v, label, kind } of sharedShadowUnits) {
    const toMark = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!isValid(r, c) || xMarks?.[r]?.[c]) continue;
        if (v.some(u => u.row === r && u.col === c)) continue;
        if (v.every(u => kills(u, { row: r, col: c }))) toMark.push({ row: r, col: c });
      }
    }
    if (toMark.length === 0) continue;
    const subject = kind === 'color' ? label : `${label}'s cat`;
    return {
      name: T_SQUEEZE,
      rule: "Look at ALL of a color's (or row's, or column's) remaining candidates. If every single one of them would eliminate a certain cell — through its row, column, color, or by touching it — that cell is dead no matter which candidate wins.",
      here: `Wherever ${subject} ends up, it always eliminates these cells too — cross them out.`,
      cells: [
        ...v.map(c => ({ ...c, role: 'cat' })),
        ...toMark.map(c => ({ ...c, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
      checked: [...checked],
    };
  }
  noteChecked(T_SQUEEZE);

  // ── What-If — batched contradiction test ────────────────────────────────
  // Test every open cell: pretend a cat sits there, then keep placing any cat
  // that becomes forced (a row/column/color down to a single valid cell). If
  // that chain ever empties some row, column, or color, the test cell was
  // impossible. All tests below run against the SAME current board snapshot,
  // so they're independent of each other and safe to batch into one step —
  // this collapses what could be dozens of individual eliminations (one tested
  // cell at a time) into a single Apply, which is what actually opens up the
  // simpler Last Spot / Line Lock rules on the next press.
  const simIsValid = (r, c, sCols, sColors, sCats) => {
    if (sCats.some(p => p.row === r)) return false;
    const ci = grid[r][c];
    if (ci < 0 || sCols.has(c) || sColors.has(ci)) return false;
    if (xMarks?.[r]?.[c]) return false;
    return !sCats.some(p => Math.abs(p.row - r) === 1 && Math.abs(p.col - c) <= 1);
  };

  const testCell = (r0, c0) => {
    const ci0 = grid[r0][c0];
    const sCols = new Set([...usedCols, c0]);
    const sColors = new Set([...usedColors, ci0]);
    const sCats = [...cats, { row: r0, col: c0 }];
    const sPlaced = new Set([...placedRowSet, r0]);
    const chain = [];
    for (let guard = 0; guard < n * n; guard++) {
      let forced = null, why = null;
      for (let rr = 0; rr < n && !why; rr++) {
        if (sPlaced.has(rr)) continue;
        const valids = [];
        for (let cc = 0; cc < n; cc++) if (simIsValid(rr, cc, sCols, sColors, sCats)) valids.push(cc);
        if (valids.length === 0) why = `row ${rr + 1}`;
        else if (valids.length === 1 && !forced) forced = { row: rr, col: valids[0] };
      }
      for (let cc = 0; cc < n && !why; cc++) {
        if (sCols.has(cc)) continue;
        const valids = [];
        for (let rr = 0; rr < n; rr++) if (simIsValid(rr, cc, sCols, sColors, sCats)) valids.push(rr);
        if (valids.length === 0) why = `column ${cc + 1}`;
        else if (valids.length === 1 && !forced) forced = { row: valids[0], col: cc };
      }
      for (const ci2 of unplacedColors) {
        if (why || sColors.has(ci2)) continue;
        const valids = [];
        for (let rr = 0; rr < n; rr++)
          for (let cc = 0; cc < n; cc++)
            if (grid[rr][cc] === ci2 && simIsValid(rr, cc, sCols, sColors, sCats)) valids.push({ row: rr, col: cc });
        if (valids.length === 0) why = `the ${cName(ci2)} region`;
        else if (valids.length === 1 && !forced) forced = valids[0];
      }
      if (why) return why;
      if (!forced) return null;
      sCats.push(forced); sCols.add(forced.col);
      sColors.add(grid[forced.row][forced.col]); sPlaced.add(forced.row);
      chain.push(forced);
    }
    return null;
  };

  const deadEnds = [];
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    for (let c = 0; c < n; c++) {
      if (!isValid(r, c)) continue;
      const why = testCell(r, c);
      if (why) deadEnds.push({ row: r, col: c, why });
    }
  }
  if (deadEnds.length > 0) {
    const reasons = [...new Set(deadEnds.map(d => d.why))];
    const reasonStr = reasons.length <= 4
      ? reasons.join(', ')
      : `${reasons.slice(0, 3).join(', ')}, and ${reasons.length - 3} more`;
    const here = deadEnds.length === 1
      ? `A cat at row ${deadEnds[0].row + 1}, col ${deadEnds[0].col + 1} eventually leaves ${deadEnds[0].why} with no valid cell — cross it out.`
      : `Testing ${deadEnds.length} cells shows each one eventually leaves something with no valid cell — cross them all out. (Dead ends: ${reasonStr}.)`;
    return {
      name: T_WHATIF,
      rule: 'Test a cell: pretend the cat sits there and follow every move that becomes forced. If some row, column, or color ends up with nowhere to go, the test cell was impossible.',
      here,
      cells: deadEnds.map(d => ({ row: d.row, col: d.col, role: 'locked' })),
      action: { type: 'xmarks', cells: deadEnds.map(d => ({ row: d.row, col: d.col })) },
      checked: [...checked],
    };
  }
  noteChecked(T_WHATIF);

  // ── Beyond the Rules — fallback ──────────────────────────────────────────
  // No technique above resolved this step. This should be rare now that
  // What-If is exhaustive over every open cell; it's a safety net for
  // positions that genuinely need full search.
  const importedRowSet = new Set((importedCats || []).map(ic => ic.row));
  let fbRow = -1;
  for (let r = 0; r < n; r++) {
    if (!placedRowSet.has(r) && !importedRowSet.has(r)) { fbRow = r; break; }
  }
  if (fbRow === -1) {
    return { name: '✅ Done', rule: '', here: 'All cats are placed!', cells: [], action: null };
  }
  const fbCol = solution[fbRow];
  const fbCi = grid[fbRow][fbCol];
  return {
    name: T_BEYOND,
    rule: "No single technique cracks this position — the solver used full search to be sure.",
    here: `The ${cName(fbCi)} cat belongs at row ${fbRow + 1}, col ${fbCol + 1}.`,
    cells: [{ row: fbRow, col: fbCol, role: 'cat' }],
    action: { type: 'cat', row: fbRow, col: fbCol },
    checked: [...checked],
  };
}

// ── Image import ───────────────────────────────────────────────────────────

function handleImageResult(result) {
  // Adopt the detected grid dimension (AI may return a different size)
  const n = Math.max(5, Math.min(12, result.grid.length));
  if (n !== state.size) {
    state.size = n;
    document.getElementById('size-slider').value = n;
    document.getElementById('size-label').textContent = `${n} × ${n}`;
    if (state.selectedColor !== ERASER && state.selectedColor >= n) state.selectedColor = 0;
  }

  state.grid = result.grid;
  state.customColors = result.colors;
  state.xMarks = result.xMarks || null;
  state.importedCats = result.cats || [];
  state.solution = null;
  state.revealedRows.clear();
  clearHint();
  document.getElementById('ai-btn').hidden = false;
  if (result.colorCount < state.size) {
    const el = document.getElementById('status');
    el.textContent = `Only ${result.colorCount} colors detected — is the grid really ${state.size}×${state.size}?`;
    el.className = 'status warn';
  }
  renderPalette();
  renderGrid();
}

// ── Solver integration ─────────────────────────────────────────────────────

function ensureSolution() {
  if (state.solution !== null) return true;

  const uncolored = countUncolored();
  if (uncolored > 0) {
    const el = document.getElementById('status');
    el.textContent = `${uncolored} cell${uncolored !== 1 ? 's' : ''} still uncolored`;
    el.className = 'status warn';
    return false;
  }

  const colors = countColors();
  if (colors !== state.size) {
    const el = document.getElementById('status');
    el.textContent = `Need exactly ${state.size} colors — found ${colors}`;
    el.className = 'status warn';
    return false;
  }

  const result = solveMeowdoku(state.grid, state.size);
  if (!result) {
    const el = document.getElementById('status');
    el.textContent = 'No solution found — check your color regions';
    el.className = 'status warn';
    return false;
  }

  state.solution = result;
  return true;
}

function runHint() {
  if (!ensureSolution()) return;
  const totalShown = state.revealedRows.size + (state.importedCats || []).length;
  if (totalShown >= state.size) {
    state.revealedRows.clear();
    clearHint();
    return;
  }
  // Reveal next row in sequential order
  const importedRowSet = new Set((state.importedCats || []).map(ic => ic.row));
  for (let r = 0; r < state.size; r++) {
    if (!state.revealedRows.has(r) && !importedRowSet.has(r)) {
      state.revealedRows.add(r);
      break;
    }
  }
  clearHint();
}

function runExplain() {
  if (!ensureSolution()) return;
  const totalShown = state.revealedRows.size + (state.importedCats || []).length;
  if (totalShown >= state.size) {
    state.revealedRows.clear();
    clearHint();
    return;
  }
  try {
    const hint = generateHintText();
    showHint(hint, hint.cells, hint.action);
  } catch (e) {
    showHint({ name: '⚠️ Error', rule: '', here: 'Could not generate an explanation for this position.' }, [], null);
    console.error('runExplain error:', e);
  }
}

// Mark X on every cell a cat at (row, col) eliminates: its row, column,
// color region, and the 8 king-move neighbours (but not the cat cell itself).
function markCatEliminations(row, col) {
  if (!state.xMarks) {
    state.xMarks = Array.from({ length: state.size }, () => new Array(state.size).fill(false));
  }
  const n = state.size;
  const ci = state.grid[row][col];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r === row && c === col) continue;
      const sameRow = r === row;
      const sameCol = c === col;
      const sameColor = ci >= 0 && state.grid[r][c] === ci;
      const touching = Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1;
      if (sameRow || sameCol || sameColor || touching) state.xMarks[r][c] = true;
    }
  }
}

function runApply() {
  const action = state.pendingAction;
  if (!action) return;
  if (action.type === 'cat') {
    state.revealedRows.add(action.row);
    markCatEliminations(action.row, action.col);
  } else if (action.type === 'xmarks') {
    if (!state.xMarks) {
      state.xMarks = Array.from({ length: state.size }, () => new Array(state.size).fill(false));
    }
    for (const { row, col } of action.cells) {
      state.xMarks[row][col] = true;
    }
  }
  clearHint();
}

function runSolveAll() {
  const statusEl = document.getElementById('status');

  const uncolored = countUncolored();
  if (uncolored > 0) {
    statusEl.textContent = `${uncolored} cell${uncolored !== 1 ? 's' : ''} still uncolored`;
    statusEl.className = 'status warn';
    return;
  }

  const colors = countColors();
  if (colors !== state.size) {
    statusEl.textContent = `Need exactly ${state.size} colors — found ${colors}`;
    statusEl.className = 'status warn';
    return;
  }

  statusEl.textContent = 'Solving…';
  statusEl.className = 'status';
  clearHint();

  setTimeout(() => {
    const result = solveMeowdoku(state.grid, state.size);
    if (result) {
      state.solution = result;
      for (let r = 0; r < state.size; r++) state.revealedRows.add(r);
      renderGrid();
    } else {
      statusEl.textContent = 'No solution found — check your color regions';
      statusEl.className = 'status warn';
    }
  }, 16);
}

// ── Init ───────────────────────────────────────────────────────────────────

state.grid = createGrid(state.size);
document.documentElement.style.setProperty('--grid-size', state.size);
renderPalette();
renderGrid();
bindEvents();
