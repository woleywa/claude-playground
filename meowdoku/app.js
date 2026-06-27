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
  box.textContent = '';
  box.classList.remove('visible');
  document.getElementById('hint-actions').hidden = true;
  renderGrid();
}

function showHint(text, cells = [], action = null) {
  state.hintCells = cells;
  state.pendingAction = action;
  const box = document.getElementById('hint-box');
  box.textContent = text;
  box.classList.add('visible');
  document.getElementById('hint-actions').hidden = (action === null);
  renderGrid();
}

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

  // ── Tactic 1 — Forced region ────────────────────────────────────────────
  // A color region has exactly one valid cell left → place the cat there.
  for (const ci of unplacedColors) {
    const regionCells = allRegionCells(ci);
    const valid = regionCells.filter(({ row, col }) => isValid(row, col));
    if (valid.length === 1) {
      const { row, col } = valid[0];
      return {
        text: `The ${cName(ci)} region has only one open cell — place the cat at row ${row + 1}, col ${col + 1}.`,
        cells: [
          { row, col, role: 'cat' },
          ...regionCells.filter(c => !(c.row === row && c.col === col)).map(c => ({ ...c, role: 'region' })),
        ],
        action: { type: 'cat', row, col },
      };
    }
  }

  // ── Tactic 2 — Forced row ───────────────────────────────────────────────
  // A row has exactly one valid column → place the cat there.
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
        text: `Row ${r + 1} has only one valid column — place the ${cName(ci)} cat at col ${col + 1}.`,
        cells: [{ row: r, col, role: 'cat' }, ...locked],
        action: { type: 'cat', row: r, col },
      };
    }
  }

  // ── Tactic 3 — Forced column ────────────────────────────────────────────
  // A column has exactly one valid row → place the cat there.
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
        text: `Column ${c + 1} has only one valid row — place the ${cName(ci)} cat at row ${row + 1}.`,
        cells: [{ row, col: c, role: 'cat' }, ...locked],
        action: { type: 'cat', row, col: c },
      };
    }
  }

  // ── Tactic 4 — Region confined to one row (+ Vector Isolation) ──────────
  // All valid cells for a color fall in the same row.
  // Action A: cross out the region's own cells outside that row.
  // Action B (Vector Isolation): since that row is "owned" by this region,
  //   cross out other colors' valid cells in that row too.
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
    const text = hasVectorElim
      ? `The ${cName(ci)} region can only go in row ${lr + 1} — it claims that row, so cross out other colors there and any region cells outside the row.`
      : `The ${cName(ci)} region can only go in row ${lr + 1} — cross out the rest of the region.`;
    return {
      text,
      cells: [
        ...validInRow.map(c => ({ ...c, role: 'cat' })),
        ...toMark.map(c => ({ ...c, role: c.row !== lr ? 'region' : 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
    };
  }

  // ── Tactic 5 — Region confined to one column (+ Vector Isolation) ───────
  // Mirror of Tactic 4 for columns.
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
    const text = hasVectorElim
      ? `The ${cName(ci)} region can only go in column ${lc + 1} — it claims that column, so cross out other colors there and any region cells outside the column.`
      : `The ${cName(ci)} region can only go in column ${lc + 1} — cross out the rest of the region.`;
    return {
      text,
      cells: [
        ...validInCol.map(c => ({ ...c, role: 'cat' })),
        ...toMark.map(c => ({ ...c, role: c.col !== lc ? 'region' : 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
    };
  }

  // ── Tactic 6 — Set Saturation, rows (K = 2..4) ──────────────────────────
  // If K regions are collectively confined to the same K rows, those rows are
  // fully consumed by those regions. Cross out any other color's valid cells in
  // those rows. K=2 is the classic "naked pair"; K=3,4 are the triple/quad.
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
        text: `${names} are all confined to rows ${rowStr} — those ${k} regions fill all ${k} cat slots in those rows, so cross out other colors there.`,
        cells: [
          ...combo.flatMap(({ ci }) => allRegionCells(ci).filter(({ row, col }) => isValid(row, col)).map(c => ({ ...c, role: 'cat' }))),
          ...toMark.map(c => ({ ...c, role: 'locked' })),
        ],
        action: { type: 'xmarks', cells: toMark },
      };
    }
  }

  // ── Tactic 7 — Set Saturation, columns (K = 2..4) ───────────────────────
  // Mirror of Tactic 6 for columns.
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
        text: `${names} are all confined to columns ${colStr} — those ${k} regions fill all ${k} cat slots in those columns, so cross out other colors there.`,
        cells: [
          ...combo.flatMap(({ ci }) => allRegionCells(ci).filter(({ row, col }) => isValid(row, col)).map(c => ({ ...c, role: 'cat' }))),
          ...toMark.map(c => ({ ...c, role: 'locked' })),
        ],
        action: { type: 'xmarks', cells: toMark },
      };
    }
  }

  // ── Tactic 8 — Line-Segment Halo ────────────────────────────────────────
  // When a region's valid cells form a contiguous segment of 2–3 cells in one
  // row or column, any external cell that is king-move adjacent to EVERY cell
  // of that segment is blocked — whichever segment cell gets the cat, it will
  // always touch that external cell.
  for (const ci of unplacedColors) {
    const validCells = allRegionCells(ci).filter(({ row, col }) => isValid(row, col));
    if (validCells.length < 2 || validCells.length > 3) continue;
    const segRows = new Set(validCells.map(({ row }) => row));
    const segCols = new Set(validCells.map(({ col }) => col));
    let segment = null;
    if (segRows.size === 1) {
      const r = [...segRows][0];
      const sortedCols = validCells.map(({ col }) => col).sort((a, b) => a - b);
      if (sortedCols[sortedCols.length - 1] - sortedCols[0] === sortedCols.length - 1)
        segment = { dir: 'row', fixed: r, span: sortedCols };
    } else if (segCols.size === 1) {
      const c = [...segCols][0];
      const sortedRows = validCells.map(({ row }) => row).sort((a, b) => a - b);
      if (sortedRows[sortedRows.length - 1] - sortedRows[0] === sortedRows.length - 1)
        segment = { dir: 'col', fixed: c, span: sortedRows };
    }
    if (!segment) continue;
    const haloMap = new Map();
    if (segment.dir === 'row') {
      const r = segment.fixed;
      for (let dr = -1; dr <= 1; dr += 2) {
        const nr = r + dr;
        if (nr < 0 || nr >= n) continue;
        for (let c = 0; c < n; c++) {
          if (segment.span.every(sc => Math.abs(c - sc) <= 1) && isValid(nr, c) && !xMarks?.[nr]?.[c])
            haloMap.set(`${nr},${c}`, { row: nr, col: c });
        }
      }
    } else {
      const c = segment.fixed;
      for (let dc = -1; dc <= 1; dc += 2) {
        const nc = c + dc;
        if (nc < 0 || nc >= n) continue;
        for (let r = 0; r < n; r++) {
          if (segment.span.every(sr => Math.abs(r - sr) <= 1) && isValid(r, nc) && !xMarks?.[r]?.[nc])
            haloMap.set(`${r},${nc}`, { row: r, col: nc });
        }
      }
    }
    if (haloMap.size === 0) continue;
    const toMark = [...haloMap.values()];
    const segLen = segment.span.length;
    const where = segment.dir === 'row'
      ? `row ${segment.fixed + 1}, cols ${segment.span.map(c => c + 1).join('–')}`
      : `column ${segment.fixed + 1}, rows ${segment.span.map(r => r + 1).join('–')}`;
    return {
      text: `The ${cName(ci)} region is squeezed into a ${segLen}-cell segment at ${where} — cells touching the whole segment are blocked by the king-move rule regardless of which cell gets the cat.`,
      cells: [
        ...validCells.map(c => ({ ...c, role: 'cat' })),
        ...toMark.map(c => ({ ...c, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
    };
  }

  // ── Tactic 9 — Diagonal Pinch ───────────────────────────────────────────
  // A region reduced to exactly two diagonally-adjacent cells forms a "pinch".
  // Any cell orthogonally adjacent to BOTH candidates is always blocked —
  // one of the two must get the cat, and either one would touch that cell.
  for (const ci of unplacedColors) {
    const validCells = allRegionCells(ci).filter(({ row, col }) => isValid(row, col));
    if (validCells.length !== 2) continue;
    const [a, b] = validCells;
    if (Math.abs(a.row - b.row) !== 1 || Math.abs(a.col - b.col) !== 1) continue;
    const toMark = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!isValid(r, c) || xMarks?.[r]?.[c]) continue;
        const orthA = Math.abs(r - a.row) + Math.abs(c - a.col) === 1;
        const orthB = Math.abs(r - b.row) + Math.abs(c - b.col) === 1;
        if (orthA && orthB) toMark.push({ row: r, col: c });
      }
    }
    if (toMark.length === 0) continue;
    return {
      text: `The ${cName(ci)} region is down to two diagonally-adjacent cells — any cell orthogonally touching both is blocked, since whichever one gets the cat will king-move into it.`,
      cells: [
        { ...a, role: 'cat' }, { ...b, role: 'cat' },
        ...toMark.map(c => ({ ...c, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
    };
  }

  // ── Tactic 10 — Conjugate Pair ──────────────────────────────────────────
  // When a row, column, or region is down to exactly 2 candidate cells, any
  // external cell that would be king-move blocked by BOTH candidates can be
  // eliminated — one of the two must be chosen, so both king-move zones apply.
  // Check rows:
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    const validCols = [];
    for (let c = 0; c < n; c++) if (isValid(r, c)) validCols.push(c);
    if (validCols.length !== 2) continue;
    const [c1, c2] = validCols;
    const toMark = [];
    for (let rr = 0; rr < n; rr++) {
      if (rr === r) continue;
      for (let cc = 0; cc < n; cc++) {
        if (!isValid(rr, cc) || xMarks?.[rr]?.[cc]) continue;
        if (Math.abs(rr - r) <= 1 && Math.abs(cc - c1) <= 1 && Math.abs(cc - c2) <= 1)
          toMark.push({ row: rr, col: cc });
      }
    }
    if (toMark.length === 0) continue;
    return {
      text: `Row ${r + 1} has only two possible cells (cols ${c1 + 1} and ${c2 + 1}) — cells adjacent to both are blocked whichever one gets the cat.`,
      cells: [
        { row: r, col: c1, role: 'cat' }, { row: r, col: c2, role: 'cat' },
        ...toMark.map(c => ({ ...c, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
    };
  }
  // Check columns:
  for (let c = 0; c < n; c++) {
    if (usedCols.has(c)) continue;
    const validRows = [];
    for (let r = 0; r < n; r++) if (isValid(r, c)) validRows.push(r);
    if (validRows.length !== 2) continue;
    const [r1, r2] = validRows;
    const toMark = [];
    for (let rr = 0; rr < n; rr++) {
      for (let cc = 0; cc < n; cc++) {
        if (cc === c || !isValid(rr, cc) || xMarks?.[rr]?.[cc]) continue;
        if (Math.abs(cc - c) <= 1 && Math.abs(rr - r1) <= 1 && Math.abs(rr - r2) <= 1)
          toMark.push({ row: rr, col: cc });
      }
    }
    if (toMark.length === 0) continue;
    return {
      text: `Column ${c + 1} has only two possible rows (rows ${r1 + 1} and ${r2 + 1}) — cells adjacent to both are blocked whichever one gets the cat.`,
      cells: [
        { row: r1, col: c, role: 'cat' }, { row: r2, col: c, role: 'cat' },
        ...toMark.map(c => ({ ...c, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
    };
  }
  // Check regions:
  for (const ci of unplacedColors) {
    const validCells = allRegionCells(ci).filter(({ row, col }) => isValid(row, col));
    if (validCells.length !== 2) continue;
    const [a, b] = validCells;
    const toMark = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if ((r === a.row && c === a.col) || (r === b.row && c === b.col)) continue;
        if (!isValid(r, c) || xMarks?.[r]?.[c]) continue;
        if (Math.abs(r - a.row) <= 1 && Math.abs(c - a.col) <= 1 &&
            Math.abs(r - b.row) <= 1 && Math.abs(c - b.col) <= 1)
          toMark.push({ row: r, col: c });
      }
    }
    if (toMark.length === 0) continue;
    return {
      text: `The ${cName(ci)} region is down to two cells — any cell adjacent to both is blocked regardless of which one gets the cat.`,
      cells: [
        { ...a, role: 'cat' }, { ...b, role: 'cat' },
        ...toMark.map(c => ({ ...c, role: 'locked' })),
      ],
      action: { type: 'xmarks', cells: toMark },
    };
  }

  // ── Tactic 11 — Forward-check contradiction ──────────────────────────────
  // For each valid cell, simulate placing a cat there and check whether any row,
  // column, or color region immediately drops to zero valid cells. If it does,
  // placing there is a logical contradiction — cross it out.
  const simIsValid = (r, c, sCols, sColors, sCats) => {
    if (sCats.some(p => p.row === r)) return false;
    const ci = grid[r][c];
    if (ci < 0 || sCols.has(c) || sColors.has(ci)) return false;
    if (xMarks?.[r]?.[c]) return false;
    return !sCats.some(p => Math.abs(p.row - r) === 1 && Math.abs(p.col - c) <= 1);
  };

  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    for (let c = 0; c < n; c++) {
      if (!isValid(r, c)) continue;
      const ci = grid[r][c];
      const sCols = new Set([...usedCols, c]);
      const sColors = new Set([...usedColors, ci]);
      const sCats = [...cats, { row: r, col: c }];
      const sPlaced = new Set([...placedRowSet, r]);
      let why = null;
      // Check all unplaced rows still have at least one valid cell
      for (let rr = 0; rr < n && !why; rr++) {
        if (sPlaced.has(rr)) continue;
        let ok = false;
        for (let cc = 0; cc < n && !ok; cc++)
          if (simIsValid(rr, cc, sCols, sColors, sCats)) ok = true;
        if (!ok) why = `row ${rr + 1} would have no valid placement`;
      }
      // Check all unplaced colors still have at least one valid cell
      for (const ci2 of unplacedColors) {
        if (why || ci2 === ci) continue;
        let ok = false;
        outer: for (let rr = 0; rr < n; rr++) {
          if (sPlaced.has(rr)) continue;
          for (let cc = 0; cc < n; cc++)
            if (grid[rr][cc] === ci2 && simIsValid(rr, cc, sCols, sColors, sCats)) { ok = true; break outer; }
        }
        if (!ok) why = `the ${cName(ci2)} region would have no valid cell`;
      }
      // Check all unplaced columns still have at least one valid cell
      for (let cc = 0; cc < n && !why; cc++) {
        if (sCols.has(cc)) continue;
        let ok = false;
        for (let rr = 0; rr < n && !ok; rr++)
          if (simIsValid(rr, cc, sCols, sColors, sCats)) ok = true;
        if (!ok) why = `column ${cc + 1} would have no valid placement`;
      }
      if (why) {
        return {
          text: `Placing a cat at row ${r + 1}, col ${c + 1} causes a contradiction — ${why}. Cross it out.`,
          cells: [{ row: r, col: c, role: 'locked' }],
          action: { type: 'xmarks', cells: [{ row: r, col: c }] },
        };
      }
    }
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  // No single deductive rule resolved this step. The solver knows the answer
  // but the reasoning spans multiple interacting constraints simultaneously.
  const importedRowSet = new Set((importedCats || []).map(ic => ic.row));
  let fbRow = -1;
  for (let r = 0; r < n; r++) {
    if (!placedRowSet.has(r) && !importedRowSet.has(r)) { fbRow = r; break; }
  }
  if (fbRow === -1) return { text: 'All cats are placed.', cells: [], action: null };
  const fbCol = solution[fbRow];
  const fbCi = grid[fbRow][fbCol];
  return {
    text: `No single rule resolves this step — the solver determined the ${cName(fbCi)} cat belongs at row ${fbRow + 1}, col ${fbCol + 1}, but the reasoning requires tracking multiple constraints at once.`,
    cells: [{ row: fbRow, col: fbCol, role: 'cat' }],
    action: { type: 'cat', row: fbRow, col: fbCol },
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
    const { text, cells, action } = generateHintText();
    showHint(text, cells, action);
  } catch (e) {
    showHint('Could not generate explanation.', [], null);
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
