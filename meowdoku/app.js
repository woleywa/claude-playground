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
  xMarks: null,     // boolean[row][col] — X-marked cells detected in screenshot
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

      if (state.solution !== null && r < state.revealed) {
        if (state.solution[r] === c) {
          cell.classList.add('cat');
          const span = document.createElement('span');
          span.textContent = '🐱';
          cell.appendChild(span);
        } else {
          cell.classList.add('excluded');
          const span = document.createElement('span');
          span.textContent = '✕';
          cell.appendChild(span);
        }
      } else if (state.xMarks?.[r]?.[c]) {
        cell.classList.add('imported-x');
        const span = document.createElement('span');
        span.textContent = '✕';
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

function generateExplanation(step) {
  const { solution, grid, customColors, size: n } = state;
  const cName = (ci) => customColors ? `Color ${ci + 1}` : (COLORS[ci]?.name ?? `Color ${ci + 1}`);

  const usedCols = new Set();
  const usedColors = new Set();
  const cats = [];
  for (let r = 0; r < step; r++) {
    usedCols.add(solution[r]);
    usedColors.add(grid[r][solution[r]]);
    cats.push({ row: r, col: solution[r] });
  }

  const isDirectValid = (row, col) => {
    const ci = grid[row][col];
    if (ci < 0 || row < step) return false;
    if (usedCols.has(col) || usedColors.has(ci)) return false;
    return !cats.some(p => Math.abs(p.row - row) === 1 && Math.abs(p.col - col) <= 1);
  };

  // One-level forward check from a given simulation state (sCols/sColors/sCats are pre-placement)
  const fwd1 = (r, c, sCols, sColors, sCats) => {
    const ci = grid[r][c];
    const simCols = new Set([...sCols, c]);
    const simColors = new Set([...sColors, ci]);
    const simCats = [...sCats, { row: r, col: c }];
    for (let rr = step; rr < n; rr++) {
      if (simCats.some(p => p.row === rr)) continue;
      let ok = false;
      for (let cc = 0; cc < n && !ok; cc++) {
        const rci = grid[rr][cc];
        if (rci < 0 || simCols.has(cc) || simColors.has(rci)) continue;
        if (simCats.some(p => Math.abs(p.row - rr) === 1 && Math.abs(p.col - cc) <= 1)) continue;
        ok = true;
      }
      if (!ok) return `would leave row ${rr + 1} with no valid placement`;
    }
    for (let ci2 = 0; ci2 < n; ci2++) {
      if (simColors.has(ci2)) continue;
      let ok = false;
      done: for (let rr = step; rr < n; rr++) {
        if (simCats.some(p => p.row === rr)) continue;
        for (let cc = 0; cc < n; cc++) {
          if (grid[rr][cc] !== ci2 || simCols.has(cc)) continue;
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
    for (let rr = step; rr < n; rr++) {
      if (rr === r) continue;
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

  const blockReason = (r, c) => {
    const cellCi = grid[r][c];
    if (r < step) return `row ${r + 1} already solved`;
    if (cellCi < 0) return 'uncolored cell';
    if (usedCols.has(c)) {
      const occ = cats.find(p => p.col === c);
      return `col ${c + 1} taken (cat in row ${occ ? occ.row + 1 : '?'})`;
    }
    if (usedColors.has(cellCi)) return `${cName(cellCi)} region already placed`;
    const adj = cats.find(p => Math.abs(p.row - r) === 1 && Math.abs(p.col - c) <= 1);
    if (adj) return `diagonal to cat in row ${adj.row + 1}`;
    return forwardReason2(r, c) ?? 'makes the puzzle unsolvable';
  };

  const rowValidFC = {};
  for (let r = step; r < n; r++) {
    rowValidFC[r] = [];
    for (let c = 0; c < n; c++) {
      if (isDirectValid(r, c) && !forwardReason(r, c)) rowValidFC[r].push(c);
    }
  }
  const colorValidFC = {};
  for (let ci = 0; ci < n; ci++) {
    if (usedColors.has(ci)) continue;
    colorValidFC[ci] = [];
    for (let r = step; r < n; r++)
      for (let c = 0; c < n; c++)
        if (grid[r][c] === ci && isDirectValid(r, c) && !forwardReason(r, c))
          colorValidFC[ci].push({ row: r, col: c });
  }

  let bestRow = -1, bestRowCol = -1;
  for (let r = step; r < n; r++) {
    if (rowValidFC[r]?.length === 1) { bestRow = r; bestRowCol = rowValidFC[r][0]; break; }
  }
  let bestColor = -1, bestColorCell = null;
  for (let ci = 0; ci < n; ci++) {
    if (colorValidFC[ci]?.length === 1) { bestColor = ci; bestColorCell = colorValidFC[ci][0]; break; }
  }

  const lines = [];

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

  // Fallback: explain the solver's next step; group columns that share the same reason
  const row = step, col = solution[step], ci = grid[step][solution[step]];
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

function runExplain() {
  if (!ensureSolution()) return;
  if (state.revealed >= state.size) {
    // All cats shown — reset grid and explain from step 0
    state.revealed = 0;
    renderGrid();
  }
  try {
    showHint(generateExplanation(state.revealed));
  } catch (e) {
    showHint('Could not generate explanation — check the browser console.');
    console.error('generateExplanation error:', e);
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
