// solveMeowdoku(grid, n)
// grid[row][col] = colorIndex (integer ≥ 0, or -1 for uncolored)
// Returns placed[row] = col for each row, or null if unsolvable.
// Rules: 1 cat per row, 1 per column, 1 per color, no two cats touch (including diagonally).
function solveMeowdoku(grid, n) {
  const placed = new Array(n).fill(-1);
  const usedCols = new Array(n).fill(false);
  const usedColors = new Set();

  function backtrack(row) {
    if (row === n) return true;
    for (let col = 0; col < n; col++) {
      const color = grid[row][col];
      if (color < 0 || usedCols[col] || usedColors.has(color)) continue;
      // Only row-1 can be diagonally adjacent since we go row by row.
      if (row > 0 && Math.abs(col - placed[row - 1]) <= 1) continue;
      placed[row] = col;
      usedCols[col] = true;
      usedColors.add(color);
      if (backtrack(row + 1)) return true;
      placed[row] = -1;
      usedCols[col] = false;
      usedColors.delete(color);
    }
    return false;
  }

  return backtrack(0) ? placed.slice() : null;
}
