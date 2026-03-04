const URL_LIMIT = 500;

// Tracking / noise parameters to strip from URLs
// Note: generic params like 'ref', 'referrer', 'source', 'si' intentionally excluded
// as they are widely used for legitimate (non-tracking) purposes.
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
  // Google Analytics client ID / linker
  '_ga', '_gl',
  // Google Shopping
  'srsltid',
  // Adobe Analytics
  's_kwcid',
  // Zanox
  'zanpid',
]);

function cleanUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    let result = url.toString();
    if (url.searchParams.size === 0 && result.endsWith('?')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return rawUrl;
  }
}

function isCollectible(url) {
  return Boolean(url) &&
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('about:');
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

// ── Tab helpers ───────────────────────────────────────────────────────────────

function getCurrentTabUrl() {
  return new Promise(resolve =>
    chrome.tabs.query({ active: true, currentWindow: true }, tabs =>
      resolve(tabs[0]?.url || '')
    )
  );
}

function getAllTabUrls() {
  return new Promise(resolve =>
    chrome.tabs.query({ currentWindow: true }, tabs =>
      resolve(tabs.map(t => t.url || '').filter(Boolean))
    )
  );
}

function openUrl(url) {
  chrome.tabs.create({ url });
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
      <button class="btn-open" data-index="${i}" title="Open in new tab" aria-label="Open URL in new tab">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
      </button>
      <button class="btn-remove" data-index="${i}" title="Remove" aria-label="Remove URL">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `).join('');

  list.querySelectorAll('.btn-open').forEach((btn, i) => {
    btn.addEventListener('click', () => openUrl(urls[i]));
  });

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
    if (!isCollectible(raw)) {
      showToast('Cannot collect this page');
      return;
    }
    const urls = await loadUrls();
    if (urls.length >= URL_LIMIT) {
      showToast(`List full (max ${URL_LIMIT} URLs)`);
      return;
    }
    const clean = cleanUrl(raw);
    if (urls.includes(clean)) {
      showToast('Already in list');
      return;
    }
    urls.push(clean);
    await saveUrls(urls);
    renderList(urls);
    showToast('URL added');
  });

  // Add all tabs in current window
  document.getElementById('btn-add-all').addEventListener('click', async () => {
    const rawUrls = await getAllTabUrls();
    const validUrls = rawUrls.filter(isCollectible);
    if (validUrls.length === 0) { showToast('No collectible tabs found'); return; }

    const urls = await loadUrls();
    let added = 0;
    for (const raw of validUrls) {
      if (urls.length >= URL_LIMIT) break;
      const clean = cleanUrl(raw);
      if (!urls.includes(clean)) {
        urls.push(clean);
        added++;
      }
    }
    await saveUrls(urls);
    renderList(urls);
    showToast(added === 0 ? 'All tabs already in list' : `Added ${added} URL${added !== 1 ? 's' : ''}`);
  });

  // Copy all
  document.getElementById('btn-copy').addEventListener('click', async () => {
    const urls = await loadUrls();
    if (urls.length === 0) { showToast('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(urls.join('\n'));
      showToast(`Copied ${urls.length} URL${urls.length !== 1 ? 's' : ''}`);
    } catch {
      showToast('Clipboard access denied');
    }
  });

  // Export as .txt file
  document.getElementById('btn-export').addEventListener('click', async () => {
    const urls = await loadUrls();
    if (urls.length === 0) { showToast('Nothing to export'); return; }
    const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'urls.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    showToast(`Saved ${urls.length} URL${urls.length !== 1 ? 's' : ''} as TXT`);
  });

  // Export as .csv file
  document.getElementById('btn-export-csv').addEventListener('click', async () => {
    const urls = await loadUrls();
    if (urls.length === 0) { showToast('Nothing to export'); return; }
    const csv = 'url\n' + urls.map(u => `"${u.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'urls.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    showToast(`Saved ${urls.length} URL${urls.length !== 1 ? 's' : ''} as CSV`);
  });

  // Email URLs via mailto
  document.getElementById('btn-email').addEventListener('click', async () => {
    const urls = await loadUrls();
    if (urls.length === 0) { showToast('Nothing to email'); return; }
    const subject = `URL List (${urls.length} URL${urls.length !== 1 ? 's' : ''})`;
    const body = urls.join('\n');
    const a = document.createElement('a');
    a.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Clear — first click asks for confirmation, second click clears
  document.getElementById('btn-clear').addEventListener('click', async () => {
    const btn = document.getElementById('btn-clear');

    if (!btn.classList.contains('confirming')) {
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
      clearTimeout(clearConfirmTimer);
      resetClearButton();
      await saveUrls([]);
      renderList([]);
      showToast('List cleared');
    }
  });
});
