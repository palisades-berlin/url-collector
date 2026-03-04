(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.UrlUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
    'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
    'fbclid',
    'msclkid',
    'twclid',
    'igshid',
    'mc_cid', 'mc_eid',
    '_ga', '_gl',
    'srsltid',
    's_kwcid',
    'zanpid',
  ]);

  function serializeNormalized(url) {
    const normalized = new URL(url.toString());
    normalized.hostname = normalized.hostname.toLowerCase();

    if (
      (normalized.protocol === 'http:' && normalized.port === '80') ||
      (normalized.protocol === 'https:' && normalized.port === '443')
    ) {
      normalized.port = '';
    }

    const entries = [...normalized.searchParams.entries()];
    entries.sort((a, b) => {
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      if (a[1] < b[1]) return -1;
      if (a[1] > b[1]) return 1;
      return 0;
    });
    normalized.search = '';
    for (const [key, value] of entries) {
      normalized.searchParams.append(key, value);
    }

    let result = normalized.toString();
    if (
      normalized.pathname === '/' &&
      normalized.searchParams.size === 0 &&
      !normalized.hash &&
      result.endsWith('/')
    ) {
      result = result.slice(0, -1);
    }
    if (normalized.searchParams.size === 0 && result.endsWith('?')) {
      result = result.slice(0, -1);
    }
    return result;
  }

  function cleanUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      for (const key of [...url.searchParams.keys()]) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          url.searchParams.delete(key);
        }
      }
      return serializeNormalized(url);
    } catch {
      return rawUrl;
    }
  }

  function normalizeUrlForCompare(rawUrl) {
    try {
      return serializeNormalized(new URL(rawUrl));
    } catch {
      return rawUrl;
    }
  }

  function isCollectibleUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function escapeCsvCell(value) {
    const text = String(value);
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  return {
    TRACKING_PARAMS,
    cleanUrl,
    normalizeUrlForCompare,
    isCollectibleUrl,
    escapeCsvCell,
  };
});
