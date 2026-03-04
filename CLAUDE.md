# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

URL Collector is a Chrome extension (Manifest V3) that collects clean URLs from browser tabs by stripping tracking parameters (UTM, fbclid, gclid, etc.) before saving them. Current version: **1.3**.

## Development Setup

No build system or package manager — this is pure vanilla JavaScript. Load directly into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select this repository's root folder

After code changes, click the reload button on the extension card in `chrome://extensions`.

## Commands

**Regenerate icons** (requires Python 3, no external dependencies):
```bash
python3 create_icons.py
```

There are no automated tests, build steps, or linting tools configured.

## File Structure

```
manifest.json      # Extension manifest (MV3)
popup.html         # UI with embedded CSS
popup.js           # All extension logic
create_icons.py    # Icon generator script
icons/
  icon16.png
  icon48.png
  icon128.png
```

## Architecture

The extension consists of three core files:

- **`manifest.json`** — Chrome extension config; declares permissions (`activeTab`, `storage`, `tabs`), links popup to `popup.html`
- **`popup.html`** — UI layer with embedded CSS; 400px-wide popup with header, add buttons, scrollable URL list, footer action buttons, and toast notification
- **`popup.js`** — All extension logic; no external dependencies

### Constants (`popup.js`)

- **`URL_LIMIT`** (`500`) — Maximum number of URLs that can be stored. Adding beyond this shows a toast error.
- **`TRACKING_PARAMS`** — A `Set` of tracking query parameter names to strip. Currently includes 30 params covering Google Analytics/UTM, Google Ads, Facebook, Microsoft Ads, Twitter/X, Instagram, Mailchimp, Adobe Analytics, Zanox, and others. Generic params like `ref`, `referrer`, `source`, `si` are intentionally excluded as they have legitimate non-tracking uses.

### Key functions in `popup.js`

**URL cleaning** (`cleanUrl(rawUrl)`): Parses URLs with the browser `URL` API, then deletes any query parameter whose name (lowercased) is in `TRACKING_PARAMS`. Strips trailing `?` if no params remain. Falls back to returning the raw URL on parse failure.

**URL filtering** (`isCollectible(url)`): Returns `false` for blank URLs and internal browser URLs (`chrome://`, `chrome-extension://`, `about:`). Called before any URL is added to the list.

**Persistence**: Uses `chrome.storage.local` (not `localStorage`) with the schema `{ urls: [string, ...] }`. All reads go through `loadUrls()` and all writes go through `saveUrls(urls)`, both of which return Promises.

**Rendering**:
- `renderList(urls)` — Fully re-renders the URL list on every state change. Toggles between the list and empty-state views. Calls `updateBadge()`.
- `createUrlItemEl(url)` — Creates a single `.url-item` DOM element with index, URL text, open button, and remove button. Attaches event listeners inline.
- `handleRemove(item)` — Animates an item out with the `removing` CSS class, then removes it from storage and calls `renderList()`. Has a 400ms fallback timer in case the `animationend` event doesn't fire.
- `staggerItems()` — Applies staggered `animate-in` CSS animations (40ms delay per item) to all currently rendered items. Called on initial load and after "Add All Tabs".
- `updateBadge(count)` — Updates the URL count badge in the header. Triggers a `pop` CSS animation on count change (skipped on first render).

**Security**: All user-visible URL strings are passed through `esc(str)` (HTML entity escaping of `&`, `<`, `>`, `"`) before being inserted into `innerHTML`.

**Toast notifications** (`showToast(msg)`): Shows a short-lived (2 second) status message at the top of the popup. Uses CSS transitions for show/hide. Cancels any pending timer on re-trigger.

### UI Layout

**Header**: App name + URL count badge with pop animation on change.

**Add section** (two buttons):
- `#btn-add` — Adds the active tab's URL (single tab).
- `#btn-add-all` — Adds all URLs from the current window's tabs. Reports count of newly added URLs; skips duplicates and already-collected URLs.

**URL list**: Scrollable area (max 260px height). Each item shows an index number, the URL text, a hover-revealed "open in new tab" button, and a hover-revealed "remove" button. Item entry/exit are animated.

**Footer** (two rows):
- Row 1: `#btn-copy` (copy to clipboard), `#btn-export` (save as `urls.txt`), `#btn-export-csv` (save as `urls.csv`), `#btn-email` (open `mailto:` with URLs in body)
- Row 2: `#btn-clear` (two-step clear with 3-second confirmation window)

**Empty state**: Animated placeholder shown when the list is empty.

**Toast**: Fixed-position notification that slides in below the header.

### Button behaviors

- **Copy**: Copies newline-separated URLs to clipboard. Button temporarily shows "Copied!" with a success style.
- **Save TXT**: Creates a `Blob` and triggers a download of `urls.txt`.
- **Save CSV**: Creates a `Blob` with a `url` header row and RFC-4180 double-quote escaping, triggers download of `urls.csv`.
- **Email**: Constructs a `mailto:` link with subject and body, appends/clicks/removes a temporary anchor.
- **Clear All**: First click switches to "confirming" state (pulsing red style, 3-second timeout). Second click within the window clears storage and re-renders.

### Adding new tracking parameters

Add the parameter name string to the `TRACKING_PARAMS` `Set` at the top of `popup.js`. The `cleanUrl` function uses `TRACKING_PARAMS.has(key.toLowerCase())` automatically.
