import type { createBaseClient } from '../rpc/base-client';
import type { FullScore } from '../../types/scoring-types';
import {
  getCachedScore,
  setCachedScore,
} from '../db/score-cache-with-ttl-repository';
import { scoreCreatorTrust } from './creator-trust-scorer-with-cache';
import { scoreHolderHealth } from './holder-health-distribution-scorer';
import { scoreContractSafety } from './contract-safety-honeypot-scorer';
import { scoreLiquiditySignal } from './liquidity-depth-signal-scorer';
import { scoreSocialSignal } from './social-metadata-signal-scorer';
import {
  computeCompositeScore,
  getTierFromScore,
} from './weighted-score-normalizer';

type BaseClient = ReturnType<typeof createBaseClient>;

/**
 * Compute comprehensive token score using all scoring categories.
 * Results are cached for 60 seconds.
 *
 * @param client - Base chain RPC client
 * @param tokenAddress - Token contract address
 * @param creatorAddress - Token creator wallet address
 * @param poolAddress - Optional liquidity pool address for enhanced checks
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

    // Skip Creator Trust when creator address is same as token (no real creator data)
    const hasRealCreator = creatorAddress.toLowerCase() !== tokenAddress.toLowerCase();

    const scorers = [
      ...(hasRealCreator ? [scoreCreatorTrust(client, tokenAddress, creatorAddress)] : []),
      scoreHolderHealth(client, tokenAddress),
      scoreContractSafety(client, tokenAddress, poolAddress),
      scoreLiquiditySignal(client, tokenAddress, poolAddress),
      scoreSocialSignal(client, tokenAddress),
    ];

    const results = await Promise.allSettled(scorers);

    // Collect successful category scores
    const categories = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    // If all scorers failed, return danger score
    if (categories.length === 0) {
      const errorScore: FullScore = {
        tokenAddress,
        creatorAddress,
        score: 0,
        tier: 'DANGER',
        categories: [],
        timestamp: Date.now(),
        phase: 'full',
      };
      return errorScore;
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

    // Return minimal danger score on catastrophic error
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
