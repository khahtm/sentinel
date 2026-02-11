import type { createBaseClient } from '../rpc/base-client';
import type { CategoryScore, SignalResult } from '../../types/scoring-types';
import { TIER_THRESHOLDS } from '../constants';
import type { ScoreTier } from '../../types';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Category weight: 15% of total score */
const CATEGORY_WEIGHT = 0.15;

/** Maximum points for this category */
const MAX_POINTS = 15;

/** Get score tier from percentage */
function getTier(percentage: number): ScoreTier {
  const score = (percentage / 100) * 100;
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Score liquidity depth signals.
 * Signals: ETH balance (0-5), curve age (0-5), buy/sell ratio (0-5)
 */
export async function scoreLiquiditySignal(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  poolAddress?: `0x${string}`
): Promise<CategoryScore> {
  const signals: SignalResult[] = [];

  try {
    // Signal 1: ETH balance in pool (0-5 points)
    let ethPoints = 0;
    let ethDetail = 'No pool address';

    if (poolAddress) {
      const balance = await client.getBalance({ address: poolAddress });
      const ethAmount = Number(balance) / 1e18;

      if (ethAmount >= 10) ethPoints = 5;
      else if (ethAmount >= 5) ethPoints = 4;
      else if (ethAmount >= 1) ethPoints = 3;
      else if (ethAmount >= 0.5) ethPoints = 2;
      else if (ethAmount >= 0.1) ethPoints = 1;

      ethDetail = `${ethAmount.toFixed(4)} ETH in pool`;
    }

    signals.push({
      name: 'Pool Liquidity',
      points: ethPoints,
      maxPoints: 5,
      detail: ethDetail,
    });

    // Signal 2: Curve age (0-5 points)
    // Simplified: check pool contract creation time
    let agePoints = 0;
    let ageDetail = 'Age unknown';

    if (poolAddress) {
      try {
        // Get pool bytecode to confirm it exists
        const code = await client.getBytecode({ address: poolAddress });
        if (code && code !== '0x') {
          // Pool exists - estimate age by checking transaction count as proxy
          const txCount = await client.getTransactionCount({ address: poolAddress });

          if (txCount >= 1000) agePoints = 5;
          else if (txCount >= 500) agePoints = 4;
          else if (txCount >= 100) agePoints = 3;
          else if (txCount >= 50) agePoints = 2;
          else if (txCount >= 10) agePoints = 1;

          ageDetail = `${txCount} pool transactions`;
        }
      } catch (error) {
        ageDetail = 'Pool check failed';
      }
    }

    signals.push({
      name: 'Curve Age',
      points: agePoints,
      maxPoints: 5,
      detail: ageDetail,
    });

    // Signal 3: Buy/sell ratio (0-5 points)
    // Simplified: use token contract balance as proxy for activity
    let ratioPoints = 0;
    let ratioDetail = 'Ratio unknown';

    try {
      const tokenBalance = await client.getBalance({ address: tokenAddress });
      const ethAmount = Number(tokenBalance) / 1e18;

      // Higher balance = more activity
      if (ethAmount >= 1) ratioPoints = 5;
      else if (ethAmount >= 0.5) ratioPoints = 4;
      else if (ethAmount >= 0.1) ratioPoints = 3;
      else if (ethAmount >= 0.01) ratioPoints = 2;
      else if (ethAmount >= 0.001) ratioPoints = 1;

      ratioDetail = `${ethAmount.toFixed(4)} ETH in contract`;
    } catch (error) {
      ratioDetail = 'Balance check failed';
    }

    signals.push({
      name: 'Activity Level',
      points: ratioPoints,
      maxPoints: 5,
      detail: ratioDetail,
    });

    // Calculate category score
    const rawScore = signals.reduce((sum, s) => sum + s.points, 0);
    const percentage = (rawScore / MAX_POINTS) * 100;
    const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

    return {
      name: 'Liquidity Signals',
      weight: CATEGORY_WEIGHT,
      rawScore,
      maxScore: MAX_POINTS,
      weightedScore,
      tier: getTier(percentage),
      signals,
    };
  } catch (error) {
    console.error('Error scoring liquidity signals:', error);

    return {
      name: 'Liquidity Signals',
      weight: CATEGORY_WEIGHT,
      rawScore: 0,
      maxScore: MAX_POINTS,
      weightedScore: 0,
      tier: 'DANGER',
      signals: [
        {
          name: 'Error',
          points: 0,
          maxPoints: MAX_POINTS,
          detail: `Failed to score: ${error instanceof Error ? error.message : 'unknown'}`,
        },
      ],
    };
  }
}
