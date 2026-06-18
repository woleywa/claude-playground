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

const state = {
  size: 10,
  grid: [],
  selectedColor: 0,
  painting: false,
  solution: null,   // placed[row] = col, or null
  revealed: 0,      // how many rows' cats are currently shown
  customColors: null, // rgb strings from screenshot, or null for palette mode
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
    btn.title = state.customColors ? `Color ${idx + 1}` : (COLORS[idx]?.name ?? '');
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

      // Show cat for revealed rows only
      if (state.solution !== null && r < state.revealed && state.solution[r] === c) {
        cell.classList.add('cat');
        const span = document.createElement('span');
        span.textContent = '🐱';
        cell.appendChild(span);
      }

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
    if (state.selectedColor !== ERASER && state.selectedColor >= state.size) state.selectedColor = 0;
    clearHint();
    renderPalette();
    renderGrid();
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    state.grid = createGrid(state.size);
    state.solution = null;
    state.revealed = 0;
    state.customColors = null;
    clearHint();
    renderPalette();
    renderGrid();
  });

  document.getElementById('solve-btn').addEventListener('click', runSolveAll);
  document.getElementById('hint-btn').addEventListener('click', runHint);

  document.getElementById('photo-btn').addEventListener('click', () => {
    openImagePicker(state.size, (result) => {
      state.grid = result.grid;
      state.customColors = result.colors;
      state.solution = null;
      state.revealed = 0;
      clearHint();

      // Auto-adjust size if color count differs from current size
      if (result.colorCount !== state.size) {
        const detected = Math.min(12, Math.max(5, result.colorCount));
        // Only warn — don't silently resize since grid dimensions were set by user
        const statusEl = document.getElementById('status');
        if (result.colorCount !== state.size) {
          statusEl.textContent = `Detected ${result.colorCount} colors — grid is ${state.size}×${state.size}. Adjust size if needed.`;
          statusEl.className = 'status warn';
        }
      }

      renderPalette();
      renderGrid();
    });
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
  const box = document.getElementById('hint-box');
  box.textContent = '';
  box.classList.remove('visible');
}

function showHint(text) {
  const box = document.getElementById('hint-box');
  box.textContent = text;
  box.classList.add('visible');
}

function generateHintText(step) {
  const { solution, grid, customColors, size: n } = state;
  const row = step;
  const col = solution[row];
  const colorIdx = grid[row][col];
  const colorName = customColors ? `Color ${colorIdx + 1}` : (COLORS[colorIdx]?.name ?? `Color ${colorIdx + 1}`);

  // Build placed state for rows 0..step-1
  const usedCols = new Set();
  const usedColorIdxs = new Set();
  const placedRows = []; // { row, col }
  for (let r = 0; r < step; r++) {
    usedCols.add(solution[r]);
    usedColorIdxs.add(grid[r][solution[r]]);
    placedRows.push({ row: r, col: solution[r] });
  }
  const prevCol = step > 0 ? solution[step - 1] : -1;

  // Categorise eliminated columns
  const taken = [], colorPlaced = [], diag = [], deadEnd = [];

  for (let c = 0; c < n; c++) {
    if (c === col) continue;
    const cellColorIdx = grid[row][c];

    if (usedCols.has(c)) {
      const occupant = placedRows.find(p => p.col === c);
      taken.push(`col ${c + 1} (row ${occupant ? occupant.row + 1 : '?'})`);
    } else if (cellColorIdx < 0 || usedColorIdxs.has(cellColorIdx)) {
      colorPlaced.push(`col ${c + 1}`);
    } else if (prevCol >= 0 && Math.abs(c - prevCol) <= 1) {
      diag.push(`col ${c + 1}`);
    } else {
      deadEnd.push(`col ${c + 1}`);
    }
  }

  const lines = [`Hint ${step + 1}/${n}: Row ${row + 1}, column ${col + 1} — ${colorName}`];
  if (taken.length)      lines.push(`✗ Taken: ${taken.join(', ')}`);
  if (colorPlaced.length) lines.push(`✗ Color already placed: ${colorPlaced.join(', ')}`);
  if (diag.length)       lines.push(`✗ Diagonal to cat in row ${step}: ${diag.join(', ')}`);
  if (deadEnd.length)    lines.push(`✗ No valid continuation: ${deadEnd.join(', ')}`);

  return lines.join('\n');
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
    // Already fully revealed — reset to hint mode
    state.revealed = 0;
    clearHint();
    renderGrid();
    return;
  }

  const hintText = generateHintText(state.revealed);
  state.revealed++;
  renderGrid();
  showHint(hintText);
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
