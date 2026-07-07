// image.js — Screenshot → grid parser (no external dependencies)

const _img = {
  size: 10,
  img: null,
  scale: 1,
  bounds: null,
  mode: 'preview', // 'preview' | 'manual1' | 'manual2'
  tap1: null,
  onResult: null,
};

function openImagePicker(size, onResult) {
  _img.size = size;
  _img.onResult = onResult;
  _openFilePicker();
}

function openImageFromClipboard(size, onResult) {
  _img.size = size;
  _img.onResult = onResult;
  if (!navigator.clipboard?.read) { _openFilePicker(); return; }
  navigator.clipboard.read().then(items => {
    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'));
      if (type) { item.getType(type).then(_loadBlob); return; }
    }
    _openFilePicker();
  }).catch(() => _openFilePicker());
}

function loadImageBlob(blob, size, onResult) {
  _img.size = size;
  _img.onResult = onResult;
  _loadBlob(blob);
}

// ── AI detection (Gemini) ──────────────────────────────────────────────────

function hasLastImage() {
  return !!_img.img;
}

function _getGeminiKey() {
  let k = localStorage.getItem('gemini_api_key');
  if (!k) {
    k = window.prompt('Enter your Gemini API key (stored only in this browser):');
    if (k) { k = k.trim(); localStorage.setItem('gemini_api_key', k); }
  }
  return (k && k.trim()) || null;
}

function _sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function detectWithGemini(size, onResult, onStatus) {
  if (!_img.img) { onStatus && onStatus('Erst ein Bild importieren (📷 / 📋)'); return; }
  const key = _getGeminiKey();
  if (!key) { onStatus && onStatus('No API key entered'); return; }

  onStatus && onStatus('🤖 KI analysiert das Bild…');

  // Downscale to keep payload + cost small while staying legible
  const img = _img.img;
  const scale = Math.min(760 / img.naturalWidth, 760 / img.naturalHeight, 1);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const b64 = c.toDataURL('image/jpeg', 0.85).split(',')[1];

  const prompt =
    'This is a screenshot of a Queens/Meowdoku puzzle: a square N×N grid where ' +
    'each cell belongs to one colored region. Some cells have an X mark or a cat ' +
    'icon drawn on top — IGNORE those overlays and report the underlying region ' +
    'color only. There are exactly N distinct region colors (N = grid dimension). ' +
    'Treat visually similar but clearly different shades as separate regions; do ' +
    'NOT merge two different regions, and do NOT split one region into two. ' +
    'Assign each region an integer id starting at 0. Output STRICT JSON only:\n' +
    '{"size": N, "colors": ["#rrggbb", ...], "grid": [[id,...] x N rows]}\n' +
    'colors[i] = representative hex for region id i. grid has exactly N rows, each ' +
    'with exactly N integer ids.';

  const body = {
    contents: [{ parts: [
      { text: prompt },
      { inline_data: { mime_type: 'image/jpeg', data: b64 } },
    ] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    'gemini-flash-latest:generateContent?key=' + encodeURIComponent(key);

  let data = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.status === 500 || r.status === 503 || r.status === 429) {
        onStatus && onStatus(`🤖 Modell ausgelastet, neuer Versuch… (${attempt + 1}/4)`);
        await _sleep(2000 * (attempt + 1));
        continue;
      }
      if (!r.ok) {
        if (r.status === 400 || r.status === 403) localStorage.removeItem('gemini_api_key');
        onStatus && onStatus(`🤖 Fehler ${r.status}` + (r.status === 403 ? ' — Key ungültig?' : ''));
        return;
      }
      data = await r.json();
      break;
    } catch (e) {
      onStatus && onStatus('🤖 Netzwerkfehler, neuer Versuch…');
      await _sleep(2000 * (attempt + 1));
    }
  }
  if (!data) { onStatus && onStatus('🤖 KI nicht erreichbar — später nochmal'); return; }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { onStatus && onStatus('🤖 Unreadable response'); return; }
  if (!Array.isArray(parsed.grid) || !Array.isArray(parsed.colors)) {
    onStatus && onStatus('🤖 Unerwartetes Format'); return;
  }

  onResult({ grid: parsed.grid, colors: parsed.colors, colorCount: parsed.colors.length });
}

