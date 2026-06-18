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
    _img.mode = 'preview';
    _drawOverlay(ctx, detected);
    _setStatus('Grid detected — does this look right?');
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
  if (ratio < 0.72 || ratio > 1.39) return null;

  const pad = 2;
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    w: bw + pad * 2,
    h: bh + pad * 2,
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

// ── Color sampling + clustering ────────────────────────────────────────────

function _extractGrid(img, bounds, size) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const iw = canvas.width;

  const { x, y, w, h } = bounds;
  const cw = w / size, ch = h / size;

  // Sample a 5×5 grid per cell and take the median — robust against X-mark overlays
  const raw = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => {
      const pts = [];
      for (let fr = 0.1; fr <= 0.91; fr += 0.2)
        for (let fc = 0.1; fc <= 0.91; fc += 0.2) {
          const px = Math.min(canvas.width - 1, Math.floor(x + (col + fc) * cw));
          const py = Math.min(canvas.height - 1, Math.floor(y + (row + fr) * ch));
          const i = (py * iw + px) * 4;
          pts.push([data[i], data[i+1], data[i+2]]);
        }
      return _medRGB(pts);
    })
  );

  return _cluster(raw, size);
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

function _mergePair(clusters, i, j) {
  const ci = clusters[i], cj = clusters[j], n = ci.n + cj.n;
  clusters[i] = {
    rgb: [
      Math.round((ci.rgb[0]*ci.n + cj.rgb[0]*cj.n) / n),
      Math.round((ci.rgb[1]*ci.n + cj.rgb[1]*cj.n) / n),
      Math.round((ci.rgb[2]*ci.n + cj.rgb[2]*cj.n) / n),
    ],
    n,
  };
  clusters.splice(j, 1);
}

function _closestPair(clusters) {
  let minD = Infinity, mi = -1, mj = -1;
  for (let i = 0; i < clusters.length; i++)
    for (let j = i + 1; j < clusters.length; j++) {
      const d = _dist(clusters[i].rgb, clusters[j].rgb);
      if (d < minD) { minD = d; mi = i; mj = j; }
    }
  return { minD, mi, mj };
}

function _cluster(raw, size) {
  const flat = raw.flat();
  const clusters = []; // { rgb:[r,g,b], n:count }
  const THRESH = 60;

  for (const rgb of flat) {
    let best = -1, bestD = Infinity;
    clusters.forEach((c, i) => { const d = _dist(c.rgb, rgb); if (d < bestD) { bestD = d; best = i; } });
    if (best >= 0 && bestD < THRESH) {
      const c = clusters[best], n = c.n;
      c.rgb = [
        Math.round((c.rgb[0]*n + rgb[0]) / (n+1)),
        Math.round((c.rgb[1]*n + rgb[1]) / (n+1)),
        Math.round((c.rgb[2]*n + rgb[2]) / (n+1)),
      ];
      c.n++;
    } else {
      clusters.push({ rgb, n: 1 });
    }
  }

  // Merge obvious noise first (very similar clusters)
  let p = _closestPair(clusters);
  while (p.minD < 40) { _mergePair(clusters, p.mi, p.mj); p = _closestPair(clusters); }

  // Force down to exactly `size` clusters — puzzle always has exactly N colors
  while (clusters.length > size) {
    const { mi, mj } = _closestPair(clusters);
    _mergePair(clusters, mi, mj);
  }

  // Map each cell to nearest cluster index
  const grid = raw.map(row => row.map(rgb => {
    let best = 0, bestD = Infinity;
    clusters.forEach((c, i) => { const d = _dist(c.rgb, rgb); if (d < bestD) { bestD = d; best = i; } });
    return best;
  }));

  const colors = clusters.map(c => `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`);
  return { grid, colors, colorCount: clusters.length };
}
