# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

URL Collector is a Chrome extension (Manifest V3) that collects clean URLs from browser tabs by stripping tracking parameters (UTM, fbclid, gclid, etc.) before saving them.

## Development Setup

No build system or package manager — this is pure vanilla JavaScript. Load directly into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select the `url-collector/` folder

After code changes, click the reload button on the extension card in `chrome://extensions`.

## Commands

**Regenerate icons** (requires Python 3, no external dependencies):
```bash
python3 create_icons.py
```

There are no automated tests, build steps, or linting tools configured.

## Architecture

The extension consists of three core files:

- **`manifest.json`** — Chrome extension config; declares permissions (`activeTab`, `storage`, `tabs`), links popup to `popup.html`
- **`popup.html`** — UI layer with embedded CSS; 400px-wide popup with header, add/copy/clear buttons, scrollable URL list, and toast notification system
- **`popup.js`** — All extension logic; no external dependencies

### Key patterns in `popup.js`

**URL cleaning** (`cleanUrl(rawUrl)`): Uses the browser `URL` API to parse URLs, then removes a hardcoded set of 28+ tracking query parameters. Returns the cleaned URL string. Blocks internal Chrome URLs (`chrome://`, `chrome-extension://`, `about:`).

**Persistence**: Uses `chrome.storage.local` (not `localStorage`) with the schema `{ urls: [string, ...] }`. All reads/writes go through `loadUrls()` / `saveUrls()`.

**Rendering**: `renderList(urls)` fully re-renders the URL list on every state change — no incremental DOM updates.

**Security**: All user-visible URL strings are passed through `esc(str)` (HTML entity escaping) before being inserted into innerHTML.

**Clear confirmation**: Two-step UX — first click arms a 3-second timeout, second click within that window confirms deletion.

### Adding new tracking parameters

Add the parameter name string to the `TRACKING_PARAMS` array at the top of `popup.js`. The `cleanUrl` function iterates this array automatically.
