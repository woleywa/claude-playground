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

function approxColorName(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
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
  if (h >= 15 && h < 50 && l < 0.4) return 'Brown';
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
  solution: null,   // placed[row] = col, or null
  revealed: 0,      // how many rows' cats are currently shown
  customColors: null, // rgb strings from screenshot, or null for palette mode
  xMarks: null,       // boolean[row][col] — X-marked cells detected in screenshot
  importedCats: [],   // [{row,col}] — cats already placed in the imported screenshot
  hintCells: [],      // [{row,col,role}] — cells highlighted by the active hint
  explainStep: -1,    // which step was last explained (for two-level explain)
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
  for (let i = 0; i < state.size; i++) palette.appendChild(makeSwatch(i));
}

function makeSwatch(idx) {
  const isEraser = idx === ERASER;
  const btn = document.createElement('button');
  btn.className = 'swatch' +
    (isEraser ? ' eraser' : '') +
    (state.selectedColor === idx ? ' selected' : '');

  if (isEraser) {
    btn.textContent = '✕';
    btn.title = 'Erase';
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
      const isRevealedCat = state.solution !== null && r < state.revealed && state.solution[r] === c;
      const isRevealedX   = state.solution !== null && r < state.revealed && state.solution[r] !== c;

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

  // Painting after a solve — clear cats and re-render fully
  if (state.solution !== null) {
    state.solution = null;
    state.revealed = 0;
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
    state.revealed = 0;
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
    state.revealed = 0;
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

  document.addEventListener('mouseup', () => { state.painting = false; });

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

  document.addEventListener('touchend', () => { state.painting = false; });
  document.addEventListener('touchcancel', () => { state.painting = false; });
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
  if (state.solution !== null && state.revealed === state.size) {
    el.textContent = '✓ Solved!';
    el.className = 'status success';
    return;
  }
  if (state.solution !== null && state.revealed > 0) {
    el.textContent = `Hint ${state.revealed}/${state.size}`;
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
  state.explainStep = -1;
  const box = document.getElementById('hint-box');
  box.textContent = '';
  box.classList.remove('visible');
  renderGrid();
}

function showHint(text, cells = []) {
  state.hintCells = cells;
  const box = document.getElementById('hint-box');
  box.textContent = text;
  box.classList.add('visible');
  renderGrid();
}

function generateHintText(step) {
  const { solution, grid, customColors, size: n, importedCats } = state;
  const named = customColors ? namedCustomColors(customColors) : null;
  const cName = (ci) => named ? named[ci] : (COLORS[ci]?.name ?? `Color ${ci + 1}`);

  // Build placed state
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
  for (let r = 0; r < step; r++) {
    if (placedRowSet.has(r)) continue;
    usedCols.add(solution[r]);
    usedColors.add(grid[r][solution[r]]);
    cats.push({ row: r, col: solution[r] });
    placedRowSet.add(r);
  }

  const isValid = (r, c) => {
    if (placedRowSet.has(r)) return false;
    const ci = grid[r][c];
    if (ci < 0 || usedCols.has(c) || usedColors.has(ci)) return false;
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

  // Tactic 1 — region has exactly one valid cell
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
      };
    }
  }

  // Tactic 2 — row has exactly one valid cell
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    const valid = [];
    for (let c = 0; c < n; c++) if (isValid(r, c)) valid.push(c);
    if (valid.length === 1) {
      const col = valid[0];
      const ci = grid[r][col];
      const rowCells = [];
      for (let c = 0; c < n; c++) if (c !== col) rowCells.push({ row: r, col: c, role: 'locked' });
      return {
        text: `Row ${r + 1} has only one valid column — place the ${cName(ci)} cat at col ${col + 1}.`,
        cells: [{ row: r, col, role: 'cat' }, ...rowCells],
      };
    }
  }

  // Tactic 3 — region confined to one row
  for (const ci of unplacedColors) {
    const regionCells = allRegionCells(ci);
    const validRows = new Set(
      regionCells.filter(({ row, col }) => isValid(row, col)).map(({ row }) => row)
    );
    if (validRows.size === 1) {
      const lr = [...validRows][0];
      const validInRow = regionCells.filter(({ row, col }) => row === lr && isValid(row, col));
      const otherCells = regionCells.filter(({ row }) => row !== lr);
      return {
        text: `The ${cName(ci)} region can only go in row ${lr + 1} — no other row has a valid cell for it.`,
        cells: [
          ...validInRow.map(c => ({ ...c, role: 'cat' })),
          ...otherCells.map(c => ({ ...c, role: 'region' })),
        ],
      };
    }
  }

  // Tactic 4 — region confined to one column
  for (const ci of unplacedColors) {
    const regionCells = allRegionCells(ci);
    const validCols = new Set(
      regionCells.filter(({ row, col }) => isValid(row, col)).map(({ col }) => col)
    );
    if (validCols.size === 1) {
      const lc = [...validCols][0];
      const validInCol = regionCells.filter(({ row, col }) => col === lc && isValid(row, col));
      const otherCells = regionCells.filter(({ col }) => col !== lc);
      return {
        text: `The ${cName(ci)} region can only go in column ${lc + 1} — that column is reserved for it.`,
        cells: [
          ...validInCol.map(c => ({ ...c, role: 'cat' })),
          ...otherCells.map(c => ({ ...c, role: 'region' })),
        ],
      };
    }
  }

  // Tactic 5 — naked pair: 2 colors locked to the same 2 rows
  for (let i = 0; i < unplacedColors.length; i++) {
    for (let j = i + 1; j < unplacedColors.length; j++) {
      const ciA = unplacedColors[i], ciB = unplacedColors[j];
      const rowsA = new Set(allRegionCells(ciA).filter(({ row, col }) => isValid(row, col)).map(({ row }) => row));
      const rowsB = new Set(allRegionCells(ciB).filter(({ row, col }) => isValid(row, col)).map(({ row }) => row));
      if (rowsA.size === 2 && rowsB.size === 2 && [...rowsA].every(r => rowsB.has(r))) {
        const [r1, r2] = [...rowsA].sort((a, b) => a - b);
        const pairCells = [];
        for (const ci of [ciA, ciB])
          for (const { row, col } of allRegionCells(ci))
            if (isValid(row, col)) pairCells.push({ row, col, role: 'cat' });
        return {
          text: `${cName(ciA)} and ${cName(ciB)} are both locked to rows ${r1 + 1} and ${r2 + 1} — other colors must avoid those rows.`,
          cells: pairCells,
        };
      }
    }
  }

  // Fallback — show the next solution step
  const importedRows = new Set((importedCats || []).map(ic => ic.row));
  let nextRow = step;
  while (nextRow < n && importedRows.has(nextRow)) nextRow++;
  if (nextRow >= n) {
    return { text: 'All rows are already covered by placed cats.', cells: [] };
  }
  const fbRow = nextRow;
  const fbCol = solution[fbRow];
  const fbCi = grid[fbRow][fbCol];
  return {
    text: `Place the ${cName(fbCi)} cat at row ${fbRow + 1}, col ${fbCol + 1}.`,
    cells: [{ row: fbRow, col: fbCol, role: 'cat' }],
  };
}

