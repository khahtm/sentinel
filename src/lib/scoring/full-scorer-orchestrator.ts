import type { createBaseClient } from '../rpc/base-client';
import type { FullScore } from '../../types/scoring-types';
import {
  getCachedScore,
  setCachedScore,
} from '../db/score-cache-with-ttl-repository';
import { fetchDexScreenerData } from '../api/dexscreener-token-data-fetcher';
import { scoreCreatorTrust } from './creator-trust-scorer-with-cache';
import { scoreHolderHealth } from './holder-health-distribution-scorer';
import { scoreContractSafety } from './contract-safety-honeypot-scorer';
import { scoreLiquiditySignal } from './liquidity-depth-signal-scorer';
import { scoreSocialSignal } from './social-metadata-signal-scorer';
import { scoreMarketActivity } from './market-activity-dexscreener-scorer';
import {
  computeCompositeScore,
  getTierFromScore,
} from './weighted-score-normalizer';

type BaseClient = ReturnType<typeof createBaseClient>;

/**
 * Compute comprehensive token score using all scoring categories.
 * Fetches DexScreener market data first to get pool address and market signals.
 * Results are cached for 60 seconds.
 */
export async function computeFullScore(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  creatorAddress: `0x${string}`,
  poolAddress?: `0x${string}`
): Promise<FullScore> {
  try {
    // Check cache first
    const cached = await getCachedScore(tokenAddress);
    if (cached) {
      return cached;
    }

    // Fetch DexScreener data for market signals and pool address discovery
    const dexData = await fetchDexScreenerData(tokenAddress);
    const discoveredPool = dexData?.pairAddress as `0x${string}` | undefined;
    const effectivePool = poolAddress ?? discoveredPool;

    // Skip Creator Trust when creator address is same as token (no real creator data)
    const hasRealCreator = creatorAddress.toLowerCase() !== tokenAddress.toLowerCase();

    // Run on-chain scorers in parallel, plus market scorer (sync, uses dexData)
    const scorers = [
      ...(hasRealCreator ? [scoreCreatorTrust(client, tokenAddress, creatorAddress)] : []),
      scoreHolderHealth(client, tokenAddress),
      scoreContractSafety(client, tokenAddress, effectivePool),
      scoreLiquiditySignal(client, tokenAddress, effectivePool),
      scoreSocialSignal(client, tokenAddress),
    ];

    const results = await Promise.allSettled(scorers);

    // Collect successful category scores
    const categories = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    // Add market activity score (synchronous, always succeeds)
    categories.push(scoreMarketActivity(dexData));

    // If no categories, return danger score
    if (categories.length === 0) {
      return {
        tokenAddress,
        creatorAddress,
        score: 0,
        tier: 'DANGER',
        categories: [],
        timestamp: Date.now(),
        phase: 'full',
      };
    }

    // Compute composite score
    const compositeScore = computeCompositeScore(categories);
    const tier = getTierFromScore(compositeScore);

    const fullScore: FullScore = {
      tokenAddress,
      creatorAddress,
      score: compositeScore,
      tier,
      categories,
      timestamp: Date.now(),
      phase: 'full',
    };

    // Cache the result
    await setCachedScore(tokenAddress, fullScore);

    return fullScore;
  } catch (error) {
    console.error('Error computing full score:', error);

    return {
      tokenAddress,
      creatorAddress,
      score: 0,
      tier: 'DANGER',
      categories: [],
      timestamp: Date.now(),
      phase: 'full',
    };
  }
}
