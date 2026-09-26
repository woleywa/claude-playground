// Screenshot → level. Best-effort: numbers (ice, lock, frozen counts) must be typed in by hand.
const Detect = (() => {
  // Reference colors sampled from real Block Out screenshots.
  // Whole-cell average colours measured on real screenshots (studs and shading averaged out).
  const hex = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  const REF = Object.fromEntries(Object.entries({
    pink:   'e34098 e43e96 eb439f e9409b e63e98 ec44a0',
    yellow: 'e8ab0a eeae0b',
    sky:    '1193e1 1296e6',
    lime:   '6dbf0e 6fc20e',
    blue:   '1051d2 1158d8 0554e3',
    purple: '8c30d9 9333e2 8d2fde',
    green:  '12b370 15bb77 08ba79',
    red:    'df2b1f',
    orange: 'ed5f09',
    ice:    '0676f3 10b5f7',
    empty:  '262260',
    frame:  '4b41ab 463ea2',
    frozen: 'd8e6f2 c8d8ea',
  }).map(([k, v]) => [k, v.split(' ').map(hex)]));
  const NOT_PIECE = new Set(['empty', 'frame', 'frozen']);

  function nearest(rgb) {
    let best = null, bd = Infinity;
    for (const [name, list] of Object.entries(REF))
      for (const ref of list) {
        const d = (rgb[0]-ref[0])**2 + (rgb[1]-ref[1])**2 + (rgb[2]-ref[2])**2;
        if (d < bd) { bd = d; best = name; }
      }
    return { name: best, dist: Math.sqrt(bd) };
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

  // rect = board play area in image pixels; W×H = cells.
  function run(img, rect, W, H) {
    const at = sampler(img);
    const cw = rect.w / W, ch = rect.h / H;
    const cx = c => rect.x + (c + 0.5) * cw, cy = r => rect.y + (r + 0.5) * ch;
    const rad = Math.max(1, Math.round(Math.min(cw, ch) * 0.04));

    // Cell colour = average over most of the cell. An icon (padlock) skews the average away
    // from every reference; then the corners, which the icon doesn't cover, decide.
    const cls = [], odd = [];
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
        const corners = [[-.32,-.32],[.32,-.32],[-.32,.32],[.32,.32]].map(([dx, dy]) => classify(at(cx(c) + dx*cw, cy(r) + dy*ch, rad)));
        odd.push(m.dist > 45);
        cls.push(m.dist > 45 ? vote(corners) : m.name);
      }

    // Separate pieces are divided by a dark seam; cells of one piece aren't.
    const parent = cls.map((_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    const dark = ([R, G, B]) => R + G + B < 230 && B < 120;
    const joined = (a, b, pts) => {
      if (cls[a] !== cls[b] || NOT_PIECE.has(cls[a])) return false;
      return pts.filter(([x, y]) => dark(at(x, y, 1))).length / pts.length < 0.4;
    };
    const along = n => Array.from({ length: n }, (_, k) => 0.15 + 0.7 * k / (n - 1));
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++) {
        const i = r * W + c;
        if (c + 1 < W) {
          const x = rect.x + (c + 1) * cw;
          if (joined(i, i + 1, along(10).map(t => [x, rect.y + (r + t) * ch])))
            parent[find(i)] = find(i + 1);
        }
        if (r + 1 < H) {
          const y = rect.y + (r + 1) * ch;
          if (joined(i, i + W, along(10).map(t => [rect.x + (c + t) * cw, y])))
            parent[find(i)] = find(i + W);
        }
      }

    const groups = new Map();
    cls.forEach((l, i) => {
      if (NOT_PIECE.has(l)) return;
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
      const ice = label === 'ice';
      const p = { id: id++, color: ice ? '?' : label, r, c, h, w, key: false, lock: 0, ice: ice ? 1 : 0 };
      if (!ice && h * w === 1 && odd[r * W + c]) p.lock = 1;
      else if (!ice && label !== 'yellow' && label !== 'orange') {
        const gold = ([R, G, B]) => R > 150 && G > 80 && G < 200 && B < 60;
        const mx = rect.x + (c + w / 2) * cw, my = rect.y + (r + h / 2) * ch;
        const spots = [[0,0],[-.12,0],[.12,0],[0,-.12],[0,.12],[-.2,-.1],[.1,.2],[-.1,.2],[.2,-.1]];
        if (spots.some(([dx, dy]) => gold(at(mx + dx*cw, my + dy*ch, rad)))) p.key = true;
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
          if (f > 0.03) cands.push({ f, cover });
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
      if (label === 'ice') { splitIce(cells).forEach(cv => addPiece(cv, 'ice')); continue; }
      const rs = cells.map(i => Math.floor(i / W)), cs = cells.map(i => i % W);
      const area = (Math.max(...rs) - Math.min(...rs) + 1) * (Math.max(...cs) - Math.min(...cs) + 1);
      if (area === cells.length) addPiece(cells, label);
      else cells.forEach(i => addPiece([i], label));
    }

    // Gates: sample the frame just outside each edge cell, avoiding the arrow in the middle.
    const gates = [];
    let gid = 1;
    const edge = (side, n, pos) => {
      const cellsOut = [];
      for (let k = 0; k < n; k++) {
        const pts = [-.3, .3].map(t => pos(k, t));
        const l = vote(pts.map(([x, y]) => classify(at(x, y, rad))));
        cellsOut.push(l === 'frame' || l === 'empty' || l === 'ice' ? null : l);
      }
      for (let k = 0; k < n; k++) {
        const l = cellsOut[k];
        if (!l) continue;
        if (l === 'frozen') { gates.push({ id: gid++, side, start: k, len: 1, color: '?', frozen: 1 }); continue; }
        let e = k;
        while (e + 1 < n && cellsOut[e + 1] === l) e++;
        gates.push({ id: gid++, side, start: k, len: e - k + 1, color: l, frozen: 0 });
        k = e;
      }
    };
    const off = 0.4;
    edge('L', H, (k, t) => [rect.x - off * cw, rect.y + (k + 0.5 + t) * ch]);
    edge('R', H, (k, t) => [rect.x + rect.w + off * cw, rect.y + (k + 0.5 + t) * ch]);
    edge('T', W, (k, t) => [rect.x + (k + 0.5 + t) * cw, rect.y - off * ch]);
    edge('B', W, (k, t) => [rect.x + (k + 0.5 + t) * cw, rect.y + rect.h + off * ch]);

    return { W, H, pieces, gates, tickPerCell: false };
  }

  return { run };
})();

if (typeof module !== 'undefined') module.exports = Detect;