function generateExplanation(step) {
  const { solution, grid, customColors, size: n, importedCats } = state;
  const named = customColors ? namedCustomColors(customColors) : null;
  const cName = (ci) => named ? named[ci] : (COLORS[ci]?.name ?? `Color ${ci + 1}`);

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
  for (let r = 0; r < step; r++) {
    if (placedRowSet.has(r)) continue;
    usedCols.add(solution[r]);
    usedColors.add(grid[r][solution[r]]);
    cats.push({ row: r, col: solution[r] });
    placedRowSet.add(r);
  }

  const xMarks = state.xMarks;

  const isDirectValid = (row, col) => {
    const ci = grid[row][col];
    if (ci < 0 || placedRowSet.has(row)) return false;
    if (usedCols.has(col) || usedColors.has(ci)) return false;
    if (xMarks?.[row]?.[col]) return false;
    return !cats.some(p => Math.abs(p.row - row) === 1 && Math.abs(p.col - col) <= 1);
  };

  // One-level forward check from a given simulation state (sCols/sColors/sCats are pre-placement)
  const fwd1 = (r, c, sCols, sColors, sCats) => {
    const ci = grid[r][c];
    const simCols = new Set([...sCols, c]);
    const simColors = new Set([...sColors, ci]);
    const simCats = [...sCats, { row: r, col: c }];
    for (let rr = 0; rr < n; rr++) {
      if (simCats.some(p => p.row === rr)) continue;
      let ok = false;
      for (let cc = 0; cc < n && !ok; cc++) {
        const rci = grid[rr][cc];
        if (rci < 0 || simCols.has(cc) || simColors.has(rci)) continue;
        if (xMarks?.[rr]?.[cc]) continue;
        if (simCats.some(p => Math.abs(p.row - rr) === 1 && Math.abs(p.col - cc) <= 1)) continue;
        ok = true;
      }
      if (!ok) return `would leave row ${rr + 1} with no valid placement`;
    }
    for (let ci2 = 0; ci2 < n; ci2++) {
      if (simColors.has(ci2)) continue;
      let ok = false;
      done: for (let rr = 0; rr < n; rr++) {
        if (simCats.some(p => p.row === rr)) continue;
        for (let cc = 0; cc < n; cc++) {
          if (grid[rr][cc] !== ci2 || simCols.has(cc)) continue;
          if (xMarks?.[rr]?.[cc]) continue;
          if (simCats.some(p => Math.abs(p.row - rr) === 1 && Math.abs(p.col - cc) <= 1)) continue;
          ok = true; break done;
        }
      }
      if (!ok) return `would leave the ${cName(ci2)} region with no valid placement`;
    }
    return null;
  };

  const forwardReason = (r, c) => fwd1(r, c, usedCols, usedColors, cats);

  // Two-level forward check: after placing (r,c), check if any remaining row has
  // ALL its direct-valid options failing a 1-level check (so it will be stranded)
  const forwardReason2 = (r, c) => {
    const d1 = forwardReason(r, c);
    if (d1) return d1;
    const ci = grid[r][c];
    const simCols = new Set([...usedCols, c]);
    const simColors = new Set([...usedColors, ci]);
    const simCats = [...cats, { row: r, col: c }];
    for (let rr = 0; rr < n; rr++) {
      if (placedRowSet.has(rr) || rr === r) continue;
      let hasForwardValid = false;
      for (let cc = 0; cc < n; cc++) {
        const rci = grid[rr][cc];
        if (rci < 0 || simCols.has(cc) || simColors.has(rci)) continue;
        if (simCats.some(p => Math.abs(p.row - rr) === 1 && Math.abs(p.col - cc) <= 1)) continue;
        if (!fwd1(rr, cc, simCols, simColors, simCats)) { hasForwardValid = true; break; }
      }
      if (!hasForwardValid) return `would leave row ${rr + 1} with no valid continuation`;
    }
    return null;
  };

  // Confinement check (naked-pair tactic): after placing (r,c), if two unplaced
  // regions each have valid cells in only ONE row (or column), and it's the SAME
  // row (or column), they can't both fit — a human-readable conflict.
  const confinementReason = (r, c) => {
    const ci = grid[r][c];
    const simCols = new Set([...usedCols, c]);
    const simColors = new Set([...usedColors, ci]);
    const simCats = [...cats, { row: r, col: c }];
    const rowsFor = new Map(), colsFor = new Map();
    for (let ci2 = 0; ci2 < n; ci2++) {
      if (simColors.has(ci2)) continue;
      const vRows = new Set(), vCols = new Set();
      for (let rr = 0; rr < n; rr++) {
        if (simCats.some(p => p.row === rr)) continue;
        for (let cc = 0; cc < n; cc++) {
          if (grid[rr][cc] !== ci2 || simCols.has(cc)) continue;
          if (xMarks?.[rr]?.[cc]) continue;
          if (simCats.some(p => Math.abs(p.row - rr) === 1 && Math.abs(p.col - cc) <= 1)) continue;
          vRows.add(rr); vCols.add(cc);
        }
      }
      if (vRows.size === 0) return null; // already caught by fwd1
      rowsFor.set(ci2, vRows);
      colsFor.set(ci2, vCols);
    }
    const rowLocked = [...rowsFor.entries()].filter(([, s]) => s.size === 1);
    for (let i = 0; i < rowLocked.length - 1; i++)
      for (let j = i + 1; j < rowLocked.length; j++)
        if ([...rowLocked[i][1]][0] === [...rowLocked[j][1]][0])
          return `would force ${cName(rowLocked[i][0])} and ${cName(rowLocked[j][0])} to compete for the same row`;
    const colLocked = [...colsFor.entries()].filter(([, s]) => s.size === 1);
    for (let i = 0; i < colLocked.length - 1; i++)
      for (let j = i + 1; j < colLocked.length; j++)
        if ([...colLocked[i][1]][0] === [...colLocked[j][1]][0])
          return `would force ${cName(colLocked[i][0])} and ${cName(colLocked[j][0])} to compete for the same column`;
    return null;
  };

  const blockReason = (r, c) => {
    const cellCi = grid[r][c];
    if (placedRowSet.has(r)) return `row ${r + 1} already solved`;
    if (cellCi < 0) return 'uncolored cell';
    if (xMarks?.[r]?.[c]) return 'already crossed out in the puzzle';
    if (usedCols.has(c)) {
      const occ = cats.find(p => p.col === c);
      return `col ${c + 1} taken (cat in row ${occ ? occ.row + 1 : '?'})`;
    }
    if (usedColors.has(cellCi)) return `${cName(cellCi)} region already placed`;
    const adj = cats.find(p => Math.abs(p.row - r) === 1 && Math.abs(p.col - c) <= 1);
    if (adj) return `diagonal to cat in row ${adj.row + 1}`;
    return forwardReason2(r, c) ?? confinementReason(r, c) ?? 'no simple rule — solver verified';
  };

  // Priority 1: direct-constraint forced (no forward-check — clearest explanation)
  let directForcedColor = -1, directForcedCell = null;
  for (let dci = 0; dci < n; dci++) {
    if (usedColors.has(dci)) continue;
    const valid = [];
    for (let r = 0; r < n; r++) {
      if (placedRowSet.has(r)) continue;
      for (let c = 0; c < n; c++)
        if (grid[r][c] === dci && isDirectValid(r, c)) valid.push({ row: r, col: c });
    }
    if (valid.length === 1) { directForcedColor = dci; directForcedCell = valid[0]; break; }
  }
  let directForcedRow = -1, directForcedCol = -1;
  if (directForcedColor < 0) {
    for (let r = 0; r < n; r++) {
      if (placedRowSet.has(r)) continue;
      const valid = [];
      for (let c = 0; c < n; c++) if (isDirectValid(r, c)) valid.push(c);
      if (valid.length === 1) { directForcedRow = r; directForcedCol = valid[0]; break; }
    }
  }

  // Priority 2: forward-check forced (1-level)
  const rowValidFC = {};
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    rowValidFC[r] = [];
    for (let c = 0; c < n; c++) {
      if (isDirectValid(r, c) && !forwardReason(r, c)) rowValidFC[r].push(c);
    }
  }
  const colorValidFC = {};
  for (let ci = 0; ci < n; ci++) {
    if (usedColors.has(ci)) continue;
    colorValidFC[ci] = [];
    for (let r = 0; r < n; r++) {
      if (placedRowSet.has(r)) continue;
      for (let c = 0; c < n; c++)
        if (grid[r][c] === ci && isDirectValid(r, c) && !forwardReason(r, c))
          colorValidFC[ci].push({ row: r, col: c });
    }
  }
  let bestRow = -1, bestRowCol = -1;
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    if (rowValidFC[r]?.length === 1) { bestRow = r; bestRowCol = rowValidFC[r][0]; break; }
  }
  let bestColor = -1, bestColorCell = null;
  for (let ci = 0; ci < n; ci++) {
    if (colorValidFC[ci]?.length === 1) { bestColor = ci; bestColorCell = colorValidFC[ci][0]; break; }
  }

  const lines = [];

  if (directForcedColor >= 0) {
    const { row, col } = directForcedCell;
    lines.push(`The ${cName(directForcedColor)} cat is forced — only one cell in this region isn't already blocked.`);
    lines.push(`→ Place it at row ${row + 1}, col ${col + 1}.`);
    const others = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (grid[r][c] === directForcedColor && !(r === row && c === col))
          others.push(`  • (${r + 1},${c + 1}): ${blockReason(r, c)}`);
    if (others.length) { lines.push(''); lines.push(`Other ${cName(directForcedColor)} cells are blocked:`); others.forEach(l => lines.push(l)); }
    return lines.join('\n');
  }

  if (directForcedRow >= 0) {
    const c = directForcedCol;
    const ci = grid[directForcedRow][c];
    lines.push(`Row ${directForcedRow + 1} is forced — only col ${c + 1} is valid (${cName(ci)}).`);
    lines.push('');
    lines.push(`Other columns in row ${directForcedRow + 1} are blocked:`);
    for (let cc = 0; cc < n; cc++) {
      if (cc === c) continue;
      lines.push(`  • Col ${cc + 1}: ${blockReason(directForcedRow, cc)}`);
    }
    return lines.join('\n');
  }

  if (bestColor >= 0) {
    const { row, col } = bestColorCell;
    lines.push(`The ${cName(bestColor)} cat is forced — only one valid cell in this region.`);
    lines.push(`→ Place it at row ${row + 1}, col ${col + 1}.`);
    const others = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (grid[r][c] === bestColor && !(r === row && c === col))
          others.push(`  • (${r + 1},${c + 1}): ${blockReason(r, c)}`);
    if (others.length) { lines.push(''); lines.push(`Other ${cName(bestColor)} cells are blocked:`); others.forEach(l => lines.push(l)); }
    return lines.join('\n');
  }

  if (bestRow >= 0) {
    const c = bestRowCol;
    const ci = grid[bestRow][c];
    lines.push(`Row ${bestRow + 1} is forced — only col ${c + 1} is valid (${cName(ci)}).`);
    lines.push('');
    lines.push(`Other columns in row ${bestRow + 1} are blocked:`);
    for (let cc = 0; cc < n; cc++) {
      if (cc === c) continue;
      lines.push(`  • Col ${cc + 1}: ${blockReason(bestRow, cc)}`);
    }
    return lines.join('\n');
  }

  // Fallback: pick the row with the most clearly-explainable blocked columns
  const DEAD_END = 'no simple rule — solver verified';
  let fbRow = -1, fbCol = -1;
  let maxClear = -1;
  for (let r = 0; r < n; r++) {
    if (placedRowSet.has(r)) continue;
    if (fbRow < 0) { fbRow = r; fbCol = solution[r]; }
    let clear = 0;
    for (let c = 0; c < n; c++) {
      if (c === solution[r]) continue;
      if (blockReason(r, c) !== DEAD_END) clear++;
    }
    if (clear > maxClear) { maxClear = clear; fbRow = r; fbCol = solution[r]; }
  }
  if (fbRow < 0) return 'All rows are already covered by placed cats.';
  const row = fbRow, col = fbCol, ci = grid[fbRow][fbCol];
  lines.push(`Next: row ${row + 1}, col ${col + 1} — ${cName(ci)}.`);
  lines.push('');
  lines.push(`Other columns in row ${row + 1} are blocked:`);
  const reasonGroups = new Map();
  for (let c = 0; c < n; c++) {
    if (c === col) continue;
    const reason = blockReason(row, c);
    if (!reasonGroups.has(reason)) reasonGroups.set(reason, []);
    reasonGroups.get(reason).push(c + 1);
  }
  for (const [reason, cols] of reasonGroups) {
    const colStr = cols.length === 1 ? `Col ${cols[0]}` : `Cols ${cols.join(', ')}`;
    lines.push(`  ✗ ${colStr}: ${reason}`);
  }
  return lines.join('\n');
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
  state.revealed = 0;
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
  if (state.revealed >= state.size) {
    state.revealed = 0;
    clearHint();
    return;
  }
  state.revealed++;
  clearHint();
}

function runExplain() {
  if (!ensureSolution()) return;
  if (state.revealed >= state.size) {
    state.revealed = 0;
    clearHint();
    return;
  }
  try {
    if (state.explainStep === state.revealed) {
      // Second click on the same step — show full detailed reasoning
      showHint(generateExplanation(state.revealed), []);
    } else {
      // First click — show tactical one-liner with cell highlights
      const { text, cells } = generateHintText(state.revealed);
      state.explainStep = state.revealed;
      showHint(text, cells);
    }
  } catch (e) {
    showHint('Could not generate explanation — check the browser console.', []);
    console.error('runExplain error:', e);
  }
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
      state.revealed = state.size;
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
