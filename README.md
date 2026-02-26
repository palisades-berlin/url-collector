# URL Collector

A Chrome extension that collects clean URLs from your browser tabs — automatically stripping tracking and noise parameters (UTM, fbclid, gclid, etc.) before saving them.

## Features

- **Add current tab** — saves the active tab's URL to your list with one click
- **Tracking parameter removal** — strips UTM, Google Ads, Facebook, Microsoft Ads, and other common tracking params
- **Copy All** — copies the full list to your clipboard, one URL per line
- **Clear All** — removes all collected URLs (with confirmation step)

## Installation

Chrome does not allow installing extensions from outside the Chrome Web Store without enabling Developer Mode first.

1. [Download or clone this repository](https://github.com/palisades-berlin/url-collector/archive/refs/heads/main.zip) and unzip it
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** using the toggle in the top-right corner
4. Click **Load unpacked**
5. Select the `url-collector` folder

The extension icon will appear in your toolbar. Pin it for easy access.

## Usage

1. Navigate to any tab you want to collect
2. Click the URL Collector icon to open the popup
3. Click **Add Current Tab URL** — the clean URL is added to your list
4. Repeat for as many tabs as you like
5. Click **Copy All** to copy the list to your clipboard
