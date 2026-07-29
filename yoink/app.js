// ── Platform detection ───────────────────────────────────────────────────────

const PLATFORMS = {
  youtube: {
    label: 'YouTube',
    test: /(?:youtube\.com\/(?:watch\?|shorts\/|embed\/)|youtu\.be\/)/i,
    oembed: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  tiktok: {
    label: 'TikTok',
    test: /tiktok\.com/i,
    oembed: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  },
  instagram: {
    label: 'Instagram',
    test: /instagram\.com/i,
    // Instagram's public oEmbed endpoint was retired in 2020; it now requires a
    // Graph API access token tied to an approved Meta app. There is no
    // CORS-friendly, unauthenticated way to fetch Instagram metadata from a
    // browser, so we never bother trying — see docs/BACKEND.md.
    oembed: null,
  },
  x: {
    label: 'X / Twitter',
    test: /(?:twitter\.com|x\.com)/i,
    oembed: (url) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(url.replace(/x\.com/i, 'twitter.com'))}`,
  },
};

function detectPlatform(url) {
  for (const [key, cfg] of Object.entries(PLATFORMS)) {
    if (cfg.test.test(url)) return { key, ...cfg };
  }
  return null;
}

// ── Backend resolver (optional, see docs/BACKEND.md) ────────────────────────

function getResolverUrl() {
  return localStorage.getItem('yoink_resolver_url') || '';
}

function setResolverUrl(url) {
  if (url) localStorage.setItem('yoink_resolver_url', url);
  else localStorage.removeItem('yoink_resolver_url');
}

async function resolveViaBackend(resolverUrl, url) {
  const endpoint = resolverUrl.replace(/\/$/, '') + '/resolve';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Resolver responded ${res.status}`);
  return res.json(); // { title, author, thumbnail, formats: [{label, url, ext, quality}] }
}

// ── oEmbed metadata (best-effort, client-side only) ─────────────────────────

async function fetchOEmbed(platform, url) {
  const endpoint = platform.oembed(url);
  const res = await fetch(endpoint, { mode: 'cors' });
  if (!res.ok) throw new Error(`oEmbed responded ${res.status}`);
  const data = await res.json();
  return {
    title: data.title || '(untitled)',
    author: data.author_name || '',
    thumbnail: data.thumbnail_url || null,
  };
}

// ── History (localStorage) ───────────────────────────────────────────────────

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('yoink_history') || '[]'); }
  catch { return []; }
}

function pushHistory(entry) {
  const history = loadHistory().filter((h) => h.url !== entry.url);
  history.unshift(entry);
  localStorage.setItem('yoink_history', JSON.stringify(history.slice(0, 10)));
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  if (!history.length) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  for (const h of history) {
    const li = document.createElement('li');
    const badge = document.createElement('span');
    badge.className = `badge ${h.platform}`;
    badge.textContent = PLATFORMS[h.platform]?.label || h.platform;
    const title = document.createElement('span');
    title.className = 'h-title';
    title.textContent = h.title;
    li.append(badge, title);
    li.addEventListener('click', () => {
      document.getElementById('url-input').value = h.url;
      handleLookup(h.url);
    });
    list.appendChild(li);
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────

const els = {};

function setStatus(message, kind) {
  const status = document.getElementById('status');
  if (!message) {
    status.classList.add('hidden');
    status.textContent = '';
    return;
  }
  status.classList.remove('hidden', 'error', 'loading');
  if (kind) status.classList.add(kind);
  status.textContent = message;
}

function showResult() { document.getElementById('result').classList.remove('hidden'); }
function hideResult() { document.getElementById('result').classList.add('hidden'); }

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('bad response');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
  } catch {
    // CORS or network block — best we can do is open it so the user can
    // right-click → Save As. The HTML `download` attribute doesn't force a
    // save for cross-origin resources, so we don't pretend it will.
    window.open(url, '_blank', 'noopener');
    setStatus('Thumbnail opened in a new tab — right-click → Save Image As to keep it.', null);
  }
}