function _openFilePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', (e) => { if (e.target.files[0]) _loadBlob(e.target.files[0]); });
  input.click();
}

function _loadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); _showModal(img); };
  img.src = url;
}

function _showModal(img) {
  _img.img = img;

  const modal = document.getElementById('img-modal');
  const canvas = document.getElementById('img-canvas');

  // Scale image to fit modal (~480px wide, 62vh tall max)
  const maxW = Math.min(window.innerWidth - 32, 480);
  const maxH = window.innerHeight * 0.52; // leave room for status + buttons
  _img.scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
  canvas.width = Math.round(img.naturalWidth * _img.scale);
  canvas.height = Math.round(img.naturalHeight * _img.scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  modal.classList.add('open');

  // Try auto-detection on the scaled canvas
  const detected = _autoDetect(ctx, canvas.width, canvas.height);

  if (detected) {
    _img.bounds = detected;
    // Reflect the detected grid size in the preview overlay
    const scaled = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const n = _detectGridSize(scaled, canvas.width, canvas.height, detected);
    if (n) _img.size = n;
    _img.mode = 'preview';
    _drawOverlay(ctx, detected);
    _setStatus(n ? `${n}×${n} grid detected — does this look right?` : 'Grid detected — does this look right?');
    document.getElementById('img-confirm').style.display = '';
    document.getElementById('img-adjust').textContent = 'Adjust';
  } else {
    _img.bounds = null;
    _img.mode = 'manual1';
    _setStatus('Tap the top-left corner of the grid');
    document.getElementById('img-confirm').style.display = 'none';
    document.getElementById('img-adjust').textContent = 'Cancel';
  }

  canvas.addEventListener('click', _onCanvasClick);
  canvas.addEventListener('touchstart', _onCanvasTouch, { passive: false });

  document.getElementById('img-close').onclick = _closeModal;
  document.getElementById('img-confirm').onclick = _confirm;
  document.getElementById('img-adjust').onclick = () => {
    if (_img.mode === 'preview') {
      _startManual();
    } else {
      _closeModal();
    }
  };
}

function _startManual() {
  const canvas = document.getElementById('img-canvas');
  const ctx = canvas.getContext('2d');
  ctx.drawImage(_img.img, 0, 0, canvas.width, canvas.height);
  _img.mode = 'manual1';
  _img.tap1 = null;
  _img.bounds = null;
  _setStatus('Tap the top-left corner of the grid');
  document.getElementById('img-confirm').style.display = 'none';
  document.getElementById('img-adjust').textContent = 'Cancel';
}

function _onCanvasTouch(e) {
  e.preventDefault();
  const t = e.touches[0];
  const rect = e.target.getBoundingClientRect();
  _handleTap(t.clientX - rect.left, t.clientY - rect.top);
}

function _onCanvasClick(e) {
  _handleTap(e.offsetX, e.offsetY);
}

function _handleTap(x, y) {
  if (_img.mode !== 'manual1' && _img.mode !== 'manual2') return;

  const canvas = document.getElementById('img-canvas');
  const ctx = canvas.getContext('2d');

  if (_img.mode === 'manual1') {
    _img.tap1 = { x, y };
    _img.mode = 'manual2';
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    _setStatus('Now tap the bottom-right corner of the grid');
  } else {
    const { x: x1, y: y1 } = _img.tap1;
    _img.bounds = {
      x: Math.min(x1, x), y: Math.min(y1, y),
      w: Math.abs(x - x1), h: Math.abs(y - y1),
    };
    _img.mode = 'preview';
    ctx.drawImage(_img.img, 0, 0, canvas.width, canvas.height);
    _drawOverlay(ctx, _img.bounds);
    _setStatus('Tap "Use this" to confirm');
    document.getElementById('img-confirm').style.display = '';
    document.getElementById('img-adjust').textContent = 'Redo';
  }
}

function _confirm() {
  if (!_img.bounds) return;
  // Map canvas coords → original image coords
  const s = _img.scale;
  const b = _img.bounds;
  const imgBounds = { x: b.x / s, y: b.y / s, w: b.w / s, h: b.h / s };
  const result = _extractGrid(_img.img, imgBounds, _img.size);
  _cleanup();
  _closeModal();
  _img.onResult(result);
}

function _closeModal() {
  _cleanup();
  document.getElementById('img-modal').classList.remove('open');
}

function _cleanup() {
  const canvas = document.getElementById('img-canvas');
  canvas.removeEventListener('click', _onCanvasClick);
  canvas.removeEventListener('touchstart', _onCanvasTouch);
}

function _setStatus(text) {
  document.getElementById('img-status').textContent = text;
}

function _drawOverlay(ctx, b) {
  ctx.save();
  // Dashed bounding box
  ctx.strokeStyle = '#ff3b30';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
  ctx.setLineDash([]);
  // Faint grid lines so the cell division is visible
  ctx.strokeStyle = 'rgba(255,59,48,0.35)';
  ctx.lineWidth = 0.5;
  const n = _img.size;
  for (let i = 1; i < n; i++) {
    const x = b.x + (i * b.w / n);
    const y = b.y + (i * b.h / n);
    ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke();
  }
  // Corner dots
  ctx.fillStyle = '#ff3b30';
  for (const [cx, cy] of [[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ── Auto-detection (colorful-pixel bounding box) ───────────────────────────

function _autoDetect(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;

  // Skip top 28% (score, rules, cat counter) and bottom 15% (buttons)
  const startY = Math.floor(h * 0.28);
  const endY   = Math.floor(h * 0.86);

  let minX = w, minY = endY, maxX = 0, maxY = startY;
  let found = false;

  for (let y = startY; y < endY; y++) {
    for (let x = 4; x < w - 4; x++) {
      const i = (y * w + x) * 4;
      if (_isColorful(data[i], data[i+1], data[i+2])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return null;
  const bw = maxX - minX, bh = maxY - minY;
  if (bw < 40 || bh < 40) return null;
  const ratio = bw / bh;
  if (ratio < 0.6 || ratio > 1.7) return null;

  // The puzzle grid is always square. Action buttons below the grid (Apply,
  // pencil, lightbulb) get included as colorful pixels and inflate the box
  // height. Clamp to the shorter side, anchored at the top-left corner, which
  // is clean (header/counter are above the scan region).
  const side = Math.min(bw, bh);

  const pad = 2;
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    w: side + pad * 2,
    h: side + pad * 2,
  };
}

// A pixel is "colorful" if it has notable saturation and mid lightness.
// This excludes the white/gray background and the dark text/UI chrome.
function _isColorful(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lig = (max + min) / 510; // 0..1
  return sat > 0.18 && lig > 0.25 && lig < 0.88;
}

// ── Grid-size detection (count tile bands via the gaps between tiles) ───────

function _detectGridSize(data, iw, ih, b) {
  const colorfulAt = (px, py) => {
    if (px < 0 || py < 0 || px >= iw || py >= ih) return false;
    const i = (py * iw + px) * 4;
    return _isColorful(data[i], data[i + 1], data[i + 2]);
  };
  const x = Math.round(b.x), y = Math.round(b.y);
  const w = Math.round(b.w), h = Math.round(b.h);
  const stepIn = Math.max(1, Math.round(Math.min(w, h) / 350));

  const colFrac = (cx) => {
    let cnt = 0, tot = 0;
    for (let cy = y; cy < y + h; cy += stepIn) { tot++; if (colorfulAt(cx, cy)) cnt++; }
    return tot ? cnt / tot : 0;
  };
  const rowFrac = (cy) => {
    let cnt = 0, tot = 0;
    for (let cx = x; cx < x + w; cx += stepIn) { tot++; if (colorfulAt(cx, cy)) cnt++; }
    return tot ? cnt / tot : 0;
  };

  // Count runs of "tile" separated by gaps (cream background). The gaps between
  // tiles read as ~0 colorful, while a heavily X-marked tile row can dip as low
  // as ~0.29 (white X strokes aren't colorful). A 0.2 threshold sits safely
  // between the two so X marks don't fragment a single row into several bands.
  const bands = (frac, lo, len) => {
    const stepOut = Math.max(1, Math.round(len / 500));
    let count = 0, inside = false;
    for (let p = lo; p < lo + len; p += stepOut) {
      const v = frac(p);
      if (v >= 0.2 && !inside) { count++; inside = true; }
      else if (v < 0.2) inside = false;
    }
    return count;
  };

  const cols = bands(colFrac, x, w);
  const rows = bands(rowFrac, y, h);
  if (cols === rows && cols >= 5 && cols <= 12) return cols;
  return null;
}

// ── Color sampling + clustering ────────────────────────────────────────────

function _extractGrid(img, bounds, size) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const iw = canvas.width;

  // Derive N from the image (tile gaps); fall back to the slider size
  const n = _detectGridSize(data, canvas.width, canvas.height, bounds) || size;

  const { x, y, w, h } = bounds;
  const cw = w / n, ch = h / n;

  // Sample a 5×5 grid per cell for color; a separate inner 3×3 for X detection.
  // The inner grid (0.25–0.75) avoids the white/cream gap pixels visible at tile
  // edges in the original app, which would otherwise cause false X detections.
  const cells = Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, col) => {
      const pts = [];
      for (let fr = 0.1; fr <= 0.91; fr += 0.2)
        for (let fc = 0.1; fc <= 0.91; fc += 0.2) {
          const px = Math.min(canvas.width - 1, Math.floor(x + (col + fc) * cw));
          const py = Math.min(canvas.height - 1, Math.floor(y + (row + fr) * ch));
          const i = (py * iw + px) * 4;
          pts.push([data[i], data[i+1], data[i+2]]);
        }
      const bgRgb = _medRGB(pts);
      const bgBright = (bgRgb[0] + bgRgb[1] + bgRgb[2]) / 3;
      // Inner 3×3 (fractions 0.25, 0.50, 0.75) — safely inside any tile border/gap.
      // Count pixels that look like an X mark overlay.
      // White X: near-white and brighter than background.
      // Red X: strongly red on a non-red background (incorrect-mark indicator in original app).
      const bgIsReddish = bgRgb[0] > bgRgb[1] + 50 && bgRgb[0] > bgRgb[2] + 50;
      let xHits = 0;
      for (let fr = 0.25; fr < 0.8; fr += 0.25)
        for (let fc = 0.25; fc < 0.8; fc += 0.25) {
          const px = Math.min(canvas.width - 1, Math.floor(x + (col + fc) * cw));
          const py = Math.min(canvas.height - 1, Math.floor(y + (row + fr) * ch));
          const i = (py * iw + px) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const pBright = (r + g + b) / 3;
          const isWhiteX = r > 190 && g > 190 && b > 190 && pBright > bgBright + 35;
          const isRedX = !bgIsReddish && r > 160 && r > g * 1.6 && r > b * 1.6 && r > bgRgb[0] + 20;
          if (isWhiteX || isRedX) xHits++;
        }
      // Cat detection: the cat emoji has genuinely BLACK pixels (fur outline,
      // eyes) — brightness ~10–40. Plain colored tiles, even dark ones, stay
      // well above that: e.g. a dark forest-green tile is ~97. So sample densely
      // and count TRULY-black pixels (< 60); cats register dozens, every tile
      // color (and X-mark overlay) registers zero. An earlier threshold of 95
      // wrongly flagged whole dark-green regions as cats.
      let catHits = 0;
      for (let fr = 0.12; fr <= 0.88; fr += 0.095)
        for (let fc = 0.12; fc <= 0.88; fc += 0.095) {
          const px = Math.min(canvas.width - 1, Math.floor(x + (col + fc) * cw));
          const py = Math.min(canvas.height - 1, Math.floor(y + (row + fr) * ch));
          const i = (py * iw + px) * 4;
          const pBright = (data[i] + data[i+1] + data[i+2]) / 3;
          if (pBright < 60) catHits++;
        }
      const hasCat = catHits >= 6;
      // A cat's white face patch can read like a white X — never both.
      return { rgb: bgRgb, hasX: !hasCat && xHits >= 2, hasCat };
    })
  );

  const xMarks = cells.map(row => row.map(cell => cell.hasX));
  const cats = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (cells[r][c].hasCat) cats.push({ row: r, col: c });
  const raw = cells.map(row => row.map(cell => cell.rgb));
  return { ..._cluster(raw, n), xMarks, cats };
}

function _medRGB(pts) {
  const med = arr => { const s = [...arr].sort((a,b)=>a-b), m = s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])>>1; };
  // Strip near-white pixels (X-mark overlay) before computing median.
  // Fall back to all points only if too few colored pixels remain.
  const colored = pts.filter(([r,g,b]) => !(r > 210 && g > 210 && b > 210));
  const use = colored.length >= Math.ceil(pts.length * 0.3) ? colored : pts;
  return [med(use.map(p=>p[0])), med(use.map(p=>p[1])), med(use.map(p=>p[2]))];
}

function _dist(a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

function _cluster(raw, size) {
  const flat = raw.flat();
  const n = size;

  // K-means++ initialization: spread centers across color space.
  // Seed 1 = most-saturated pixel (avoids starting in a neutral/grey zone).
  const centers = [];
  let bestSat = -1, seed = flat[0];
  for (const rgb of flat) {
    const mx = Math.max(rgb[0], rgb[1], rgb[2]);
    const mn = Math.min(rgb[0], rgb[1], rgb[2]);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    if (sat > bestSat) { bestSat = sat; seed = rgb; }
  }
  centers.push([...seed]);
  // Each subsequent seed = pixel farthest from all existing centers.
  while (centers.length < n) {
    let maxD = -1, next = flat[0];
    for (const rgb of flat) {
      let minD = Infinity;
      for (const c of centers) { const d = _dist(c, rgb); if (d < minD) minD = d; }
      if (minD > maxD) { maxD = minD; next = rgb; }
    }
    centers.push([...next]);
  }

  // K-means: iterate until stable (max 25 rounds).
  const assignments = new Array(flat.length).fill(0);
  for (let iter = 0; iter < 25; iter++) {
    let changed = false;
    for (let i = 0; i < flat.length; i++) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < n; j++) {
        const d = _dist(centers[j], flat[i]);
        if (d < bestD) { bestD = d; best = j; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;
    const sums = Array.from({ length: n }, () => [0, 0, 0, 0]);
    for (let i = 0; i < flat.length; i++) {
      const a = assignments[i];
      sums[a][0] += flat[i][0]; sums[a][1] += flat[i][1];
      sums[a][2] += flat[i][2]; sums[a][3]++;
    }
    for (let j = 0; j < n; j++) {
      if (sums[j][3] > 0) centers[j] = [
        Math.round(sums[j][0] / sums[j][3]),
        Math.round(sums[j][1] / sums[j][3]),
        Math.round(sums[j][2] / sums[j][3]),
      ];
    }
  }

  // Map each cell to nearest center.
  const grid = raw.map(row => row.map(rgb => {
    let best = 0, bestD = Infinity;
    for (let j = 0; j < n; j++) {
      const d = _dist(centers[j], rgb);
      if (d < bestD) { bestD = d; best = j; }
    }
    return best;
  }));

  const colors = centers.map(c => `rgb(${c[0]},${c[1]},${c[2]})`);
  return { grid, colors, colorCount: n };
}
