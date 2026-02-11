/** Base chain ID */
export const BASE_CHAIN_ID = 8453;

/** Default Alchemy API key (rate-limited, users can override in settings) */
export const DEFAULT_ALCHEMY_KEY = 'demo';

/** Public Base RPC fallback */
export const BASE_PUBLIC_RPC = 'https://mainnet.base.org';

/** Alchemy RPC URL template — replace {key} with API key */
export const ALCHEMY_RPC_URL = (key: string) =>
  `https://base-mainnet.g.alchemy.com/v2/${key}`;

/** Score tier thresholds */
export const TIER_THRESHOLDS = {
  SAFE: 80,
  CAUTION: 60,
  RISKY: 40,
  DANGER: 0,
} as const;

/** Tier badge colors (background) */
export const TIER_COLORS: Record<string, string> = {
  SAFE: '#22c55e',
  CAUTION: '#eab308',
  RISKY: '#f97316',
  DANGER: '#ef4444',
};

/** Quick scorer signal weights (must sum to 100) */
export const SCORE_WEIGHTS = {
  creatorAge: 50,
  holderConcentration: 50,
} as const;

/** MutationObserver debounce delay in ms */
export const OBSERVER_DEBOUNCE_MS = 200;

/** Minimal ERC20 ABI for scoring reads */
export const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/** Chrome storage keys */
export const STORAGE_KEYS = {
  alchemyApiKey: 'alchemy_api_key',
} as const;

/** Sentinel badge host class for dedup detection */
export const BADGE_HOST_CLASS = 'sentinelfi-host';
