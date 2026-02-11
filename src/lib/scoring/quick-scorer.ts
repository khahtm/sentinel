import type { QuickScore, ScoreTier } from '../../types';
import type { createBaseClient } from '../rpc/base-client';
import { ERC20_BALANCE_ABI, SCORE_WEIGHTS, TIER_THRESHOLDS } from '../constants';

type BaseClient = ReturnType<typeof createBaseClient>;

/**
 * Map creator transaction count to a 0-50 score.
 * Higher tx count = older/more active wallet = safer.
 * >500 tx = 50 points, <10 tx = 5 points. Linear interpolation between.
 */
function scoreCreatorAge(txCount: number): number {
  if (txCount >= 500) return SCORE_WEIGHTS.creatorAge;
  if (txCount < 10) return 5;
  // Linear scale: 10-500 maps to 5-50
  return Math.round(5 + ((txCount - 10) / 490) * 45);
}

/**
 * Map top holder percentage to a 0-50 score.
 * Lower concentration = safer. Inverse relationship.
 * >50% supply held = 0 points, <5% = 50 points.
 */
function scoreHolderConcentration(holderPct: number): number {
  if (holderPct >= 50) return 0;
  if (holderPct <= 5) return SCORE_WEIGHTS.holderConcentration;
  // Linear inverse: 5-50% maps to 50-0
  return Math.round(50 - ((holderPct - 5) / 45) * 50);
}

/** Determine score tier from numeric score */
function getTier(score: number): ScoreTier {
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Compute quick score for a single token using viem multicall.
 * Fetches creator tx count + creator's token balance + total supply in one RPC call.
 * Gracefully handles non-ERC-20 addresses by falling back to tx-count-only scoring.
 */
export async function computeQuickScore(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  creatorAddress: `0x${string}`
): Promise<QuickScore> {
  // Always fetch tx count (works for both EOAs and contracts)
  const txCount = await client.getTransactionCount({ address: creatorAddress });

  // Try ERC-20 calls — may fail if tokenAddress is an EOA or non-ERC-20 contract
  let holderPct = 50; // Default: assume moderate risk if ERC-20 calls fail
  try {
    const [creatorBalance, totalSupply] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [creatorAddress],
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_BALANCE_ABI,
        functionName: 'totalSupply',
      }),
    ]);

    holderPct =
      totalSupply > 0n
        ? Number((creatorBalance * 10000n) / totalSupply) / 100
        : 100;
  } catch {
    // Address is likely not an ERC-20 contract — use default moderate risk
    // Address is not an ERC-20 contract — use default moderate risk
  }

  const creatorScore = scoreCreatorAge(txCount);
  const holderScore = scoreHolderConcentration(holderPct);
  const score = creatorScore + holderScore;

  return {
    tokenAddress,
    score,
    tier: getTier(score),
    creatorTxCount: txCount,
    topHolderPct: Math.round(holderPct * 100) / 100,
    timestamp: Date.now(),
  };
}

// Export internal functions for unit testing
export { scoreCreatorAge, scoreHolderConcentration, getTier };
