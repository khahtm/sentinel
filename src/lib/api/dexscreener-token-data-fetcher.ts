/** DexScreener pair data for a token */
export interface DexScreenerPair {
  chainId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string | null;
  volume: { h24: number };
  liquidity: { usd: number };
  fdv: number | null;
  txns: { h24: { buys: number; sells: number } };
  priceChange: { h24: number };
}

/**
 * Fetch token market data from DexScreener API (free, no auth).
 * Returns the highest-liquidity Base pair, or null if not listed.
 */
export async function fetchDexScreenerData(
  tokenAddress: string
): Promise<DexScreenerPair | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const pairs: DexScreenerPair[] | null = data?.pairs;
    if (!pairs || pairs.length === 0) return null;

    // Prefer Base chain pairs, sorted by liquidity
    const basePairs = pairs.filter((p) => p.chainId === 'base');
    const candidates = basePairs.length > 0 ? basePairs : pairs;

    return candidates.sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];
  } catch (error) {
    console.error('[DexScreener] Fetch failed:', error);
    return null;
  }
}
