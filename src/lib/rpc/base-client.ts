import { createPublicClient, http, fallback } from 'viem';
import { base } from 'viem/chains';
import {
  ALCHEMY_RPC_URL,
  BASE_PUBLIC_RPC,
  DEFAULT_ALCHEMY_KEY,
  STORAGE_KEYS,
} from '../constants';

/** Create viem PublicClient for Base chain with multicall batching */
export function createBaseClient(alchemyKey: string) {
  return createPublicClient({
    chain: base,
    transport: fallback([
      http(ALCHEMY_RPC_URL(alchemyKey)),
      http(BASE_PUBLIC_RPC),
    ]),
    batch: { multicall: true },
  });
}

type BaseClient = ReturnType<typeof createBaseClient>;

let cachedClient: BaseClient | null = null;

/** Get or create singleton Base client, reading API key from chrome.storage */
export async function getBaseClient(): Promise<BaseClient> {
  if (cachedClient) return cachedClient;

  let key = DEFAULT_ALCHEMY_KEY;
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.alchemyApiKey);
    if (stored[STORAGE_KEYS.alchemyApiKey]) {
      key = String(stored[STORAGE_KEYS.alchemyApiKey]);
    }
  } catch {
    // chrome.storage unavailable (e.g. in tests) — use default key
  }

  cachedClient = createBaseClient(key);
  return cachedClient;
}

/** Reset cached client (call when user changes API key) */
export function resetBaseClient(): void {
  cachedClient = null;
}
