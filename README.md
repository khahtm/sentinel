# SentinelFi — Rug-Pull Shield for RobinPump

Chrome extension that scans every token on [RobinPump.fun](https://robinpump.fun) and shows real-time safety scores so you can avoid rug pulls before they happen.

---

## Quick Install (2 minutes)

1. **Download** [`sentinelfi-0.1.0-chrome.zip`](https://github.com/khahtm/sentinel/releases/download/v0.1.0/sentinelfi-0.1.0-chrome.zip) from the [latest release](https://github.com/khahtm/sentinel/releases/latest)
2. **Right-click** the downloaded zip and select **"Extract All..."** to unzip
3. Open **`chrome://extensions/`** in your Chrome browser
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **"Load unpacked"** and select the **extracted folder** (the one containing `manifest.json`)
6. Visit [robinpump.fun](https://robinpump.fun) — you'll see **"Scan with Sentinel"** badges on every token card

> **Updating:** To update, download the new zip, extract it to the same folder (overwrite), then go to `chrome://extensions/` and click the refresh icon on SentinelFi.

---

## How It Works

SentinelFi runs **6 independent scoring categories** on every token, combining on-chain blockchain analysis with real-time market data to produce a composite safety score from 0 to 100.

### Score Tiers

| Tier | Score | Badge Color | What It Means |
|------|-------|-------------|---------------|
| **SAFE** | 65-100 | Green | Low risk — healthy market activity, good distribution, no red flags |
| **CAUTION** | 40-64 | Yellow | Moderate risk — some concerns detected, proceed with care |
| **RISKY** | 20-39 | Orange | High risk — multiple red flags, significant rug-pull indicators |
| **DANGER** | 0-19 | Red | Very high risk — strong rug-pull signals, avoid |

### Scoring Categories

Click any badge to open a **detailed sidebar** with the full score breakdown:

#### 1. Market Activity (30% weight)
The strongest differentiator between tokens. Pulls live data from DexScreener API and RobinPump page data.
- **Market Cap / FDV** — Higher market cap = more established token
- **24h Trading Volume** — Active trading indicates real interest
- **Liquidity (USD)** — More liquidity = harder to manipulate
- **24h Buy/Sell Transactions** — Transaction count shows real activity
- **Price Stability** — Extreme dumps are penalized, stability is rewarded

#### 2. Creator Trust (20% weight)
Analyzes the token creator's wallet history on Base chain.
- **Wallet Age** — Older wallets with more transaction history are safer
- **Token Holdings** — Creator holding many other tokens is a yellow flag
- **Funding Source** — Freshly funded wallets from exchanges may indicate throwaway accounts
- **Past Rug History** — Checks for patterns of creating and abandoning tokens

#### 3. Holder Health (20% weight)
Examines token distribution across holders using on-chain Transfer event analysis.
- **Top Holder Concentration** — Single wallet holding >50% is dangerous
- **Top 10 Distribution** — How concentrated the top 10 wallets are
- **Unique Holder Count** — More unique holders = healthier distribution
- **Sybil Detection** — Flags suspiciously similar balance patterns (fake holders)

#### 4. Contract Safety (15% weight)
Inspects the smart contract itself for technical red flags.
- **Honeypot Detection** — Simulates buy/sell to check if tokens can be sold
- **Transfer Tax** — High transfer taxes (>10%) drain value from holders
- **ERC-20 Compliance** — Non-standard contracts may have hidden functions
- **Contract Deployment** — Verifies contract exists and checks bytecode
- **Transfer Activity** — Counts recent Transfer events as activity indicator

#### 5. Liquidity Signals (10% weight)
Evaluates liquidity depth and token market structure.
- **Pool Liquidity / Token Supply** — Checks total supply reasonableness
- **Contract Code Complexity** — Bytecode size indicates contract sophistication
- **Contract ETH Balance** — ETH held by the token contract

#### 6. Social Signals (5% weight)
Checks token metadata and social presence.
- **Token Metadata** — Verifies name and symbol are properly set
- **Social Links** — Checks for social media presence (when available)

---

## Features

- **Automatic Badge Injection** — Glowing "Scan with Sentinel" badges appear on every token card on the RobinPump listing page
- **Detailed Sidebar Panel** — Click any badge to open a full score breakdown with all 6 categories and individual signals
- **Two-Phase Scoring** — Quick score appears instantly, full analysis runs in background
- **DexScreener Integration** — Pulls live market data (price, volume, liquidity, transactions) from DexScreener API
- **DOM Market Cap Parsing** — Extracts market cap directly from RobinPump page for tokens not yet on DexScreener
- **Auto Pool Discovery** — Automatically finds the token's liquidity pool address from DexScreener for enhanced honeypot detection
- **Score Caching** — 60-second cache prevents redundant API calls
- **Toast Alerts** — Real-time notifications for large transfers and suspicious whale activity
- **Watchlist** — Track specific tokens you care about
- **View on BaseScan** — Quick link to view token contract on BaseScan explorer
- **Report False Positives** — Help improve scoring by reporting incorrect assessments
- **Shadow DOM Isolation** — All UI elements are injected via Shadow DOM to avoid conflicts with the host page
- **Dark Theme** — Matches RobinPump's dark UI

---

## Optional: Alchemy API Key

The extension works out of the box with public Base RPC. For **faster and more reliable** scoring:

1. Get a free API key from [Alchemy](https://www.alchemy.com/)
2. Click the SentinelFi extension icon in Chrome toolbar
3. Go to the **Settings** tab
4. Paste your Alchemy API key and save

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **WXT** | Chrome Extension framework (Manifest V3) |
| **React 19** | UI components (badges, sidebar, popups) |
| **TypeScript** | Type-safe codebase |
| **Viem** | Base chain RPC client with multicall batching |
| **Dexie** | IndexedDB wrapper for score caching |
| **DexScreener API** | Live market data (price, volume, liquidity) |
| **Shadow DOM** | UI isolation from host page styles |

---

## Development

```bash
pnpm install       # Install dependencies
pnpm dev           # Dev mode with hot reload
pnpm build         # Production build
pnpm zip           # Create distributable zip
pnpm test          # Run tests
```

### Project Structure

```
src/
  entrypoints/
    background/     # Service worker — scoring orchestration, RPC calls
    content/        # Content script — badge injection, DOM parsing
    popup/          # Extension popup — stats, watchlist, settings
    offscreen/      # Offscreen document — WebSocket connections
  components/       # React UI components (badges, sidebar, toasts)
  lib/
    api/            # External API fetchers (DexScreener)
    scoring/        # 6 scoring category modules + orchestrator
    rpc/            # Base chain RPC utilities (honeypot, bytecode, holders)
    dom/            # DOM parsing for RobinPump page
    db/             # Dexie database, caching, CRUD operations
    alerts/         # Transfer event monitoring and alert evaluation
    stats/          # Usage statistics tracking
  types/            # TypeScript type definitions
```

---

## License

MIT