function renderActions({ platform, formats, thumbnail, title }) {
  const actions = document.getElementById('result-actions');
  const limitation = document.getElementById('result-limitation');
  actions.innerHTML = '';

  if (formats && formats.length) {
    limitation.classList.add('hidden');
    for (const f of formats) {
      const a = document.createElement('a');
      a.href = f.url;
      a.textContent = `⬇ ${f.label || f.quality || f.ext}`;
      a.download = '';
      a.target = '_blank';
      a.rel = 'noopener';
      actions.appendChild(a);
    }
    return;
  }

  limitation.classList.remove('hidden');
  if (thumbnail) {
    const btn = document.createElement('button');
    btn.textContent = '⬇ Thumbnail image';
    btn.addEventListener('click', () => downloadImage(thumbnail, `${slugify(title)}.jpg`));
    actions.appendChild(btn);
  }
  const settingsLink = document.createElement('button');
  settingsLink.className = 'ghost';
  settingsLink.textContent = 'Set up full downloads →';
  settingsLink.addEventListener('click', () => {
    document.getElementById('settings-details').open = true;
    document.getElementById('settings-details').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  actions.appendChild(settingsLink);
}

function slugify(text) {
  return (text || 'yoink').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'yoink';
}

// ── Main lookup flow ─────────────────────────────────────────────────────────

async function handleLookup(rawUrl) {
  const url = rawUrl.trim();
  setStatus('');
  hideResult();

  const platform = detectPlatform(url);
  if (!platform) {
    setStatus('Unrecognized link — paste a YouTube, TikTok, Instagram or X/Twitter URL.', 'error');
    return;
  }

  setStatus(`Looking up ${platform.label} link…`, 'loading');

  const resolverUrl = getResolverUrl();
  let data = null;
  let formats = null;

  if (resolverUrl) {
    try {
      const backendData = await resolveViaBackend(resolverUrl, url);
      data = {
        title: backendData.title || '(untitled)',
        author: backendData.author || '',
        thumbnail: backendData.thumbnail || null,
      };
      formats = backendData.formats || null;
    } catch (err) {
      setStatus(`Backend resolver failed (${err.message}) — falling back to metadata-only lookup.`, 'error');
    }
  }

  if (!data && platform.oembed) {
    try {
      data = await fetchOEmbed(platform, url);
    } catch (err) {
      setStatus(
        `Couldn't fetch metadata for this ${platform.label} link directly from the browser ` +
        `(likely blocked by CORS). Real downloads for this platform need a backend — see the ` +
        `"Backend resolver" section below and docs/BACKEND.md.`,
        'error'
      );
      return;
    }
  }

  if (!data) {
    setStatus(
      `${platform.label} doesn't expose a public, unauthenticated way to fetch metadata from a ` +
      `browser. Configure a backend resolver below, or see docs/BACKEND.md.`,
      'error'
    );
    return;
  }

  setStatus('');
  showResult();
  document.getElementById('result-platform').textContent = platform.label;
  document.getElementById('result-platform').className = `badge ${platform.key}`;
  document.getElementById('result-title').textContent = data.title;
  document.getElementById('result-author').textContent = data.author;
  const thumbEl = document.getElementById('result-thumb');
  if (data.thumbnail) {
    thumbEl.src = data.thumbnail;
    thumbEl.alt = data.title;
    thumbEl.style.display = '';
  } else {
    thumbEl.style.display = 'none';
  }

  renderActions({ platform: platform.key, formats, thumbnail: data.thumbnail, title: data.title });

  pushHistory({ url, platform: platform.key, title: data.title, ts: Date.now() });
}

// ── Init ──────────────────────────────────────────────────────────────────

document.getElementById('lookup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  handleLookup(document.getElementById('url-input').value);
});

document.getElementById('url-input').addEventListener('input', (e) => {
  const platform = detectPlatform(e.target.value.trim());
  document.getElementById('platform-hint').textContent = platform ? `Detected: ${platform.label}` : '';
});

const resolverInput = document.getElementById('resolver-url');
resolverInput.value = getResolverUrl();
updateResolverStatus();

document.getElementById('resolver-save').addEventListener('click', () => {
  setResolverUrl(resolverInput.value.trim());
  updateResolverStatus();
});

document.getElementById('resolver-clear').addEventListener('click', () => {
  resolverInput.value = '';
  setResolverUrl('');
  updateResolverStatus();
});

function updateResolverStatus() {
  const url = getResolverUrl();
  document.getElementById('resolver-status').textContent = url
    ? `Using resolver: ${url}`
    : 'No resolver configured — running metadata-only.';
}

renderHistory();
