// Rules + solver. Pure functions, no DOM.
// piece: { id, color, r, c, h, w, shape?, key, keyColor?, lock, lockColor?, chain?, ice, inner?, crate? }
//   keyColor = the key's gem colour; lockColor = a chained piece's padlock badge colour
//   shape = [[dr, dc], …] cell offsets for non-rectangular pieces (absent = full h×w rectangle)
//   color '?' = unknown (still under ice / inside a crate); inner = colour left behind when it leaves
//   axis 'h' | 'v' = arrow piece, moves (and leaves) only along it; star = leaves only through star exits
// gate.star = star exit: star pieces need one; normal pieces may use it too
// gate.at = the row/column the exit opens from, for an exit in an inner wall (default: the board edge);
//   e.g. { side: 'T', at: 5 } lets pieces leave upward through the top of row 5
// gate:  { id, side: 'L'|'R'|'T'|'B', start, len, color, frozen }
// level: { W, H, walls: [[r, c], …], tracks: [[r, c, color], …], pieces, gates, tickPerCell }
//   a track cell only lets pieces of its colour move across it
// Ice and frozen exits count down once per piece that leaves (ice: per cell with tickPerCell).
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
  // The cells between a piece's cells and the exit (the way out), or null if the piece is on the
  // wrong side of it or outside the exit's span.
  function laneOf(level, gt, cells) {
    const across = gt.side === 'L' || gt.side === 'R' ? cells.map(q => q[0]) : cells.map(q => q[1]);
    if (Math.min(...across) < gt.start || Math.max(...across) >= gt.start + gt.len) return null;
    const at = gt.at ?? (gt.side === 'L' || gt.side === 'T' ? 0 : gt.side === 'R' ? level.W - 1 : level.H - 1);
    const out = [];
    for (const [y, x] of cells) {
      if (gt.side === 'L') { if (x < at) return null; for (let k = at; k < x; k++) out.push([y, k]); }
      else if (gt.side === 'R') { if (x > at) return null; for (let k = x + 1; k <= at; k++) out.push([y, k]); }
      else if (gt.side === 'T') { if (y < at) return null; for (let k = at; k < y; k++) out.push([k, x]); }
      else { if (y > at) return null; for (let k = y + 1; k <= at; k++) out.push([k, x]); }
    }
    return out;
  }
  const ALL = [[1,0],[-1,0],[0,1],[0,-1]], H_ONLY = [[0,1],[0,-1]], V_ONLY = [[1,0],[-1,0]];
  const dirsOf = p => p.axis === 'h' ? H_ONLY : p.axis === 'v' ? V_ONLY : ALL;
  const gateOk = (p, gt) => !gt.frozen && gt.color === p.color && (!p.star || gt.star)
    && !(p.axis === 'h' && (gt.side === 'T' || gt.side === 'B')) && !(p.axis === 'v' && (gt.side === 'L' || gt.side === 'R'));

  function grid(level, pieces) {
    const g = new Int32Array(level.W * level.H).fill(-1);
    for (const [r, c] of level.walls || []) g[r * level.W + c] = -2;
    for (const p of pieces)
      for (const [r, c] of cellsOf(p)) g[r * level.W + c] = p.id;
    return g;
  }

  const trackCache = new WeakMap();
  function trackMap(level) {
    if (!trackCache.has(level)) trackCache.set(level, new Map((level.tracks || []).map(([r, c, col]) => [r * level.W + c, col])));
    return trackCache.get(level);
  }

  function fits(level, g, p, r, c) {
    const tr = trackMap(level);
    for (const [y, x] of cellsOf(p, r, c)) {
      if (y < 0 || x < 0 || y >= level.H || x >= level.W) return false;
      const v = g[y * level.W + x];
      if (v !== -1 && v !== p.id) return false;
      const t = tr.get(y * level.W + x);
      if (t && t !== p.color) return false;
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
      for (const [dr, dc] of dirsOf(p)) {
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
    const tr = trackMap(level);
    const free = (y, x) => {
      const v = g[y * level.W + x], t = tr.get(y * level.W + x);
      return (v === -1 || v === p.id) && (!t || t === p.color);
    };
    for (const gt of gates) {
      if (!gateOk(p, gt)) continue;
      const lane = laneOf(level, gt, cells);
      if (lane && lane.every(([y, x]) => free(y, x))) return gt;
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
      // A chained piece's padlock (lockColor = badge) opens for keys with that gem colour.
      if (p.key && q.lock && (q.lockColor ? (p.keyColor || p.color) === q.lockColor : q.color === p.color)) q.lock--;
    }
    st.gates = st.gates.map(gt => gt.frozen ? { ...gt, frozen: gt.frozen - 1 } : gt);
  }

  const moveTo = (st, id, r, c) => ({ pieces: st.pieces.map(x => x.id === id ? { ...x, r, c } : x), gates: st.gates });

  // How blocked piece T is: the cheapest route to a position from which it can leave through a
  // thawed exit of its colour, where every cell of another movable piece it has to pass costs 1.
  // Walls, iced/locked pieces and tracks of another colour can't be passed at all.
  function blockers(level, st, T) {
    const W = level.W, H = level.H, g = grid(level, st.pieces), tr = trackMap(level);
    const gates = st.gates.filter(gt => gateOk(T, gt));
    const none = { cost: Infinity, ids: new Set(), cells: new Set() };
    if (!gates.length) return none;
    const byId = new Map(st.pieces.map(p => [p.id, p]));
    const cell = (y, x) => {
      if (y < 0 || x < 0 || y >= H || x >= W) return Infinity;
      const v = g[y * W + x], t = tr.get(y * W + x);
      if (v === -2 || (t && t !== T.color)) return Infinity;
      if (v === -1 || v === T.id) return 0;
      return movable(byId.get(v)) ? 1 : Infinity;
    };
    const at = (r, c) => {
      let s = 0;
      for (const [y, x] of cellsOf(T, r, c)) { const k = cell(y, x); if (k === Infinity) return Infinity; s += k; }
      return s;
    };
    const idsAt = (cells, into) => cells.forEach(([y, x]) => { const v = g[y * W + x]; if (v >= 0 && v !== T.id) into.add(v); });
    const lane = (r, c, want) => {
      const cells = cellsOf(T, r, c);
      let best = Infinity, bestRun = [];
      for (const gt of gates) {
        const run = laneOf(level, gt, cells);
        if (!run) continue;
        let s = 0;
        for (const [yy, xx] of run) { s += cell(yy, xx); if (want) want.push([yy, xx]); }
        if (s < best) { best = s; bestRun = want ? want.splice(0) : []; } else if (want) want.length = 0;
      }
      return want ? bestRun : best;
    };
    const dist = new Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
    const start = T.r * W + T.c;
    dist[start] = 0;
    const buckets = [[start]];
    let best = Infinity, bestAt = -1;
    for (let d = 0; d < buckets.length && d < best; d++) {
      for (const i of buckets[d] || []) {
        if (dist[i] !== d) continue;
        const r = (i / W) | 0, c = i % W;
        const l = lane(r, c);
        if (d + l < best) { best = d + l; bestAt = i; }
        for (const [dr, dc] of dirsOf(T)) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
          const k = at(nr, nc);
          if (k === Infinity || d + k >= dist[nr * W + nc]) continue;
          dist[nr * W + nc] = d + k;
          prev[nr * W + nc] = i;
          (buckets[d + k] = buckets[d + k] || []).push(nr * W + nc);
        }
      }
    }
    if (bestAt < 0) return none;
    // The pieces standing on that route (and in the way out) are the ones worth moving.
    const ids = new Set(), cells = new Set();
    const note = list => { idsAt(list, ids); list.forEach(([y, x]) => cells.add(y * W + x)); };
    for (let i = bestAt; i >= 0; i = prev[i]) note(cellsOf(T, (i / W) | 0, i % W));
    note(lane((bestAt / W) | 0, bestAt % W, []));
    return { cost: best, ids, cells };
  }

  function canExit(level, st, id) {
    const p = st.pieces.find(x => x.id === id);
    const g = grid(level, st.pieces);
    for (const [r, c] of reachable(level, g, p)) if (gateFor(level, g, st.gates, p, r, c)) return true;
    return false;
  }

  // Breadth-first search over drags of the pieces in `ids` (everything else stays put) until piece
  // `tid` can leave. Compact: footprints are precomputed per anchor cell, and pieces that look and
  // behave the same are interchangeable, so their positions are compared as a set.
  function fastSearch(level, st, tid, ids, cap, deadline, progress, park, guided) {
    const W = level.W, H = level.H, N = W * H, tr = trackMap(level);
    const rel = st.pieces.filter(p => ids.has(p.id) && movable(p));
    const T = rel.findIndex(p => p.id === tid);
    if (T < 0) return null;
    const base = new Int16Array(N).fill(-1);
    for (const [r, c] of level.walls || []) base[r * W + c] = -2;
    for (const p of st.pieces) if (!rel.includes(p)) for (const [r, c] of cellsOf(p)) base[r * W + c] = -3;
    const K = rel.length;
    const foot = rel.map(p => {
      const arr = new Array(N).fill(null);
      for (let a = 0; a < N; a++) {
        const r = (a / W) | 0, c = a % W, cs = [];
        let ok = true;
        for (const [dr, dc] of offsets(p)) {
          const y = r + dr, x = c + dc;
          if (y < 0 || x < 0 || y >= H || x >= W) { ok = false; break; }
          const i = y * W + x, t = tr.get(i);
          if (base[i] !== -1 || (t && t !== p.color)) { ok = false; break; }
          cs.push(i);
        }
        if (ok) arr[a] = cs;
      }
      return arr;
    });
    // For each anchor of the target: the lane cells that must be empty to leave through a gate.
    const P = rel[T];
    const lanes = new Array(N).fill(null);
    for (let a = 0; a < N; a++) {
      if (!foot[T][a]) continue;
      const cells = cellsOf(P, (a / W) | 0, a % W);
      for (const gt of st.gates) {
        if (!gateOk(P, gt)) continue;
        const run = laneOf(level, gt, cells);
        if (!run) continue;
        const lane = [];
        let ok = true;
        for (const [y, x] of run) {
          const i = y * W + x, t = tr.get(i);
          if (base[i] !== -1 || (t && t !== P.color)) ok = false;
          lane.push(i);
        }
        if (ok) (lanes[a] = lanes[a] || []).push(lane);
      }
    }
    const sig = rel.map((p, k) => k === T ? '#' : [p.color, p.inner || '', p.key ? 1 + (p.keyColor || '') : 0, p.lock + (p.lockColor || ''), p.axis || '', p.star ? 1 : 0, p.shape ? JSON.stringify(p.shape) : p.h + 'x' + p.w].join('|'));
    const groups = [...new Set(sig)].map(g => sig.map((s2, k) => s2 === g ? k : -1).filter(k => k >= 0));
    // Positions are stored flat (K numbers per state) and remembered by a 64-bit hash of the
    // canonical (per-group sorted) positions, which keeps a million+ states within phone memory.
    const tmp = new Int32Array(K);
    const hashOf = pos => {
      let o = 0;
      for (const g of groups) { const s0 = o; for (const k of g) tmp[o++] = pos[k]; tmp.subarray(s0, o).sort(); }
      let h1 = 0x811c9dc5, h2 = 0x9747b28c;
      for (let i = 0; i < K; i++) { h1 = Math.imul(h1 ^ tmp[i], 16777619); h2 = Math.imul(h2 ^ (tmp[i] + 0x9e37), 2246822519) ^ (h2 >>> 13); }
      return [(h1 | 1) >>> 0, h2 >>> 0];
    };
    let SLOTS = 1 << 12;
    while (SLOTS < cap * 2 && SLOTS < 1 << 22) SLOTS <<= 1;
    const hA = new Uint32Array(SLOTS), hB = new Uint32Array(SLOTS);
    const remember = pos => {
      const [a, b] = hashOf(pos);
      for (let i = a & (SLOTS - 1); ; i = (i + 1) & (SLOTS - 1)) {
        if (hA[i] === 0) { hA[i] = a; hB[i] = b; return true; }
        if (hA[i] === a && hB[i] === b) return false;
      }
    };
    const occ = new Int16Array(N);
    const fill = pos => { occ.set(base); for (let k = 0; k < K; k++) for (const i of foot[k][pos[k]]) occ[i] = k; };
    const axes = rel.map(p => p.axis || '');
    const reach = (k, pos) => {
      const seen = new Set([pos[k]]), q = [pos[k]];
      const ok = a => { const f = foot[k][a]; if (!f) return false; for (const i of f) if (occ[i] !== -1 && occ[i] !== k) return false; return true; };
      const ax = axes[k];
      for (let h = 0; h < q.length; h++) {
        const a = q[h], c = a % W;
        for (const b of [ax === 'h' ? -1 : a - W, ax === 'h' ? -1 : a + W, ax !== 'v' && c > 0 ? a - 1 : -1, ax !== 'v' && c < W - 1 ? a + 1 : -1]) {
          if (b < 0 || b >= N || seen.has(b) || !ok(b)) continue;
          seen.add(b); q.push(b);
        }
      }
      return q;
    };
    // Goal: leave through a gate, or (park) sit entirely on tracks of its colour, where no other
    // piece can come, ready for the next stage.
    const onTrack = a => foot[T][a] && foot[T][a].every(i => tr.get(i) === P.color);
    const canLeave = park ? (anchors => anchors.some(onTrack))
      : (anchors => anchors.some(a => (lanes[a] || []).some(l => l.every(i => occ[i] === -1 || occ[i] === T))));
    // Guided mode: how many occupied cells lie on the target's cheapest way out (route + lane).
    const hcost = () => {
      const dist = new Int16Array(N).fill(32767), bk = [[]];
      let best = 32767;
      const cost = a => { let c = 0; for (const i of foot[T][a]) if (occ[i] !== -1 && occ[i] !== T) { if (occ[i] < 0) return -1; c++; } return c; };
      const s0 = startPos[T]; dist[s0] = 0; bk[0].push(s0);
      for (let d = 0; d < bk.length && d < best; d++)
        for (const a of bk[d] || []) {
          if (dist[a] !== d) continue;
          for (const l of lanes[a] || []) { let c = 0, bad = false; for (const i of l) if (occ[i] !== -1 && occ[i] !== T) { if (occ[i] < 0) bad = true; c++; } if (!bad) best = Math.min(best, d + c); }
          const c = a % W, ax = axes[T];
          for (const b of [ax === 'h' ? -1 : a - W, ax === 'h' ? -1 : a + W, ax !== 'v' && c > 0 ? a - 1 : -1, ax !== 'v' && c < W - 1 ? a + 1 : -1]) {
            if (b < 0 || b >= N || !foot[T][b]) continue;
            const k = cost(b);
            if (k < 0 || d + k >= dist[b]) continue;
            dist[b] = d + k; (bk[d + k] = bk[d + k] || []).push(b);
          }
        }
      return best;
    };
    let startPos;
    const heapI = [], heapF = [];
    const hpush = (i, f) => {
      let n = heapI.length; heapI.push(i); heapF.push(f);
      while (n > 0) { const p = (n - 1) >> 1; if (heapF[p] <= f) break; heapI[n] = heapI[p]; heapF[n] = heapF[p]; n = p; }
      heapI[n] = i; heapF[n] = f;
    };
    const hpop = () => {
      const top = heapI[0], li = heapI.pop(), lf = heapF.pop();
      if (heapI.length) {
        let n = 0;
        for (;;) { let c = 2 * n + 1; if (c >= heapI.length) break; if (c + 1 < heapI.length && heapF[c + 1] < heapF[c]) c++; if (heapF[c] >= lf) break; heapI[n] = heapI[c]; heapF[n] = heapF[c]; n = c; }
        heapI[n] = li; heapF[n] = lf;
      }
      return top;
    };
    const gOf = [];
    const start = rel.map(p => p.r * W + p.c);
    cap = Math.min(cap, (SLOTS * 0.6) | 0);
    let size = 1 << 16, buf = new Int16Array(size * K), parent = new Int32Array(size), mover = new Int8Array(size), from = new Int16Array(size);
    let count = 0;
    const push = (pos, par, k, fr) => {
      if (count === size) {
        size *= 2;
        const nb = new Int16Array(size * K); nb.set(buf); buf = nb;
        const np = new Int32Array(size); np.set(parent); parent = np;
        const nm = new Int8Array(size); nm.set(mover); mover = nm;
        const nf = new Int16Array(size); nf.set(from); from = nf;
      }
      buf.set(pos, count * K); parent[count] = par; mover[count] = k; from[count] = fr;
      return count++;
    };
    const stateAt = i => Array.from(buf.subarray(i * K, i * K + K));
    remember(start); push(start, -1, -1, -1);
    if (guided) { gOf[0] = 0; hpush(0, 0); }
    for (let step = 0; guided ? heapI.length : step < count; step++) {
      let h = guided ? hpop() : step;
      let pos = stateAt(h);
      fill(pos);
      const got = reach(T, pos);
      if (canLeave(got)) {
        if (park && !onTrack(pos[T])) {
          const a = got.find(onTrack);
          h = push(pos.map((v, k) => k === T ? a : v), h, T, pos[T]);
        }
        const moves = [];
        for (let i = h; parent[i] >= 0; i = parent[i]) {
          const k = mover[i], p = rel[k], to = buf[i * K + k];
          moves.unshift({ pieceId: p.id, fromR: (from[i] / W) | 0, fromC: from[i] % W, r: (to / W) | 0, c: to % W });
        }
        let s2 = st;
        for (const mv of moves) s2 = moveTo(s2, mv.pieceId, mv.r, mv.c);
        return { st: s2, moves };
      }
      for (let k = 0; k < K; k++) {
        for (const a of reach(k, pos)) {
          if (a === pos[k]) continue;
          const old = pos[k];
          pos[k] = a;
          if (remember(pos)) {
            const id = push(pos, h, k, old);
            if (guided) {
              fill(pos); startPos = pos;
              const hv = hcost();
              fill(pos.map((v, kk) => kk === k ? old : v));
              gOf[id] = gOf[h] + 1;
              if (hv < 32767) hpush(id, gOf[id] + 3 * hv);
            }
          }
          pos[k] = old;
        }
      }
      if (count > cap || (step & 255) === 0 && performance.now() > deadline) return null;
      if (progress && (step & 8191) === 0) progress(count);
    }
    return null;
  }

  // Nothing can leave right now: find the shortest sequence of drags that lets one piece out.
  // Breadth-first, moving only pieces near that piece's cheapest way out (the route through
  // other pieces), widening the circle if needed. Every target gets the cheap searches first.
  function findUnblock(level, st, deadline, progress) {
    const W = level.W;
    const targets = st.pieces.filter(movable).map(T => ({ id: T.id, b: blockers(level, st, T) }))
      .filter(t => isFinite(t.b.cost)).sort((a, b) => a.b.cost - b.b.cost);
    const key = s => s.pieces.map(p => p.r + ',' + p.c).join('|');
    const near = (p, cells, d) => cellsOf(p).some(([y, x]) => {
      for (const i of cells) if (Math.abs(((i / W) | 0) - y) + Math.abs(i % W - x) <= d) return true;
      return false;
    });
    const bfs = (tid, ids, cap) => fastSearch(level, st, tid, ids, cap, deadline, progress);
    const all = st.pieces.filter(movable);
    const tr = trackMap(level);
    // The part of the board a piece can get around in without crossing tracks (only the track's
    // colour may): the pieces there are the ones that can matter for getting it out of there.
    const compartment = T => {
      const g = grid(level, st.pieces), seen = new Set(), q = [];
      for (const [y, x] of cellsOf(T)) { seen.add(y * W + x); q.push(y * W + x); }
      const ids = new Set([T.id]);
      for (let h = 0; h < q.length; h++) {
        const i = q[h], y = (i / W) | 0, x = i % W;
        for (const [dy, dx] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const yy = y + dy, xx = x + dx, j = yy * W + xx;
          if (yy < 0 || xx < 0 || yy >= level.H || xx >= W || seen.has(j)) continue;
          const v = g[j];
          if (v === -2 || tr.get(j)) continue;
          if (v >= 0) { const p = st.pieces.find(z => z.id === v); if (!movable(p)) continue; ids.add(v); }
          seen.add(j); q.push(j);
        }
      }
      return ids;
    };
    const trackBound = t => {
      const T = st.pieces.find(p => p.id === t.id);
      return [...t.b.cells].some(i => tr.get(i) === T.color) && !cellsOf(T).every(([y, x]) => tr.get(y * W + x) === T.color);
    };
    const stages = [
      ...targets.map(t => () => bfs(t.id, new Set(all.filter(p => p.id === t.id || near(p, t.b.cells, 1)).map(p => p.id)), 100000)),
      ...targets.filter(trackBound).map(t => () => fastSearch(level, st, t.id, compartment(st.pieces.find(p => p.id === t.id)), 1500000, deadline, progress, true)),
      ...targets.map(t => () => bfs(t.id, new Set(all.filter(p => p.id === t.id || near(p, t.b.cells, 2)).map(p => p.id)), 400000)),
      ...targets.map(t => () => fastSearch(level, st, t.id, new Set(all.map(p => p.id)), 600000, deadline, progress, false, true)),
      ...targets.map(t => () => bfs(t.id, new Set(all.map(p => p.id)), 800000)),
    ];
    for (const stage of stages) {
      const res = stage();
      if (res) return res;
      if (performance.now() > deadline) return null;
    }
    return null;
  }

  // Exits only ever help (free space, tick counters, open locks) and drags are
  // reversible, so exiting whatever can exit next never blocks a solution.
  function solve(level, timeMs = 8000, progress) {
    const deadline = performance.now() + timeMs;
    let st = { pieces: clone(level.pieces), gates: clone(level.gates) };
    const steps = [];
    while (true) {
      if (!st.pieces.some(p => p.color !== '?')) return { ok: true, steps, final: st };
      const ex = findExit(level, st);
      if (ex) {
        const p = st.pieces.find(x => x.id === ex.pieceId);
        steps.push({ kind: 'exit', before: clone(st), pieceId: p.id, fromR: p.r, fromC: p.c, r: ex.r, c: ex.c, gateId: ex.gateId });
        applyExit(level, st, p.id, ex.r, ex.c);
        continue;
      }
      const un = findUnblock(level, st, deadline, progress);
      if (!un) return { ok: false, steps, final: st };
      for (const mv of un.moves) {
        steps.push({ kind: 'move', before: clone(st), ...mv });
        st = moveTo(st, mv.pieceId, mv.r, mv.c);
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
      for (const [dy, dx] of dirsOf(p)) {
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

  return { solve, movable, path, cellsOf, fastSearch };
})();

if (typeof module !== 'undefined') module.exports = Engine;
