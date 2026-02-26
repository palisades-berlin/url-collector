// Tracking / noise parameters to strip from URLs
const TRACKING_PARAMS = new Set([
  // Google Analytics / UTM
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  // Google Ads
  'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  // Facebook
  'fbclid',
  // Microsoft Ads
  'msclkid',
  // Twitter / X
  'twclid',
  // Instagram
  'igshid',
  // Mailchimp
  'mc_cid', 'mc_eid',
  // Google Analytics client ID
  '_ga', '_gl',
  // Spotify share
  'si',
  // Google Shopping
  'srsltid',
  // Adobe
  's_kwcid',
  // Zanox
  'zanpid',
  // Generic referral / ref params
  'ref', 'referrer', 'source',
]);

function cleanUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    // Remove trailing ? when no params remain
    let result = url.toString();
    if (url.searchParams.size === 0 && result.endsWith('?')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return rawUrl;
  }
}

// ── Storage helpers ──────────────────────────────────────────────────────────

function loadUrls() {
  return new Promise(resolve =>
    chrome.storage.local.get({ urls: [] }, r => resolve(r.urls))
  );
}

function saveUrls(urls) {
  return new Promise(resolve =>
    chrome.storage.local.set({ urls }, resolve)
  );
}

// ── Active tab ───────────────────────────────────────────────────────────────

function getCurrentTabUrl() {
  return new Promise(resolve =>
    chrome.tabs.query({ active: true, currentWindow: true }, tabs =>
      resolve(tabs[0]?.url || '')
    )
  );
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

function renderList(urls) {
  const list    = document.getElementById('url-list');
  const empty   = document.getElementById('empty-state');
  const counter = document.getElementById('count');

  counter.textContent = `${urls.length} URL${urls.length !== 1 ? 's' : ''}`;

  if (urls.length === 0) {
    list.style.display  = 'none';
    empty.style.display = 'flex';
    return;
  }

  list.style.display  = 'block';
  empty.style.display = 'none';

  list.innerHTML = urls.map((url, i) => `
    <div class="url-item">
      <span class="url-index">${i + 1}</span>
      <span class="url-text" title="${esc(url)}">${esc(url)}</span>
      <button class="btn-remove" data-index="${i}" title="Remove">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `).join('');

  list.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const urls = await loadUrls();
      urls.splice(parseInt(btn.dataset.index, 10), 1);
      await saveUrls(urls);
      renderList(urls);
      showToast('URL removed');
    });
  });
}

// ── Clear button: two-step confirmation ──────────────────────────────────────

let clearConfirmTimer = null;

function resetClearButton() {
  const btn = document.getElementById('btn-clear');
  btn.classList.remove('confirming');
  btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
    Clear All`;
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  renderList(await loadUrls());

  // Add current tab URL
  document.getElementById('btn-add').addEventListener('click', async () => {
    const raw = await getCurrentTabUrl();
    if (!raw || raw.startsWith('chrome://') || raw.startsWith('chrome-extension://') || raw.startsWith('about:')) {
      showToast('Cannot collect this page');
      return;
    }
    const clean = cleanUrl(raw);
    const urls  = await loadUrls();
    if (urls.includes(clean)) {
      showToast('Already in list');
      return;
    }
    urls.push(clean);
    await saveUrls(urls);
    renderList(urls);
    showToast('URL added');
  });

  // Copy all
  document.getElementById('btn-copy').addEventListener('click', async () => {
    const urls = await loadUrls();
    if (urls.length === 0) { showToast('Nothing to copy'); return; }
    await navigator.clipboard.writeText(urls.join('\n'));
    showToast(`Copied ${urls.length} URL${urls.length !== 1 ? 's' : ''}`);
  });

  // Clear — first click asks for confirmation, second click clears
  document.getElementById('btn-clear').addEventListener('click', async () => {
    const btn = document.getElementById('btn-clear');

    if (!btn.classList.contains('confirming')) {
      // First click: enter confirmation state
      const urls = await loadUrls();
      if (urls.length === 0) { showToast('List is already empty'); return; }
      btn.classList.add('confirming');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        Confirm Clear`;
      clearTimeout(clearConfirmTimer);
      clearConfirmTimer = setTimeout(resetClearButton, 3000);
    } else {
      // Second click: perform clear
      clearTimeout(clearConfirmTimer);
      resetClearButton();
      await saveUrls([]);
      renderList([]);
      showToast('List cleared');
    }
  });
});
