// Screenshot → level. locate() finds the board on its own; run() reads the cells.
// Numbers (ice, crate, lock, frozen counts) are not read — the user types them.
const Detect = (() => {
  const hex = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  // Whole-cell average colours measured on real screenshots (studs and shading averaged out).
  const REF = Object.fromEntries(Object.entries({
    pink:   'e34098 e43e96 eb439f e9409b e63e98 ec44a0',
    yellow: 'e8ab0a eeae0b e2a310',
    sky:    '1193e1 1296e6',
    lime:   '6dbf0e 6fc20e',
    blue:   '1051d2 1158d8 0554e3 0254ee',
    purple: '8c30d9 9333e2 8d2fde 9e36f2',
    green:  '12b370 15bb77 08ba79',
    red:    'df2b1f f52824',
    orange: 'ed5f09',
    ice:    '0676f3 10b5f7',
    crate:  '473abd 3f2db4 4336b8',
    empty:  '262260 1f1e5a',
    frame:  '4b41ab 463ea2 4a40aa',
    frozen: 'd8e6f2 c8d8ea cce3ef c3e2ed',
  }).map(([k, v]) => [k, v.split(' ').map(hex)]));
  const NOT_PIECE = new Set(['empty', 'frame', 'frozen']);
  const FRAME = hex('4a41aa');
  const dist = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);

  function nearest(rgb) {
    let best = null, bd = Infinity;
    for (const [name, list] of Object.entries(REF))
      for (const ref of list) {
        const d = dist(rgb, ref);
        if (d < bd) { bd = d; best = name; }
      }
    return { name: best, dist: bd };
  }
  const classify = rgb => nearest(rgb).name;

  function sampler(img) {
    const { width: W, height: H, data } = img;
    return (x, y, rad = 2) => {
      let s = [0,0,0], n = 0;
      for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++) {
          const px = Math.round(x + dx), py = Math.round(y + dy);
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const i = (py * W + px) * 4;
          s[0] += data[i]; s[1] += data[i+1]; s[2] += data[i+2]; n++;
        }
      return n ? s.map(v => v / n) : [0,0,0];
    };
  }

  function vote(labels) {
    const m = {};
    for (const l of labels) m[l] = (m[l] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Coarse block averages, used for finding the frame and the background.
  function blocks(img, B) {
    const bw = Math.floor(img.width / B), bh = Math.floor(img.height / B);
    const avg = [];
    for (let by = 0; by < bh; by++)
      for (let bx = 0; bx < bw; bx++) {
        let s = [0,0,0], n = 0;
        for (let y = by * B; y < (by + 1) * B; y += 2)
          for (let x = bx * B; x < (bx + 1) * B; x += 2) {
            const i = (y * img.width + x) * 4;
            s[0] += img.data[i]; s[1] += img.data[i+1]; s[2] += img.data[i+2]; n++;
          }
        avg.push(s.map(v => v / n));
      }
    return { bw, bh, avg, B };
  }

  function flood(bw, bh, ok, seeds) {
    const seen = new Uint8Array(bw * bh);
    const q = seeds.filter(i => ok(i));
    q.forEach(i => seen[i] = 1);
    while (q.length) {
      const i = q.pop(), x = i % bw, y = (i / bw) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy, j = ny * bw + nx;
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh || seen[j] || !ok(j)) continue;
        seen[j] = 1; q.push(j);
      }
    }
    return seen;
  }

  // Find the play grid: the largest frame-coloured region is the board's frame; its inner edge is
  // the grid edge; the column count is the one whose lattice lines best match the seams.
  function locate(img) {
    const at = sampler(img);
    const px = (x, y) => at(x, y, 0);
    const bk = blocks(img, Math.max(4, Math.round(img.width / 150)));
    const { bw, bh, avg, B } = bk;
    const isF = i => dist(avg[i], FRAME) < 16;
    // Exits break the frame into segments: start from the largest and absorb every sizeable
    // segment that touches the growing outline.
    const seen = new Uint8Array(bw * bh);
    const comps = [];
    for (let i = 0; i < bw * bh; i++) {
      if (seen[i] || !isF(i)) continue;
      const comp = flood(bw, bh, j => !seen[j] && isF(j), [i]);
      let n = 0, x0 = bw, y0 = bh, x1 = 0, y1 = 0;
      comp.forEach((v, j) => {
        if (!v) return;
        seen[j] = 1; n++;
        const x = j % bw, y = (j / bw) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      });
      if (n >= 10) comps.push({ n, x0, y0, x1, y1 });
    }
    if (!comps.length) return null;
    comps.sort((a, b) => b.n - a.n);
    const best = { ...comps[0] };
    const used = new Set([0]);
    for (let grew = true; grew;) {
      grew = false;
      comps.forEach((c, k) => {
        if (used.has(k) || c.n < comps[0].n * 0.05) return;
        const m = 0.5 * Math.max(best.x1 - best.x0, best.y1 - best.y0);
        if (c.x1 < best.x0 - m || c.x0 > best.x1 + m || c.y1 < best.y0 - m || c.y0 > best.y1 + m) return;
        used.add(k); grew = true; best.n += c.n;
        best.x0 = Math.min(best.x0, c.x0); best.y0 = Math.min(best.y0, c.y0);
        best.x1 = Math.max(best.x1, c.x1); best.y1 = Math.max(best.y1, c.y1);
      });
    }
    if (best.n < bw * bh * 0.01) return null;
    const O = { x0: best.x0 * B, y0: best.y0 * B, x1: (best.x1 + 1) * B, y1: (best.y1 + 1) * B };

    const frameAt = (x, y) => dist(px(x, y), FRAME) < 34;
    // Walk inward from the outer edge through the frame; the first non-frame pixel is the grid edge.
    // The frame's inner edge has a dark bevel; step over it to the first piece face. Lines that
    // meet an empty cell run to the bevel limit instead, and lose to lines that meet a piece.
    const bevel = Math.round(0.03 * Math.max(O.x1 - O.x0, O.y1 - O.y0));
    const shadow = ([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11 < 70;
    const gapOk = Math.max(3, Math.round(0.01 * Math.max(O.x1 - O.x0, O.y1 - O.y0)));
    const scan = (x, y, dx, dy, limit) => {
      let k = 0;
      while (k < 2 * B && !frameAt(x + dx * k, y + dy * k)) k++;
      if (k >= 2 * B) return null;
      let miss = 0, last = k;
      for (; k < limit; k++) {
        if (frameAt(x + dx * k, y + dy * k)) { miss = 0; last = k; }
        else if (++miss > gapOk) break;
      }
      if (k >= limit) return null;
      k = last + 1;
      const end = k + bevel;
      while (k < end && shadow(px(x + dx * k, y + dy * k))) k++;
      return k;
    };
    const edge = (vals, want) => {
      vals = vals.filter(v => v !== null).sort((a, b) => a - b);
      const ok = vals.filter(v => vals.filter(w => Math.abs(w - v) <= 3).length >= 8);
      if (!ok.length) return null;
      return want === 'min' ? ok[0] : ok[ok.length - 1];
    };
    const W0 = O.x1 - O.x0, H0 = O.y1 - O.y0;
    const L = [], R = [], T = [], D = [];
    for (let y = O.y0; y < O.y1; y += 2) {
      const l = scan(O.x0, y, 1, 0, W0 / 2); L.push(l === null ? null : O.x0 + l);
      const r = scan(O.x1 - 1, y, -1, 0, W0 / 2); R.push(r === null ? null : O.x1 - 1 - r);
    }
    for (let x = O.x0; x < O.x1; x += 2) {
      const t = scan(x, O.y0, 0, 1, H0 / 2); T.push(t === null ? null : O.y0 + t);
      const d = scan(x, O.y1 - 1, 0, -1, H0 / 2); D.push(d === null ? null : O.y1 - 1 - d);
    }
    const gx0 = edge(L, 'min'), gx1 = edge(R, 'max'), gy0 = edge(T, 'min'), gy1 = edge(D, 'max');
    if ([gx0, gx1, gy0, gy1].some(v => v === null)) return null;
    const Wg = gx1 - gx0 + 1, Hg = gy1 - gy0 + 1;

    const lum = ([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11;
    const cands = [];
    for (let n = 3; n <= 12; n++) {
      const cs = Wg / n, m = Math.round(Hg / cs);
      if (m < 3 || m > 16 || Math.abs(Hg / cs - m) > 0.15) continue;
      const vals = [];
      const valley = (lineAt, sideA, sideB) => {
        const line = Math.min(...[-2, -1, 0, 1, 2].map(lineAt));
        vals.push(Math.max(0, Math.min(sideA, sideB) - line));
      };
      for (let k = 1; k < n; k++)
        for (let j = 0; j < m; j++)
          for (const t of [0.3, 0.5, 0.7]) {
            const x = gx0 + k * cs, y = gy0 + (j + t) * cs;
            valley(o => lum(px(x + o, y)), lum(px(x - 0.18 * cs, y)), lum(px(x + 0.18 * cs, y)));
          }
      for (let j = 1; j < m; j++)
        for (let k = 0; k < n; k++)
          for (const t of [0.3, 0.5, 0.7]) {
            const x = gx0 + (k + t) * cs, y = gy0 + j * cs;
            valley(o => lum(px(x, y + o)), lum(px(x, y - 0.18 * cs)), lum(px(x, y + 0.18 * cs)));
          }
      cands.push({ n, m, score: vals.reduce((a, b) => a + b, 0) / vals.length });
    }
    if (!cands.length) return null;
    const top = Math.max(...cands.map(c => c.score));
    const pick = cands.filter(c => c.score >= 0.8 * top).sort((a, b) => b.n - a.n)[0];

    return { rect: { x: gx0, y: gy0, w: Wg, h: Hg }, W: pick.n, H: pick.m };
  }

  // rect = play grid in image pixels; W×H = cells.
  function run(img, rect, W, H) {
    const at = sampler(img);
    const cw = rect.w / W, ch = rect.h / H;
    const cx = c => rect.x + (c + 0.5) * cw, cy = r => rect.y + (r + 0.5) * ch;
    const rad = Math.max(1, Math.round(Math.min(cw, ch) * 0.04));

    // Cell colour = average over most of the cell. An icon (padlock, crate badge) skews the
    // average away from every reference; then the corners, which it doesn't cover, decide.
    const cls = [], odd = [], lockCell = [];
    const gold = ([R, G, B]) => R > 150 && G > 80 && G < 200 && B < 60;
    const step = Math.max(1, Math.round(Math.min(cw, ch) / 25));
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++) {
        const s = [0,0,0]; let n = 0;
        for (let dy = -.3 * ch; dy <= .3 * ch; dy += step)
          for (let dx = -.3 * cw; dx <= .3 * cw; dx += step) {
            const v = at(cx(c) + dx, cy(r) + dy, 0);
            s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; n++;
          }
            const m = nearest(s.map(v => v / n));
        const corners = [[-.3,-.3],[.3,-.3],[-.3,.3],[.3,.3]].map(([dx, dy]) => classify(at(cx(c) + dx*cw, cy(r) + dy*ch, rad)));
        odd.push(m.dist > 45);
        // A padlock: an icon cell with gold somewhere around its middle.
        const goldHit = m.dist > 45 && !['yellow', 'orange'].includes(vote(corners)) && [[0,0],[0,.18],[.15,.15],[-.15,.15],[0,-.2],[.12,0],[-.12,0]]
          .some(([dx, dy]) => gold(at(cx(c) + dx*cw, cy(r) + dy*ch, rad)));
        lockCell.push(goldHit);
        let label = m.dist > 45 ? vote(corners) : m.name;
        if (goldHit && label === 'ice') label = 'blue';
        cls.push(label);
      }

    // Cells outside the board (e.g. a staircase edge) are background reachable from the
    // screen edge without crossing the frame; empty cells inside the frame aren't.
    const bk = blocks(img, Math.max(3, Math.round(Math.min(cw, ch) / 6)));
    const darkB = i => { const [R, G, B] = bk.avg[i]; return R + G + B < 230 && B < 130; };
    const border = [];
    for (let x = 0; x < bk.bw; x++) border.push(x, (bk.bh - 1) * bk.bw + x);
    for (let y = 0; y < bk.bh; y++) border.push(y * bk.bw, y * bk.bw + bk.bw - 1);
    const outside = flood(bk.bw, bk.bh, darkB, border);
    // Frame-coloured cells are walls (staircase steps) when they connect to that background;
    // inside the board the same colour is a crate.
    const isWall = new Uint8Array(W * H);
    const q = [];
    for (let i = 0; i < W * H; i++) {
      const bx = Math.floor(cx(i % W) / bk.B), by = Math.floor(cy(Math.floor(i / W)) / bk.B);
      if (outside[by * bk.bw + bx]) { isWall[i] = 1; q.push(i); }
    }
    while (q.length) {
      const i = q.pop(), r = Math.floor(i / W), c = i % W;
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nr = r + dr, nc = c + dc, j = nr * W + nc;
        if (nr < 0 || nc < 0 || nr >= H || nc >= W || isWall[j] || cls[j] !== 'frame') continue;
        isWall[j] = 1; q.push(j);
      }
    }
    const walls = [];
    for (let i = 0; i < W * H; i++) {
      if (isWall[i]) { walls.push([Math.floor(i / W), i % W]); cls[i] = 'wall'; }
      else if (cls[i] === 'frame') cls[i] = 'crate';
    }
    // A crate's number badge makes its cell look like something else; it belongs to the crate.
    for (let i = 0; i < W * H; i++) {
      if (!odd[i] || cls[i] === 'crate') continue;
      const r = Math.floor(i / W), c = i % W;
      const nb = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nc >= 0 && nr < H && nc < W && cls[nr * W + nc] === 'crate';
      }).length;
      if (nb >= 3) cls[i] = 'crate';
    }

    // Separate pieces are divided by a dark seam (crates by their orange border); cells of one piece aren't.
    const parent = cls.map((_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    // A seam is a thin line clearly darker than the faces on both sides of it.
    const lum = ([R, G, B]) => R * 0.3 + G * 0.59 + B * 0.11;
    const joined = (a, b, pts, nx, ny) => {
      if (cls[a] !== cls[b] || NOT_PIECE.has(cls[a]) || cls[a] === 'wall' || lockCell[a] || lockCell[b]) return false;
      if (cls[a] === 'crate') return pts.filter(([x, y]) => ['crate', 'frame'].includes(classify(at(x, y, 1)))).length / pts.length > 0.5;
      const w = Math.max(2, Math.round(0.06 * cw)), side = 0.25 * cw;
      const seam = pts.filter(([x, y]) => {
        let line = Infinity;
        for (let o = -w; o <= w; o++) line = Math.min(line, lum(at(x + nx * o, y + ny * o, 0)));
        const faces = Math.min(lum(at(x - nx * side, y - ny * side, 1)), lum(at(x + nx * side, y + ny * side, 1)));
        return line < 0.6 * faces;
      }).length;
      return seam / pts.length < 0.5;
    };
    // Skip the middle of each border: icons (keys) sit on a piece's centre, often across a border.
    const along = () => [0.1, 0.15, 0.2, 0.25, 0.3, 0.7, 0.75, 0.8, 0.85, 0.9];
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++) {
        const i = r * W + c;
        if (c + 1 < W) {
          const x = rect.x + (c + 1) * cw;
          if (joined(i, i + 1, along().map(t => [x, rect.y + (r + t) * ch]), 1, 0)) parent[find(i)] = find(i + 1);
        }
        if (r + 1 < H) {
          const y = rect.y + (r + 1) * ch;
          if (joined(i, i + W, along().map(t => [rect.x + (c + t) * cw, y]), 0, 1)) parent[find(i)] = find(i + W);
        }
      }

    const groups = new Map();
    cls.forEach((l, i) => {
      if (NOT_PIECE.has(l) || l === 'wall') return;
      const k = find(i);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    });

    const pieces = [];
    let id = 1;
    const addPiece = (cells, label) => {
      const rs = cells.map(i => Math.floor(i / W)), cs = cells.map(i => i % W);
      const r = Math.min(...rs), c = Math.min(...cs);
      const h = Math.max(...rs) - r + 1, w = Math.max(...cs) - c + 1;
      const hidden = label === 'ice' || label === 'crate';
      const p = { id: id++, color: hidden ? '?' : label, r, c, h, w, key: false, lock: 0, ice: hidden ? 1 : 0 };
      if (label === 'crate') p.crate = true;
      if (cells.length !== h * w) p.shape = cells.map(i => [Math.floor(i / W) - r, i % W - c]);
      if (!hidden && h * w === 1 && lockCell[r * W + c]) p.lock = 1;
      else if (!hidden && label !== 'yellow' && label !== 'orange') {
        const mx = rect.x + (c + w / 2) * cw, my = rect.y + (r + h / 2) * ch;
        const spots = [[0,0],[-.12,0],[.12,0],[0,-.12],[0,.12],[-.2,-.1],[.1,.2],[-.1,.2],[.2,-.1]];
        if (spots.some(([dx, dy]) => gold(at(mx + dx*cw, my + dy*ch, rad)))) p.key = true;
      }
      // Layered piece: a different colour runs through the middle of every cell.
      if (!hidden && !p.key && !p.lock) {
        const cores = cells.map(i => classify(at(cx(i % W), cy(Math.floor(i / W)), rad * 2)));
        const core = vote(cores);
        if (core !== label && REF[core] && !NOT_PIECE.has(core) && !['ice', 'crate'].includes(core)
            && cores.filter(x => x === core).length / cores.length >= 0.6) p.inner = core;
      }
      pieces.push(p);
    };

    // Ice blocks touch without a seam, but each shows its countdown number at its centre.
    const digits = (x, y) => {
      const R = Math.max(2, Math.round(cw * 0.15)); let n = 0, t = 0;
      for (let dy = -R; dy < R; dy += 2)
        for (let dx = -R; dx < R; dx += 2) {
          const [r2, g2, b2] = at(x + dx, y + dy, 0); t++;
          if (r2 > 150 && g2 > 220 && b2 > 230) n++;
        }
      return n / t;
    };
    const splitIce = cells => {
      const free = new Set(cells);
      const cands = [];
      for (const i of cells) {
        const r = Math.floor(i / W), c = i % W;
        for (const [h, w] of [[1,1],[2,1],[1,2],[2,2]]) {
          const cover = [];
          for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) cover.push(y * W + x);
          if (r + h > H || c + w > W || !cover.every(k => free.has(k))) continue;
          const f = digits(rect.x + (c + w / 2) * cw, rect.y + (r + h / 2) * ch);
          if (f > 0.012) cands.push({ f, cover });
        }
      }
      cands.sort((a, b) => b.f - a.f);
      const out = [];
      for (const cd of cands) {
        if (!cd.cover.every(k => free.has(k))) continue;
        cd.cover.forEach(k => free.delete(k));
        out.push(cd.cover);
      }
      free.forEach(k => out.push([k]));
      return out;
    };

    for (const [, cells] of groups) {
      const label = cls[cells[0]];
      if (label === 'ice') splitIce(cells).forEach(cv => addPiece(cv, 'ice'));
      else addPiece(cells, label);
    }

    // Exits: sample the frame just outside each edge cell, avoiding the arrow in the middle.
    const gates = [];
    let gid = 1;
    const edge = (side, n, pos) => {
      const kinds = [];
      for (let k = 0; k < n; k++) {
        const pts = [-.4, -.3, .3, .4].map(t => classify(at(...pos(k + 0.5 + t), rad)));
        // Digits on a frozen tile can cover the middle of a cell, so any frozen sample wins.
        const l = pts.filter(x => x === 'frozen').length >= 2 ? 'frozen' : vote(pts);
        kinds.push(['frame', 'empty', 'ice', 'crate'].includes(l) ? null : l);
      }
      for (let k = 0; k < n; k++) {
        const l = kinds[k];
        if (!l) continue;
        let e = k;
        // Frozen tiles sit side by side; one tile spanning several cells has no gap between them.
        while (e + 1 < n && kinds[e + 1] === l && (l !== 'frozen' || classify(at(...pos(e + 1), 1)) === 'frozen')) e++;
        gates.push({ id: gid++, side, start: k, len: e - k + 1, color: l === 'frozen' ? '?' : l, frozen: l === 'frozen' ? 1 : 0 });
        k = e;
      }
    };
    const off = 0.4;
    edge('L', H, t => [rect.x - off * cw, rect.y + t * ch]);
    edge('R', H, t => [rect.x + rect.w + off * cw, rect.y + t * ch]);
    edge('T', W, t => [rect.x + t * cw, rect.y - off * ch]);
    edge('B', W, t => [rect.x + t * cw, rect.y + rect.h + off * ch]);

    return { W, H, walls, pieces, gates, tickPerCell: false };
  }

  return { locate, run };
})();

if (typeof module !== 'undefined') module.exports = Detect;
