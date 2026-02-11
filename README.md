# SentinelFi — Rug-Pull Shield for RobinPump

Chrome extension that scans every token on [RobinPump.fun](https://robinpump.fun) and shows real-time safety scores so you can avoid rug pulls.

## Quick Install

1. **Download** [`sentinelfi-0.1.0-chrome.zip`](./sentinelfi-0.1.0-chrome.zip) from this repo
2. **Unzip** the file to a folder on your computer
3. Open **`chrome://extensions/`** in Chrome
4. Enable **Developer mode** (toggle in top-right corner)
5. Click **"Load unpacked"** → select the unzipped folder
6. Visit [robinpump.fun](https://robinpump.fun) — you'll see Sentinel badges on every token card

## How It Works

Each token gets a safety badge based on on-chain analysis:

| Tier | Score | Meaning |
|------|-------|---------|
| **SAFE** | 65-100 | Low risk — established creator, healthy distribution |
| **CAUTION** | 40-64 | Moderate risk — some yellow flags |
| **RISKY** | 20-39 | High risk — multiple red flags detected |
| **DANGER** | 0-19 | Very high risk — likely rug pull |

Click any badge to open a detailed breakdown with 5 scoring categories:

- **Creator Trust** — wallet age, tx history, token holdings, funding source
- **Holder Health** — top wallet concentration, distribution, sybil detection
- **Contract Safety** — honeypot detection, transfer tax, ERC-20 compliance
- **Liquidity Signals** — pool depth, curve age, activity level
- **Social Signals** — token metadata, naming

## Features

- Real-time badge injection on token listing pages
- Detailed sidebar with full score breakdown
- Toast alerts for creator dumps and whale exits
- Watchlist tracking for tokens you care about
- Works with Base chain (Alchemy RPC)

## Optional: Alchemy API Key

The extension works out of the box with public RPC. For faster and more reliable scoring, add your own [Alchemy API key](https://www.alchemy.com/) in the extension popup → Settings tab.

## Tech Stack

- WXT (Chrome Extension framework)
- React 19 + TypeScript
- Viem (Base chain RPC)
- Dexie (IndexedDB caching)
- Shadow DOM isolation for UI injection

## Development

```bash
pnpm install
pnpm dev          # dev mode with hot reload
pnpm build        # production build
pnpm zip          # create distributable zip
pnpm test         # run tests
```

## License

MIT
