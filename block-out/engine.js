// Rules + solver. Pure functions, no DOM.
// piece: { id, color, r, c, h, w, shape?, key, lock, ice, inner?, crate? }
//   shape = [[dr, dc], …] cell offsets for non-rectangular pieces (absent = full h×w rectangle)
//   color '?' = unknown (still under ice / inside a crate); inner = colour left behind when it leaves
// gate:  { id, side: 'L'|'R'|'T'|'B', start, len, color, frozen }
// level: { W, H, walls: [[r, c], …], pieces, gates, tickPerCell }
// Ice counts down once per piece that leaves (or per cell with tickPerCell);
// frozen exits count down once per move (every drag, including one that leaves).
const Engine = (() => {
  const clone = s => JSON.parse(JSON.stringify(s));
  const movable = p => !p.ice && !p.lock && p.color !== '?';

  const rects = new Map();
  function offsets(p) {
    if (p.shape) return p.shape;
    const k = p.h + 'x' + p.w;
    if (!rects.has(k)) {
      const o = [];
      for (let r = 0; r < p.h; r++) for (let c = 0; c < p.w; c++) o.push([r, c]);
      rects.set(k, o);
    }
    return rects.get(k);
  }
  const cellsOf = (p, r = p.r, c = p.c) => offsets(p).map(([dr, dc]) => [r + dr, c + dc]);

  function grid(level, pieces) {
    const g = new Int32Array(level.W * level.H).fill(-1);
    for (const [r, c] of level.walls || []) g[r * level.W + c] = -2;
    for (const p of pieces)
      for (const [r, c] of cellsOf(p)) g[r * level.W + c] = p.id;
    return g;
  }

  function fits(level, g, p, r, c) {
    for (const [y, x] of cellsOf(p, r, c)) {
      if (y < 0 || x < 0 || y >= level.H || x >= level.W) return false;
      const v = g[y * level.W + x];
      if (v !== -1 && v !== p.id) return false;
    }
    return true;
  }

  // Every position the piece can be dragged to, with the path to reach it.
  function reachable(level, g, p) {
    const seen = new Map([[p.r + ',' + p.c, null]]);
    const q = [[p.r, p.c]];
    const out = [];
    while (q.length) {
      const [r, c] = q.shift();
      out.push([r, c]);
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const k = (r + dr) + ',' + (c + dc);
        if (seen.has(k) || !fits(level, g, p, r + dr, c + dc)) continue;
        seen.set(k, [r, c]);
        q.push([r + dr, c + dc]);
      }
    }
    return out;
  }

  // The piece can leave through the gate from (r, c): it spans only the gate's rows/columns and
  // nothing sits between any of its cells and that edge.
  function gateFor(level, g, gates, p, r, c) {
    const cells = cellsOf(p, r, c);
    const free = (y, x) => { const v = g[y * level.W + x]; return v === -1 || v === p.id; };
    for (const gt of gates) {
      if (gt.frozen > 0 || gt.color !== p.color) continue;
      const end = gt.start + gt.len;
      const across = gt.side === 'L' || gt.side === 'R' ? cells.map(q => q[0]) : cells.map(q => q[1]);
      if (Math.min(...across) < gt.start || Math.max(...across) >= end) continue;
      const clear = cells.every(([y, x]) => {
        if (gt.side === 'L') { for (let k = 0; k < x; k++) if (!free(y, k)) return false; }
        if (gt.side === 'R') { for (let k = x + 1; k < level.W; k++) if (!free(y, k)) return false; }
        if (gt.side === 'T') { for (let k = 0; k < y; k++) if (!free(k, x)) return false; }
        if (gt.side === 'B') { for (let k = y + 1; k < level.H; k++) if (!free(k, x)) return false; }
        return true;
      });
      if (clear) return gt;
    }
    return null;
  }

  function findExit(level, st) {
    const g = grid(level, st.pieces);
    for (const p of st.pieces) {
      if (!movable(p)) continue;
      for (const [r, c] of reachable(level, g, p)) {
        const gt = gateFor(level, g, st.gates, p, r, c);
        if (gt) return { pieceId: p.id, r, c, gateId: gt.id };
      }
    }
    return null;
  }

  // A layered piece loses its outer colour and the inner piece stays where it is.
  function applyExit(level, st, pieceId, r, c) {
    const p = st.pieces.find(x => x.id === pieceId);
    if (p.inner) st.pieces = st.pieces.map(x => x.id === pieceId ? { ...x, r, c, color: x.inner, inner: undefined, key: false } : x);
    else st.pieces = st.pieces.filter(x => x.id !== pieceId);
    const tick = level.tickPerCell ? offsets(p).length : 1;
    for (const q of st.pieces) {
      if (q.ice) q.ice = Math.max(0, q.ice - tick);
      if (p.key && q.lock && q.color === p.color) q.lock--;
    }
    thaw(st.gates);
  }

  const thaw = gates => gates.forEach(gt => { if (gt.frozen) gt.frozen--; });
  const moveTo = (st, id, r, c) => {
    const s2 = { pieces: st.pieces.map(x => x.id === id ? { ...x, r, c } : x), gates: clone(st.gates) };
    thaw(s2.gates);
    return s2;
  };

  // No piece can exit directly: find the fewest repositionings that let one exit.
  function findUnblock(level, st, deadline) {
    const key = s => s.pieces.map(p => p.r + ',' + p.c).join('|') + '#' + s.gates.map(g => g.frozen).join(',');
    const seen = new Set([key(st)]);
    let frontier = [{ st, moves: [] }];
    for (let depth = 0; depth < 3 && frontier.length; depth++) {
      const next = [];
      for (const node of frontier) {
        const g = grid(level, node.st.pieces);
        for (const p of node.st.pieces) {
          if (!movable(p)) continue;
          for (const [r, c] of reachable(level, g, p)) {
            if (r === p.r && c === p.c) continue;
            if (performance.now() > deadline) return null;
            const s2 = moveTo(node.st, p.id, r, c);
            const k = key(s2);
            if (seen.has(k)) continue;
            seen.add(k);
            const moves = [...node.moves, { pieceId: p.id, fromR: p.r, fromC: p.c, r, c }];
            if (findExit(level, s2)) return { st: s2, moves };
            next.push({ st: s2, moves });
          }
        }
      }
      frontier = next;
    }
    return null;
  }

  // Exits only ever help (free space, tick counters, open locks) and drags are
  // reversible, so exiting whatever can exit next never blocks a solution.
  function solve(level, timeMs = 4000) {
    const deadline = performance.now() + timeMs;
    let st = { pieces: clone(level.pieces), gates: clone(level.gates) };
    const steps = [];
    while (true) {
      if (!st.pieces.some(p => p.color !== '?')) {
        return { ok: true, steps, final: st };
      }
      const ex = findExit(level, st);
      if (ex) {
        const p = st.pieces.find(x => x.id === ex.pieceId);
        steps.push({ kind: 'exit', before: clone(st), pieceId: p.id, fromR: p.r, fromC: p.c, r: ex.r, c: ex.c, gateId: ex.gateId });
        applyExit(level, st, p.id, ex.r, ex.c);
        continue;
      }
      const un = findUnblock(level, st, deadline);
      if (un) {
        for (const mv of un.moves) {
          steps.push({ kind: 'move', before: clone(st), ...mv });
          st = moveTo(st, mv.pieceId, mv.r, mv.c);
        }
        continue;
      }
      // A thawed exit or piece with an unknown colour: the player has to look before going on.
      if (st.gates.some(g => !g.frozen && g.color === '?') || st.pieces.some(p => !p.ice && p.color === '?'))
        return { ok: false, steps, final: st };
      // Still stuck: spend moves shuffling one piece back and forth until the next exit thaws.
      const wait = Math.min(...st.gates.filter(g => g.frozen).map(g => g.frozen));
      const g = grid(level, st.pieces);
      const p = st.pieces.find(x => movable(x) && reachable(level, g, x).length > 1);
      if (!isFinite(wait) || !p) return { ok: false, steps, final: st };
      const [ar, ac] = reachable(level, g, p)[1];
      for (let i = 0; i < wait; i++) {
        const cur = st.pieces.find(x => x.id === p.id);
        const [r, c] = i % 2 ? [p.r, p.c] : [ar, ac];
        steps.push({ kind: 'move', wait: true, before: clone(st), pieceId: p.id, fromR: cur.r, fromC: cur.c, r, c });
        st = moveTo(st, p.id, r, c);
      }
    }
  }

  // Cells the piece passes through to reach (r, c), start and end included.
  function path(level, st, pieceId, r, c) {
    const p = st.pieces.find(x => x.id === pieceId);
    const g = grid(level, st.pieces);
    const prev = new Map([[p.r + ',' + p.c, null]]);
    const q = [[p.r, p.c]];
    while (q.length) {
      const [y, x] = q.shift();
      if (y === r && x === c) break;
      for (const [dy, dx] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const k = (y + dy) + ',' + (x + dx);
        if (prev.has(k) || !fits(level, g, p, y + dy, x + dx)) continue;
        prev.set(k, [y, x]);
        q.push([y + dy, x + dx]);
      }
    }
    const out = [];
    for (let cur = [r, c]; cur; cur = prev.get(cur[0] + ',' + cur[1])) out.unshift(cur);
    return out;
  }

  return { solve, movable, path, cellsOf };
})();

if (typeof module !== 'undefined') module.exports = Engine;
