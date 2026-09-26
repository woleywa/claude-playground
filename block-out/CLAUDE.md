# Block Out Solver — CLAUDE.md

## Tech stack

Single self-contained `index.html` (vanilla HTML/CSS/JS, no build step, no dependencies).
Hosted on GitHub Pages as part of the `claude-playground` repo.

## Game model

- Cells: `empty`, `wall`, `block` (color), `chain` (color + lock count), `key` (color)
- An edge arrow slides every moveable block (block/key) in that row/column; blocks are processed
  front-to-back in the slide direction.
- A block that slides past the board edge is cleared. Walls, chains and other blocks stop it.
- A key sliding into a chain decrements its count (count 0 → plain block) and becomes a plain block itself.
- Win: no block, key or chain cells left.

## Solver

BFS over board states (serialized string per state), capped at 14 moves / 5 s, so the first
solution found is the shortest.

## Testing

Load the "Demo 6×6" preset and Solve — expected: 4 moves (Down col 3, Right row 3 ×2, Left row 5).
