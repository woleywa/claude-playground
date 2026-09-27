// Screenshot → level. locate() finds the board on its own; run() reads the cells.
// Numbers (ice, crate, lock, frozen counts) are not read — the user types them.
const Detect = (() => {
  const hex = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  // Whole-cell average colours measured on real screenshots (studs and shading averaged out).
  const REF = Object.fromEntries(Object.entries({
    pink:   'e34098 e43e96 eb439f e9409b e63e98 ec44a0',
    yellow: 'e8ab0a eeae0b e2a310',
    sky:    '1193e1 1296e6',
    lime:   '6dbf0e 6fc20e 6fc701',
    blue:   '1051d2 1158d8 0554e3 0254ee',
    purple: '8c30d9 9333e2 8d2fde 9e36f2',
    green:  '12b370 15bb77 08ba79 0a8315 009310 087717',
    red:    'df2b1f f52824',
    orange: 'ed5f09',
    ice:    '0676f3 10b5f7',
    crate:  '473abd 3f2db4 4336b8',
    empty:  '262260 1f1e5a',
    track:  '665941 62563d 685b43 6b5e48 5e533f',
    frame:  '4b41ab 463ea2 4a40aa',
    frozen: 'd8e6f2 c8d8ea cce3ef c3e2ed',
    white:  'f0ece8 eadccf e1c9c8 f4f4f4',
  }).map(([k, v]) => [k, v.split(' ').map(hex)]));
  const NOT_PIECE = new Set(['empty', 'frame', 'frozen', 'track', 'white']);
  const SOLID = new Set(['pink', 'yellow', 'sky', 'lime', 'blue', 'purple', 'green', 'red', 'orange']);
  // Colour pairs that shading alone can produce inside one plain piece.
  const PARTNER = { yellow: ['orange'], orange: ['yellow', 'red'], red: ['orange', 'pink'], pink: ['red', 'purple'],
    blue: ['sky'], sky: ['blue'], green: ['lime'], lime: ['green'], purple: ['pink'] };
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
  const nearestSolid = rgb => {
    let best = null, bd = Infinity;
    for (const k of SOLID) for (const ref of REF[k]) { const d = dist(rgb, ref); if (d < bd) { bd = d; best = k; } }
    return best;
  };

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
        // Frozen tiles can cover most of the frame, leaving only corner pieces far apart.
        const m = Math.max(best.x1 - best.x0, best.y1 - best.y0, 0.4 * bw);
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
      const first = k;
      for (; k < limit; k++) {
        if (frameAt(x + dx * k, y + dy * k)) { miss = 0; last = k; }
        else if (++miss > gapOk) break;
      }
      // A run much longer than a frame is thick means the line runs along the frame, not across it.
      if (k >= limit || last - first > 0.15 * Math.max(O.x1 - O.x0, O.y1 - O.y0)) return null;
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
    let gx0 = edge(L, 'min'), gx1 = edge(R, 'max'), gy0 = edge(T, 'min'), gy1 = edge(D, 'max');
    // A side made entirely of exits has no plain frame to measure: mirror the opposite side
    // (roughly), then let the other axis's cell size place it exactly.
    const mirX = gx0 === null || gx1 === null, mirY = gy0 === null || gy1 === null;
    if (mirX && mirY) return null;
    if (gx0 === null && gx1 !== null) gx0 = O.x0 + (O.x1 - 1 - gx1);
    if (gx1 === null && gx0 !== null) gx1 = O.x1 - 1 - (gx0 - O.x0);
    if (gy0 === null && gy1 !== null) gy0 = O.y0 + (O.y1 - 1 - gy1);
    if (gy1 === null && gy0 !== null) gy1 = O.y1 - 1 - (gy0 - O.y0);
    const leftMir = edge(L, 'min') === null, topMir = edge(T, 'min') === null;
    if ([gx0, gx1, gy0, gy1].some(v => v === null)) return null;
    const Wg = gx1 - gx0 + 1, Hg = gy1 - gy0 + 1;

    const lum = ([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11;
    const cands = [];
    const tries = [];
    if (mirX) for (let m = 3; m <= 16; m++) {
      const cs = Hg / m, n = Math.round(Wg / cs);
      if (n < 3 || n > 12 || Math.abs(Wg / cs - n) > 0.35) continue;
      tries.push({ n, m, cs, x0: leftMir ? gx1 + 1 - n * cs : gx0, y0: gy0, sq: 1 });
    } else if (mirY) for (let n = 3; n <= 12; n++) {
      const cs = Wg / n, m = Math.round(Hg / cs);
      if (m < 3 || m > 16 || Math.abs(Hg / cs - m) > 0.35) continue;
      tries.push({ n, m, cs, x0: gx0, y0: topMir ? gy1 + 1 - m * cs : gy0, sq: 1 });
    } else for (let n = 3; n <= 12; n++) {
      const cs = Wg / n, m = Math.round(Hg / cs);
      if (m < 3 || m > 16 || Math.abs(Hg / cs - m) > 0.15) continue;
      tries.push({ n, m, cs, x0: gx0, y0: gy0, sq: Math.max(0, 1 - Math.abs(Hg / cs - m) / 0.5) });
    }
    for (const { n, m, cs, x0: gx0, y0: gy0, sq } of tries) {
      const vals = [];
      // Let each line find its seam within a few % of a cell, so small edge errors don't matter.
      const win = [];
      for (let o = -Math.max(2, Math.round(0.05 * cs)); o <= Math.max(2, Math.round(0.05 * cs)); o++) win.push(o);
      const valley = (lineAt, sideA, sideB) => {
        const line = Math.min(...win.map(lineAt));
        vals.push(Math.max(0, 1 - line / Math.max(1, Math.min(sideA, sideB))));
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
      const score = vals.reduce((a, b) => a + b, 0) / vals.length;
      // With the right lattice each cell is mostly one colour; a wrong one cuts across pieces.
      let purity = 0;
      for (let j = 0; j < m; j++)
        for (let k = 0; k < n; k++) {
          const h = {};
          for (const u of [-0.3, -0.15, 0, 0.15, 0.3])
            for (const v of [-0.3, -0.15, 0, 0.15, 0.3]) {
              const l = classify(at(gx0 + (k + 0.5 + u) * cs, gy0 + (j + 0.5 + v) * cs, 1));
              h[l] = (h[l] || 0) + 1;
            }
          purity += Math.max(...Object.values(h)) / 25;
        }
      purity /= n * m;
      // Cells are square, so the right count also makes the rows come out (nearly) whole.
      cands.push({ n, m, score, purity, fit: score * purity * purity * sq, rect: { x: gx0, y: gy0, w: n * cs, h: m * cs } });
    }
    if (!cands.length) return null;
    const base = cands.reduce((a, b) => b.fit > a.fit ? b : a);
    // A lattice with twice the columns contains every true line too; only prefer it when its
    // seams score about as well, and never prefer an unrelated count.
    // A big crate has no seams inside, which favours too coarse a lattice; that one cuts across
    // pieces, though, so a finer one that is clearly purer also wins.
    const pick = cands.filter(c => c.n % base.n === 0 && (c.score >= 0.8 * base.score
      || (base.purity < 0.8 && c.purity >= base.purity + 0.07 && c.score >= 0.6 * base.score))).sort((a, b) => b.n - a.n)[0];

    return { rect: mirX || mirY ? pick.rect : { x: gx0, y: gy0, w: Wg, h: Hg }, W: pick.n, H: pick.m };
  }

  // rect = play grid in image pixels; W×H = cells.
  function run(img, rect, W, H) {
    const at = sampler(img);
    const cw = rect.w / W, ch = rect.h / H;
    const cx = c => rect.x + (c + 0.5) * cw, cy = r => rect.y + (r + 0.5) * ch;
    const rad = Math.max(1, Math.round(Math.min(cw, ch) * 0.04));

    // Cell colour = average over most of the cell. An icon (padlock, crate badge) skews the
    // average away from every reference; then the corners, which it doesn't cover, decide.
    const cls = [], odd = [], lockCell = [], layer = [], trackColor = [], starCell = [], cornerCls = [], rimN = [];
    // Star outlines are pale and unsaturated (cream on warm pieces, near-white on blue).
    const cream = v => { const mx = Math.max(...v), mn = Math.min(...v); return mx - mn < 110 && ((v[0] > 120 && v[1] > 90 && v[0] >= v[2]) || mn > 110); };
    const creamCount = (x0, y0) => {
      let n = 0;
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if (cream(at(x0 + (-0.42 + 0.14 * i) * cw, y0 + (-0.42 + 0.14 * j) * ch, rad))) n++;
      return n / 49;
    };
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
        // A padlock: an icon cell with gold and its red number badge around the middle.
        const near = [[0,0],[0,.18],[.15,.15],[-.15,.15],[0,-.2],[.12,0],[-.12,0],[.1,-.1],[-.1,-.1]]
          .map(([dx, dy]) => at(cx(c) + dx*cw, cy(r) + dy*ch, rad));
        // A padlock is largely gold (~25% of the cell); a rocket is mostly red with a little gold.
        let goldN = 0;
        for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (gold(at(cx(c) + (-0.35 + 0.0875 * i) * cw, cy(r) + (-0.35 + 0.0875 * j) * ch, 0))) goldN++;
        const goldHit = m.dist > 45 && (SOLID.has(vote(corners)) || vote(corners) === 'ice') && !['yellow', 'orange'].includes(vote(corners))
          && goldN / 81 >= 0.15
          && near.some(gold) && near.some(([R, G, B]) => (R > 170 && G < 70 && B < 70) || (!['blue', 'sky'].includes(vote(corners)) && B > 170 && R < 90 && G < 170));
        lockCell.push(goldHit);
        let label = m.dist > 45 ? vote(corners) : m.name;
        if (goldHit && label === 'ice') label = 'blue';
        // Track: hollow, so the middle shows the olive floor (an icon cell can average to it too).
        const middle = at(cx(c), cy(r), rad * 2);
        if (m.name === 'track') {
          if (m.dist < 25 && !(creamCount(cx(c), cy(r)) >= 0.12) && nearest(middle).name === 'track') label = 'track';
          else label = vote(corners);
        }

        // Layered piece: two unrelated colours each cover a good part of the cell; the one along
        // the cell's border is the outer layer, the other is the core.
        const hist = {}, rim = {};
        let creamN = 0;
        const quad = [0, 0, 0, 0];
        const face = [0, 0, 0]; let faceN = 0;
        for (let i = 0; i < 7; i++)
          for (let j = 0; j < 7; j++) {
            const v = at(cx(c) + (-0.42 + 0.14 * i) * cw, cy(r) + (-0.42 + 0.14 * j) * ch, rad);
            if (cream(v)) { creamN++; if (i !== 3 && j !== 3) quad[(i > 3 ? 1 : 0) + (j > 3 ? 2 : 0)]++; } else { face[0] += v[0]; face[1] += v[1]; face[2] += v[2]; faceN++; }
            const k = classify(v);
            hist[k] = (hist[k] || 0) + 1;
            if (i === 0 || i === 6 || j === 0 || j === 6) rim[k] = (rim[k] || 0) + 1;
          }
        // Fold shading (e.g. orange edges on yellow) into the stronger colour it belongs with.
        const solid = Object.entries(hist).filter(([k]) => SOLID.has(k)).sort((a, b) => b[1] - a[1]);
        const merged = {};
        for (const [k, n] of solid) {
          const home = Object.keys(merged).find(h => (PARTNER[h] || []).includes(k));
          if (home) merged[home] += n; else merged[k] = n;
        }
        const top = Object.entries(merged).sort((a, b) => b[1] - a[1]);
        let core = null;
        // Star piece: cream star outlines over the piece colour; the colour is the strongest one.
        // Stars fill all four quarters of a cell; an icon (battery) sits in the middle.
        const starry = m.name !== 'frozen' && creamN / 49 >= 0.12 && faceN > 0 && quad.filter(q => q > 0).length >= 3;
        if (starry) label = nearestSolid(face.map(v => v / faceN));
        starCell.push(starry);
        // Narrow crates: the gold/red rim covers a cell's corners, but planks fill much of it.
        const planks = (hist.crate || 0) + (hist.frame || 0);
        const rimOnly = Object.keys(hist).every(k => !SOLID.has(k) || ['yellow', 'orange', 'red'].includes(k));
        if (planks >= 15 && rimOnly && !goldHit) label = (hist.crate || 0) >= (hist.frame || 0) ? 'crate' : 'frame';
        // An icon (battery) can average out to the frame colour; the piece still shows all round it.
        const cv = vote(corners);
        if (['frame', 'crate'].includes(label) && SOLID.has(cv) && !['yellow', 'orange', 'red'].includes(cv) && top.length && top[0][0] === cv && top[0][1] >= 15) label = cv;
        // A big icon (double rocket) can cover the corners; the colour covering most of the cell wins.
        if (m.dist > 45 && !goldHit && top.length && top[0][1] >= 20 && SOLID.has(label) && label !== top[0][0]) label = top[0][0];
        // The core runs through the piece's middle, so it also shows at the cell's centre.
        const mid = vote([[0,0],[.08,0],[-.08,0],[0,.08],[0,-.08]].map(([dx, dy]) => classify(at(cx(c) + dx*cw, cy(r) + dy*ch, rad))));
        if (!starry && !goldHit && label !== 'track' && top.length >= 2 && top[1][1] >= 6 && !(PARTNER[top[0][0]] || []).includes(top[1][0])) {
          const [a, b] = [top[0][0], top[1][0]];
          const outer = (rim[a] || 0) >= (rim[b] || 0) ? a : b;
          const inner = outer === a ? b : a;
          if (mid === inner || (PARTNER[inner] || []).includes(mid)) { label = outer; core = inner; }
        }
        // Hollow track in a piece colour (e.g. purple): a thin outline of that colour around a flat,
        // dim floor; the whole cell is smooth, unlike a piece (studs) or a crate (planks).
        let hollow = null;
        if (!starry && !goldHit && top.length && label !== 'track') {
          let s1 = 0, s2 = 0;
          for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
            const v = at(cx(c) + (-0.35 + 0.1 * a) * cw, cy(r) + (-0.35 + 0.1 * b) * ch, 0);
            const L = v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11; s1 += L; s2 += L * L;
          }
          const sd = Math.sqrt(Math.max(0, s2 / 64 - (s1 / 64) ** 2));
          const ringTop = Object.entries(rim).filter(([k]) => SOLID.has(k)).sort((a, b) => b[1] - a[1])[0];
          if (sd < 12 && ringTop && ringTop[1] >= 10 && !SOLID.has(classify(middle))) hollow = ringTop[0];
        }
        if (hollow) { label = 'track'; core = null; }
        layer.push(core);
        rimN.push((hist.yellow || 0) + (hist.orange || 0) + (hist.red || 0));
        // Track: a hollow cell whose rim colour says which pieces may cross it.
        trackColor.push(hollow ? hollow : label === 'track'
          ? vote([[-.44,0],[.44,0],[0,-.44],[0,.44],[-.44,-.44],[.44,.44],[-.44,.44],[.44,-.44]]
              .map(([dx, dy]) => classify(at(cx(c) + dx*cw, cy(r) + dy*ch, rad))).filter(k => SOLID.has(k)).concat(['yellow']))
          : null);
        cls.push(label);
        cornerCls.push(vote(corners));
      }

    // Cells outside the board (e.g. a staircase edge) are background reachable from the
    // screen edge without crossing the frame; empty cells inside the frame aren't.
    const bk = blocks(img, Math.max(3, Math.round(Math.min(cw, ch) / 6)));
    const darkB = i => { const [R, G, B] = bk.avg[i]; return R + G + B < 230 && B < 130 && B >= Math.max(R, G); };
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
        // A crate's gold/red rim stops the wall from spreading into the crate.
        if (nr < 0 || nc < 0 || nr >= H || nc >= W || isWall[j] || cls[j] !== 'frame' || rimN[j] >= 5) continue;
        isWall[j] = 1; q.push(j);
      }
    }
    // Real walls hang together with the board edge or other walls on 2+ sides; a lone cell that
    // the background flood reached through a thin gap in the frame is just an empty cell.
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < W * H; i++) {
        if (!isWall[i]) continue;
        const r = Math.floor(i / W), c = i % W;
        const sides = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          return nr < 0 || nc < 0 || nr >= H || nc >= W || isWall[nr * W + nc];
        }).length;
        if (sides < 2) { isWall[i] = 0; changed = true; }
      }
    }
    const walls = [];
    for (let i = 0; i < W * H; i++) {
      if (isWall[i]) { walls.push([Math.floor(i / W), i % W]); cls[i] = 'wall'; }
      else if (cls[i] === 'frame') cls[i] = 'crate';
    }
    // Moons on crate planks look like star outlines: a "star" cell among crate cells is crate.
    for (let i = 0; i < W * H; i++) {
      if (!starCell[i]) continue;
      const r = Math.floor(i / W), c = i % W;
      const crates = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nc >= 0 && nr < H && nc < W && cls[nr * W + nc] === 'crate';
      }).length;
      if (crates >= 2) { cls[i] = 'crate'; starCell[i] = false; }
    }
    // A crate's number badge makes its cell look like something else; it belongs to the crate.
    const badge = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if ((!odd[i] && cls[i] !== 'wall') || cls[i] === 'crate') continue;
      const r = Math.floor(i / W), c = i % W;
      const nb = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nc >= 0 && nr < H && nc < W && cls[nr * W + nc] === 'crate';
      }).length;
      if (nb >= 3) {
        cls[i] = 'crate';
        // The badge is a small square in the middle; the cell's corners still show crate planks.
        if (['crate', 'frame'].includes(cornerCls[i])) badge[i] = 1;
        const k = walls.findIndex(([wr, wc]) => wr === r && wc === c);
        if (k >= 0) walls.splice(k, 1);
      }
    }

    // Separate pieces are divided by a dark seam (crates by their orange border); cells of one piece aren't.
    const parent = cls.map((_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    const lum = ([R, G, B]) => R * 0.3 + G * 0.59 + B * 0.11;
    const joined = (a, b, pts, nx, ny) => {
      if (cls[a] !== cls[b] || NOT_PIECE.has(cls[a]) || cls[a] === 'wall') return false;
      if (cls[a] !== 'crate' && (lockCell[a] || lockCell[b])) return false;
      if (cls[a] === 'crate' && (badge[a] || badge[b])) return true; // the number badge is part of its crate
      if (cls[a] === 'crate') return pts.filter(([x, y]) => ['crate', 'frame'].includes(classify(at(x, y, 1)))).length / pts.length > 0.5;
      // Star outlines make the inside of a star piece busy; only a navy gap separates two of them.
      if (starCell[a] && starCell[b]) return pts.filter(([x, y]) => { const [R, G, B] = at(x, y, 1); return R + G + B < 230 && B >= Math.max(R, G); }).length / pts.length < 0.5;
      // An icon (battery) sitting on the border hides the seam: only judge points with the piece's
      // colour on both sides of the line.
      const own = k => k === cls[a] || (PARTNER[cls[a]] || []).includes(k);
      // An icon covering half the border or more can only sit on one piece.
      const n0 = pts.length;
      if (SOLID.has(cls[a])) pts = pts.filter(([x, y]) => own(classify(at(x - nx * 0.2 * cw, y - ny * 0.2 * ch, 1))) && own(classify(at(x + nx * 0.2 * cw, y + ny * 0.2 * ch, 1))));
      if (pts.length < 3 || pts.length <= n0 / 2) return true;
      const w = Math.max(2, Math.round(0.06 * cw)), side = 0.25 * cw;
      // Studs repeat twice per cell, so inside a piece a cell border looks just like the line
      // through the middle of a cell. A seam between two pieces is darker than those mid-lines.
      const ratios = pts.map(([x, y]) => {
        const low = (x0, y0) => { let m = Infinity; for (let o = -w; o <= w; o++) m = Math.min(m, lum(at(x0 + nx * o, y0 + ny * o, 0))); return m; };
        const line = low(x, y);
        const mid = (low(x - nx * 0.5 * cw, y - ny * 0.5 * ch) + low(x + nx * 0.5 * cw, y + ny * 0.5 * ch)) / 2;
        return line / Math.max(1, mid);
      });
      const dark = t => ratios.filter(v => v < t).length / ratios.length;
      return !(dark(0.75) >= 0.5);
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
      const cores = cells.map(i => layer[i]).filter(Boolean);
      const inner = !hidden && cores.length / cells.length >= 0.5 ? vote(cores) : null;
      if (!hidden && h * w === 1 && lockCell[r * W + c]) p.lock = 1;
      else if (!hidden && cells.filter(i => starCell[i]).length / cells.length < 0.5) {
        // Icons sit on the piece's centre: a key is mostly gold with a small red/blue gem, a battery
        // (time bonus) is a purple can, a rocket is mostly red. Only the piece's own cells count.
        const own = new Set(cells);
        const mx = rect.x + (c + w / 2) * cw, my = rect.y + (r + h / 2) * ch;
        const n = { gold: 0, red: 0, blue: 0, purple: 0 };
        for (let i = -3; i <= 3; i++)
          for (let j = -3; j <= 3; j++) {
            const x = mx + i * 0.1 * cw, y = my + j * 0.1 * ch;
            const cc = Math.floor((x - rect.x) / cw), rr = Math.floor((y - rect.y) / ch);
            if (!own.has(rr * W + cc)) continue;
            const v = at(x, y, rad);
            // A layered piece's core colour is not an icon.
            const not = (...ks) => !ks.includes(label) && !ks.includes(inner);
            if (gold(v)) n.gold++;
            else if (v[0] > 170 && v[1] < 80 && not('red', 'pink', 'orange')) n.red++;
            else if (v[2] > 170 && v[0] < 90 && v[1] < 170 && not('blue', 'sky')) n.blue++;
            if (not('purple') && classify(v) === 'purple') n.purple++;
          }
        const plainGold = ['yellow', 'orange'].includes(label) || ['yellow', 'orange'].includes(inner);
        if (n.purple >= 4) p.item = 'battery';
        else if (!plainGold && n.gold >= 4 && n.red + n.blue >= 1 && n.gold >= n.red + n.blue) p.key = true;
        else if (n.red >= 4) p.item = 'rocket';
      }
      // Layered piece: most of its cells showed the same second colour inside.
      if (inner && !p.key && !p.lock) p.inner = inner;
      if (!hidden && cells.filter(i => starCell[i]).length / cells.length >= 0.5) p.star = true;
      // Arrow piece: no studs (a flat face with one big arrow). Its edges spread along the arrow.
      if (!hidden && !p.star) {
        const lum = v => v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11;
        let tex = 0, n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, t = 0;
        for (const i of cells) {
          const r0 = Math.floor(i / W), c0 = i % W;
          for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
            const x = rect.x + (c0 + 0.08 + 0.84 * a / 11) * cw, y = rect.y + (r0 + 0.08 + 0.84 * b / 11) * ch;
            const g = Math.abs(lum(at(x + 2, y, 0)) - lum(at(x - 2, y, 0))) + Math.abs(lum(at(x, y + 2, 0)) - lum(at(x, y - 2, 0)));
            tex += g; t++;
            if (g > 40) { n++; sx += x; sy += y; sxx += x * x; syy += y * y; }
          }
        }
        if (tex / t < 15 && n > 20) {
          const sdx = Math.sqrt(Math.max(1, sxx / n - (sx / n) ** 2)), sdy = Math.sqrt(Math.max(1, syy / n - (sy / n) ** 2));
          p.axis = (sdx / sdy) / (w / h) >= 1 ? 'h' : 'v';
        }
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
      if (!cands.length) {
        const rs = cells.map(i => Math.floor(i / W)), cs = cells.map(i => i % W);
        if ((Math.max(...rs) - Math.min(...rs) + 1) * (Math.max(...cs) - Math.min(...cs) + 1) === cells.length) return [cells];
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

    // Crates have an orange/red rim; a plain frame-coloured block inside the board is a wall.
    const rimmed = cells => {
      const rs = cells.map(i => Math.floor(i / W)), cs = cells.map(i => i % W);
      const x0 = rect.x + Math.min(...cs) * cw, x1 = rect.x + (Math.max(...cs) + 1) * cw;
      const y0 = rect.y + Math.min(...rs) * ch, y1 = rect.y + (Math.max(...rs) + 1) * ch;
      const d = 0.07 * cw, pts = [];
      for (let t = 0.1; t < 0.95; t += 0.2) {
        pts.push([x0 + (x1 - x0) * t, y0 + d], [x0 + (x1 - x0) * t, y1 - d], [x0 + d, y0 + (y1 - y0) * t], [x1 - d, y0 + (y1 - y0) * t]);
      }
      return pts.filter(([x, y]) => ['orange', 'yellow', 'red'].includes(classify(at(x, y, rad)))).length / pts.length >= 0.3;
    };

    for (const [, cells] of groups) {
      const label = cls[cells[0]];
      if (label === 'crate' && !rimmed(cells)) { cells.forEach(i => walls.push([Math.floor(i / W), i % W])); continue; }
      if (label === 'ice') splitIce(cells).forEach(cv => addPiece(cv, 'ice'));
      else addPiece(cells, label);
    }

    // Exits: sample the frame just outside each edge cell, avoiding the arrow in the middle.
    const gates = [];
    let gid = 1;
    const edge = (side, n, pos) => {
      const kinds = [];
      for (let k = 0; k < n; k++) {
        const raw = [-.42, -.34, -.26, .26, .34, .42].flatMap(t => [0.3, 0.5].map(d => at(...pos(k + 0.5 + t, d), rad)));
        const pts = raw.map(classify);
        // Digits on a frozen tile can cover much of a cell, so a few frozen samples are enough;
        // the white arrow on a normal exit and the digits themselves don't count. Exits are drawn
        // in two tones, so the colour comes from the average of the coloured samples.
        const lumOf = v => v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11;
        const solid = raw.filter((_, i) => SOLID.has(pts[i])).sort((a, b) => lumOf(a) - lumOf(b));
        const base = solid.slice(0, Math.max(1, Math.ceil(solid.length * 0.6)));
        const l = pts.filter(x => x === 'frozen').length >= 3 ? 'frozen'
          : solid.length ? nearestSolid([0, 1, 2].map(ch => base.reduce((a, v) => a + v[ch], 0) / base.length)) : vote(pts);
        kinds.push(['frame', 'empty', 'ice', 'crate', 'white', 'track'].includes(l) ? null : l);
      }
      // The arrow in the middle of an exit can tint one cell (blue → sky): smooth it out.
      for (let k = 1; k + 1 < n; k++)
        if (kinds[k] && kinds[k - 1] && kinds[k - 1] === kinds[k + 1] && kinds[k] !== kinds[k - 1] && (PARTNER[kinds[k - 1]] || []).includes(kinds[k]))
          kinds[k] = kinds[k - 1];
      // Each frozen tile shows one number in its middle, drawn in warm colours on cool ice. Along a
      // run of frozen cells, clusters of warm pixels (digits of one number sit close together) tell
      // how many tiles there are; tiles are split midway between numbers.
      const warm = v => v[0] > v[2] + 10;
      const tileCuts = (k0, k1) => {
        const clusters = [];
        for (let t = k0; t <= k1 + 1.001; t += 0.04) {
          if (![0.3, 0.4, 0.5, 0.6].some(d => warm(at(...pos(t, d), 0)))) continue;
          const last = clusters[clusters.length - 1];
          if (last && t - last.end <= 0.25) last.end = t; else clusters.push({ start: t, end: t });
        }
        return clusters.slice(1).map((c, i) => Math.round(((clusters[i].start + clusters[i].end) / 2 + (c.start + c.end) / 2) / 2));
      };
      for (let k = 0; k < n; k++) {
        const l = kinds[k];
        if (!l) continue;
        let e = k;
        while (e + 1 < n && kinds[e + 1] === l) e++;
        if (l === 'frozen') {
          const cut = tileCuts(k, e).find(x => x > k && x <= e);
          if (cut !== undefined) e = cut - 1;
        }
        const gt = { id: gid++, side, start: k, len: e - k + 1, color: l === 'frozen' ? '?' : l, frozen: l === 'frozen' ? 1 : 0 };
        // Star exit: pale star shapes on the exit away from its middle arrow.
        if (l !== 'frozen') {
          let pale = 0, tot = 0;
          for (let t = 0.05; t < 0.95; t += 0.05) {
            if (t > 0.3 && t < 0.7) continue;
            for (const d of [0.2, 0.35, 0.5, 0.65]) {
              const v = at(...pos(k + t * (e - k + 1), d), 1); tot++;
              if (Math.min(...v) > 140 && Math.max(...v) - Math.min(...v) < 90) pale++;
            }
          }
          if (pale / tot > 0.12) gt.star = true;
        }
        gates.push(gt);
        k = e;
      }
    };
    // pos(t, d): t along the edge in cells, d = depth into the frame as a fraction of a cell.
    edge('L', H, (t, d = 0.4) => [rect.x - d * cw, rect.y + t * ch]);
    edge('R', H, (t, d = 0.4) => [rect.x + rect.w + d * cw, rect.y + t * ch]);
    edge('T', W, (t, d = 0.4) => [rect.x + t * cw, rect.y - d * ch]);
    edge('B', W, (t, d = 0.4) => [rect.x + t * cw, rect.y + rect.h + d * ch]);

    // Inner exits: a flat bar (one cell thick) with a white arrow, set into a wall (both ends walled).
    // The arrow gives the way out: ▼ = pieces from the cell above leave downward through it.
    const wallAt = (r, c) => r < 0 || c < 0 || r >= H || c >= W || walls.some(([y, x]) => y === r && x === c);
    const freeAt = (r, c) => r >= 0 && c >= 0 && r < H && c < W && !wallAt(r, c);
    // Which way the white arrow in a box points: the narrow end of the triangle.
    const arrowDir = (x0, y0, x1, y1) => {
      const pts = [];
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (Math.min(...at(x, y, 0)) > 200) pts.push([x, y]);
      if (pts.length < 12) return null;
      const spread = (sel, k) => { const v = pts.filter(sel).map(q => q[k]); if (v.length < 3) return 0; const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
      const ys = pts.map(q => q[1]), xs = pts.map(q => q[0]);
      const my = (Math.min(...ys) + Math.max(...ys)) / 2, mx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const top = spread(q => q[1] < my, 0), bot = spread(q => q[1] >= my, 0);
      const lef = spread(q => q[0] < mx, 1), rig = spread(q => q[0] >= mx, 1);
      const v = Math.max(top, bot) / Math.max(1, Math.min(top, bot)), h = Math.max(lef, rig) / Math.max(1, Math.min(lef, rig));
      if (Math.max(v, h) < 1.3) return null;
      return v >= h ? (top < bot ? 'T' : 'B') : (lef < rig ? 'L' : 'R');
    };
    // Cells in front of a bar for a way out, and its two ends.
    const front = (r, c, h, w, side) => side === 'T' ? [...Array(w).keys()].map(k => [r + h, c + k]) : side === 'B' ? [...Array(w).keys()].map(k => [r - 1, c + k])
      : side === 'L' ? [...Array(h).keys()].map(k => [r + k, c + w]) : [...Array(h).keys()].map(k => [r + k, c - 1]);
    const ends = (r, c, h, w) => h === 1 ? [[r, c - 1], [r, c + w]] : [[r - 1, c], [r + h, c]];
    const innerGate = (r, c, h, w, side, color, frozen) => {
      const flat = side === 'L' || side === 'R';
      const gt = { id: gid++, side, start: flat ? r : c, len: flat ? h : w, at: side === 'T' ? r + h : side === 'B' ? r - 1 : side === 'L' ? c + w : c - 1, color, frozen };
      gates.push(gt);
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) walls.push([y, x]);
      return gt;
    };
    for (const p of [...pieces]) {
      if ((p.h !== 1 && p.w !== 1) || p.h * p.w > 3 || p.shape || p.ice || p.lock || p.key || p.star || p.color === '?') continue;
      const { r, c, h, w } = p;
      if (!ends(r, c, h, w).every(([y, x]) => wallAt(y, x))) continue;
      let white = 0, tot = 0;
      for (let a = 0; a < 12 * w; a++) for (let b = 0; b < 12 * h; b++) {
        const x = rect.x + (c + (0.1 + 0.8 * (a % 12) / 11) + Math.floor(a / 12)) * cw, y = rect.y + (r + (0.1 + 0.8 * (b % 12) / 11) + Math.floor(b / 12)) * ch;
        const v = at(x, y, 0); tot++;
        if (Math.min(...v) > 200) white++;
      }
      // Pieces show no pure white; an exit carries a small white arrow.
      if (white / tot < 0.01) continue;
      const mx = rect.x + (c + w / 2) * cw, my = rect.y + (r + h / 2) * ch;
      const side = arrowDir(Math.round(mx - 0.45 * cw), Math.round(my - 0.45 * ch), Math.round(mx + 0.45 * cw), Math.round(my + 0.45 * ch));
      if (!side || ((side === 'T' || side === 'B') ? h !== 1 : w !== 1)) continue;
      if (!front(r, c, h, w, side).every(([y, x]) => freeAt(y, x))) continue;
      pieces.splice(pieces.indexOf(p), 1);
      innerGate(r, c, h, w, side, p.color, 0);
    }
    // Frozen exits inside the board: a straight run of frozen cells between walls. Pieces reach it
    // from the side where pieces are.
    const seen = new Set();
    for (let i = 0; i < W * H; i++) {
      if (cls[i] !== 'frozen' || seen.has(i)) continue;
      const r = Math.floor(i / W), c = i % W;
      let w = 1, h = 1;
      while (c + w < W && cls[i + w] === 'frozen') w++;
      if (w === 1) while (r + h < H && cls[i + h * W] === 'frozen') h++;
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) seen.add(y * W + x);
      if (!ends(r, c, h, w).every(([y, x]) => wallAt(y, x))) continue;
      const occupied = ([y, x]) => pieces.some(p => y >= p.r && y < p.r + p.h && x >= p.c && x < p.c + p.w);
      const sides = (h === 1 ? ['T', 'B'] : ['L', 'R']).filter(sd => front(r, c, h, w, sd).every(([y, x]) => freeAt(y, x)));
      const side = sides.length === 1 ? sides[0] : sides.find(sd => front(r, c, h, w, sd).some(occupied));
      if (!side) continue;
      const gt = innerGate(r, c, h, w, side, '?', 1);
      const n = readNumber(img, rect.x + c * cw, rect.y + r * ch, rect.x + (c + w) * cw, rect.y + (r + h) * ch, 'g');
      if (n) { gt.frozen = n; gt.read = true; }
    }
    // Empty pockets closed in by walls (e.g. between two inner exits) can't be reached: walls too.
    {
      const taken = new Set();
      pieces.forEach(p => { for (let y = p.r; y < p.r + p.h; y++) for (let x = p.c; x < p.c + p.w; x++) taken.add(y * W + x); });
      const done = new Set();
      for (let i = 0; i < W * H; i++) {
        if (done.has(i) || taken.has(i) || wallAt(Math.floor(i / W), i % W) || cls[i] !== 'empty') continue;
        const comp = [i], q = [i]; done.add(i);
        let closed = true;
        while (q.length) {
          const j = q.pop(), r = Math.floor(j / W), c = j % W;
          for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const y = r + dr, x = c + dc, k = y * W + x;
            if (wallAt(y, x) || done.has(k)) continue;
            if (taken.has(k) || cls[k] !== 'empty') { closed = false; continue; }
            done.add(k); comp.push(k); q.push(k);
          }
        }
        if (closed && comp.length <= 4) comp.forEach(k => walls.push([Math.floor(k / W), k % W]));
      }
    }

    // Counters: frozen exits, crates and ice show their number.
    for (const gt of gates) {
      if (!gt.frozen || gt.at != null) continue;
      const a0 = gt.start, a1 = gt.start + gt.len;
      const box = gt.side === 'L' ? [rect.x - 0.95 * cw, rect.y + a0 * ch, rect.x, rect.y + a1 * ch]
        : gt.side === 'R' ? [rect.x + rect.w, rect.y + a0 * ch, rect.x + rect.w + 0.95 * cw, rect.y + a1 * ch]
        : gt.side === 'T' ? [rect.x + a0 * cw, rect.y - 0.95 * ch, rect.x + a1 * cw, rect.y]
        : [rect.x + a0 * cw, rect.y + rect.h, rect.x + a1 * cw, rect.y + rect.h + 0.95 * ch];
      const n = readNumber(img, ...box, 'g');
      if (n) { gt.frozen = n; gt.read = true; }
    }
    for (const p of pieces) {
      if (!p.ice) continue;
      const mx = rect.x + (p.c + p.w / 2) * cw, my = rect.y + (p.r + p.h / 2) * ch;
      const n = readNumber(img, mx - 0.45 * cw, my - 0.45 * ch, mx + 0.45 * cw, my + 0.45 * ch, p.crate ? 'c' : 'i');
      if (n) { p.ice = n; p.read = true; }
    }

    // Every crate shows its number; a numberless crate fragment (a corner cut off by the rim)
    // belongs to the crate it touches.
    const cellsOfP = p => p.shape ? p.shape.map(([a, b]) => [p.r + a, p.c + b]) : [...Array(p.h * p.w).keys()].map(i => [p.r + Math.floor(i / p.w), p.c + i % p.w]);
    for (let again = true; again;) {
      again = false;
      for (const frag of pieces.filter(p => p.crate && !p.read)) {
        const mine = cellsOfP(frag);
        // Crates are rectangles: prefer the neighbour that becomes one, else the longest shared border.
        const touching = p => cellsOfP(p).reduce((n, [r, c]) => n + mine.filter(([y, x]) => Math.abs(y - r) + Math.abs(x - c) === 1).length, 0);
        const rectAfter = p => {
          const u = [...cellsOfP(p), ...mine];
          const h = Math.max(...u.map(q => q[0])) - Math.min(...u.map(q => q[0])) + 1, w = Math.max(...u.map(q => q[1])) - Math.min(...u.map(q => q[1])) + 1;
          return u.length === h * w;
        };
        const host = pieces.filter(p => p !== frag && p.crate && p.read && touching(p) > 0)
          .sort((a, b) => (rectAfter(b) - rectAfter(a)) || (touching(b) - touching(a)))[0];
        if (!host) continue;
        const all = [...cellsOfP(host), ...mine];
        const r0 = Math.min(...all.map(q => q[0])), c0 = Math.min(...all.map(q => q[1]));
        host.r = r0; host.c = c0;
        host.h = Math.max(...all.map(q => q[0])) - r0 + 1; host.w = Math.max(...all.map(q => q[1])) - c0 + 1;
        if (all.length === host.h * host.w) delete host.shape; else host.shape = all.map(([y, x]) => [y - r0, x - c0]);
        pieces.splice(pieces.indexOf(frag), 1);
        again = true;
        break;
      }
    }

    const tracks = [];
    cls.forEach((l, i) => { if (l === 'track') tracks.push([Math.floor(i / W), i % W, trackColor[i]]); });
    return { W, H, walls, tracks, pieces, gates, tickPerCell: false };
  }

  // Digit templates cut from real screenshots: digit, style (g = frozen exit, c = crate badge,
  // i = ice), aspect ×100, then the 7×10 bitmap as hex.
  const TEMPLATES = '5g0687efdc38fcfc3a7fff8 5g0687fff870fcfc3effff8 5g0687eff878fcfc3fffff8 1g0553ffff8f1e3c78f1e3c 3g0657dfc38f3c7c3affff8 1g0523ffff8f1e3c78f1e3c 4g0791c78f3e6d9bfff1c18 1g0523ffff8f1e3c78f1e3c 4g0821c78f3e6d9bfff1c18 1g0533ffff8f1e3c78f1e3c 6g0713871c78fdff9f77e78 2i085001c38e1871c7efffc 4i1162cd9366cdfff8e0c18 3i0900818f3c1c1c38ffef8 2i0890e1c38e3861c7ffffc 3i0890c38f1e1e1c3effdf0 4i10508d9b66cdfffff0c18 3i0890e18f1e0e1c3effdf8 6i09541c3f7fe78f1f37e78 3i0900818f3c1c1c38ffff8 8i100c4f8e3ec78f1e3fef8 4i1102cd9366cdfff860c18 0i095018f1e3c78f1f77c70 1i030fffffffffffffffffc 6i09561c3f77c78f1f77c78 1i030fefffffffffffffffc 4i10524d9366cdfffff0c18 1i032ffffffffdfbf7efdf8 4i10020d9b66cd9ffff0c18 1i032fffffffffffffffffc 3i0900c18f1c1c1c3affef8 5i09040c1f3f0e1c3e7fdf8 1g0481ffffbf0e1c3870e1c 2g061fffc7871e79e7ffffc 5g0707cf9c387cfc3bffff8 1g0523ffffaf0e1c3870e1c 8g0747dfb37e7dfb3f7fef0 9c07679fbff7fefc78f7df0 1c06738f3e7c3870e1cfffc 5c071fdfb87cfdfc3affff8 1g0501ffffaf1e3c78f1e3c 0g0767cfbfe7c78f1f77cf8 7g062fffc78f1c78e3c70e0 7g065fffc78e1c78e3c70e0 4g0761c78f3e6d9bfff1c18 7g065fffc7871c78e3c70e0 7c074fffc78e1c70e3871c0 7g065fffc7871c38e1c70e0 1g0521ffffaf1e3c78f1e3c 0g0767cfbfe7c78f3f7fcf0 8g0767dfbbfe7dff3f7fef8 3g0667dfc7873c783a7fff8 3g0637dfc78f7c7c3affff8 8g0747dffbff7cff9f3fef8 9g0697dff3e7fefc78e3860 1g0501ffffaf0e1c3870e1c 8g0717dffbff7cff1f7fef8 2g0657dfdf871e79e7cfffc 1g0523ffff8f1e3c78f1e3c 9g0697dff3e7fefc78e3860 2g0637dfdf871e38e7ffffc 9g0697dffbe7eefc78e3c70 1g0521ffff8f1e3c78f1e3c 0g0777cffbf7cf9fbf7fef8 1g0501ffffef1e3c78f1e3c 2g0637dfdf870e38e7cfffc 3c069fdf8f1c7c7c3fffcf0 1i0333efdfbfffffffffefc 1g0501ffffef1e3c78f1e3c 3g0667dfc38f3c7c3affef8 8g0767dfbbbe7cff3f7fef8 6c0753ef9c7cfddfbff7e78 1c07238f3e7c3870e3efffc 0c0787cfbff7efdfbff7c70 5g0667eff870fefc3effff0 1g0521ffffaf1e3c38f1e3c 1g0501ffffef1e3c78f1e3c 8g0747dfbbfe7cff3e7fef8 1g0523ffffaf1e3c78f1e3c 3g0637dfd7877c7c387fff8 1c06638f3e7c3870e7ffffc 1c06938f3e7c3870e3efffc 1c06638f3e7c3870e7ffffc 5c072fdfbe7cfcfc3fffff8 5c069fdfff7cfcfc3fffff8'.split(' ').map(t => {
    const bits = [];
    for (const ch of t.slice(5)) { const v = parseInt(ch, 16); for (let j = 3; j >= 0; j--) bits.push((v >> j) & 1); }
    return { d: t[0], style: t[1], aspect: +t.slice(2, 5) / 100, bits: bits.slice(0, 70) };
  });
  const lumOf = v => v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11;
  const INK = {
    g: v => v[0] > v[2] + 10 && lumOf(v) > 185,                  // cream digits on frozen exits
    c: v => lumOf(v) > 200 && Math.max(...v) - Math.min(...v) < 70, // white digits on crate badges
    i: v => v[1] > 195 && v[2] > 215 && v[0] < 110,               // bright cyan digits on ice
  };
  // Read the number in a box, or null when nothing digit-like is there.
  function readNumber(img, x0, y0, x1, y1, style) {
    const gl = glyphs(img, x0, y0, x1, y1, INK[style]);
    if (!gl.length || gl.length > 2) return null;
    let s = '';
    for (const g of gl) {
      let best = null;
      for (const t of TEMPLATES) {
        let d = 40 * Math.abs(t.aspect - g.aspect) + (t.style === style ? 0 : 6);
        for (let i = 0; i < 70; i++) if (t.bits[i] !== g.bits[i]) d++;
        if (!best || d < best.d) best = { d, t };
      }
      if (!best || best.d > 24) return null;
      s += best.t.d;
    }
    return +s || null;
  }

  // Numbers: the digits inside a box, as small bitmaps (one per digit, left to right).
  // `ink(v)` says which pixels belong to a digit's fill.
  function glyphs(img, x0, y0, x1, y1, ink) {
    const at = sampler(img);
    x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(img.width - 1, Math.round(x1)); y1 = Math.min(img.height - 1, Math.round(y1));
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (w < 4 || h < 4) return [];
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = ink(at(x0 + x, y0 + y, 0)) ? 1 : 0;
    // Keep only sizeable blobs (digits), dropping specks and the box edges.
    const seen = new Int32Array(w * h).fill(-1), blobs = [];
    for (let i = 0; i < w * h; i++) {
      if (!m[i] || seen[i] >= 0) continue;
      const q = [i], id = blobs.length; seen[i] = id;
      let bx0 = w, by0 = h, bx1 = 0, by1 = 0;
      for (let k = 0; k < q.length; k++) {
        const j = q[k], x = j % w, y = (j / w) | 0;
        bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const xx = x + dx, yy = y + dy, jj = yy * w + xx;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || !m[jj] || seen[jj] >= 0) continue;
          seen[jj] = id; q.push(jj);
        }
      }
      blobs.push({ id, n: q.length, bx0, by0, bx1, by1 });
    }
    const inside = blobs.filter(b => b.n >= 12 && b.bx0 > 0 && b.bx1 < w - 1 && b.by0 > 0 && b.by1 < h - 1);
    const tall = Math.max(0, ...inside.map(b => b.by1 - b.by0 + 1));
    // Digits of one number share a height and a baseline.
    const keep = inside.filter(b => b.by1 - b.by0 + 1 >= 0.7 * tall);
    keep.sort((a, b) => a.bx0 - b.bx0);
    const GW = 7, GH = 10;
    return keep.map(b => {
      const bw = b.bx1 - b.bx0 + 1, bh = b.by1 - b.by0 + 1, bits = [];
      for (let gy = 0; gy < GH; gy++)
        for (let gx = 0; gx < GW; gx++) {
          let on = 0, tot = 0;
          for (let y = b.by0 + Math.floor(gy * bh / GH); y < b.by0 + Math.ceil((gy + 1) * bh / GH); y++)
            for (let x = b.bx0 + Math.floor(gx * bw / GW); x < b.bx0 + Math.ceil((gx + 1) * bw / GW); x++) {
              tot++; if (seen[y * w + x] === b.id) on++;
            }
          bits.push(on / Math.max(1, tot) > 0.4 ? 1 : 0);
        }
      return { bits, aspect: bw / bh, x: x0 + b.bx0, w: bw, h: bh };
    });
  }

  return { locate, run, glyphs };
})();

if (typeof module !== 'undefined') module.exports = Detect;
