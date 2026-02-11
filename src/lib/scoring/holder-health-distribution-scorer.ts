import type { createBaseClient } from '../rpc/base-client';
import type { CategoryScore, SignalResult } from '../../types/scoring-types';
import { TIER_THRESHOLDS } from '../constants';
import type { ScoreTier } from '../../types';
import { fetchTopHolders } from '../rpc/token-holder-fetcher-via-logs';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Category weight: 20% of total score */
const CATEGORY_WEIGHT = 0.2;

/** Maximum points for this category */
const MAX_POINTS = 25;

/** Get score tier from percentage */
function getTier(percentage: number): ScoreTier {
  const score = (percentage / 100) * 100;
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Score holder distribution health.
 * Signals: top wallet % (0-8), top 10 % (0-7), unique holders (0-5), sybil detection (-10 to 0)
 */
export async function scoreHolderHealth(
  client: BaseClient,
  tokenAddress: `0x${string}`
): Promise<CategoryScore> {
  const signals: SignalResult[] = [];

  try {
    // Fetch top 10 holders
    const holders = await fetchTopHolders(client, tokenAddress, 10);

    if (holders.length === 0) {
      // No holders found - likely new token or error
      signals.push({
        name: 'Data Availability',
        points: 0,
        maxPoints: MAX_POINTS,
        detail: 'No holder data available',
      });

      return {
        name: 'Holder Health',
        weight: CATEGORY_WEIGHT,
        rawScore: 0,
        maxScore: MAX_POINTS,
        weightedScore: 0,
        tier: 'DANGER',
        signals,
      };
    }

    // Signal 1: Top wallet percentage (0-8 points)
    // Lower concentration = better score
    const topPct = holders[0]?.percentage || 100;
    let topWalletPoints = 0;
    if (topPct < 10) topWalletPoints = 8;
    else if (topPct < 20) topWalletPoints = 6;
    else if (topPct < 35) topWalletPoints = 4;
    else if (topPct < 50) topWalletPoints = 2;

    signals.push({
      name: 'Top Holder Concentration',
      points: topWalletPoints,
      maxPoints: 8,
      detail: `${topPct.toFixed(2)}% held by largest wallet`,
    });

    // Signal 2: Top 10 combined percentage (0-7 points)
    const top10Pct = holders.reduce((sum, h) => sum + h.percentage, 0);
    let top10Points = 0;
    if (top10Pct < 40) top10Points = 7;
    else if (top10Pct < 60) top10Points = 5;
    else if (top10Pct < 80) top10Points = 3;
    else if (top10Pct < 95) top10Points = 1;

    signals.push({
      name: 'Top 10 Distribution',
      points: top10Points,
      maxPoints: 7,
      detail: `${top10Pct.toFixed(2)}% held by top 10`,
    });

    // Signal 3: Unique holder count (0-5 points)
    // More holders = better distribution
    const holderCount = holders.length;
    let countPoints = 0;
    if (holderCount >= 10) countPoints = 5;
    else if (holderCount >= 7) countPoints = 4;
    else if (holderCount >= 5) countPoints = 3;
    else if (holderCount >= 3) countPoints = 2;
    else if (holderCount >= 1) countPoints = 1;

    signals.push({
      name: 'Holder Count',
      points: countPoints,
      maxPoints: 5,
      detail: `${holderCount} unique holders detected`,
    });

    // Signal 4: Sybil detection (-10 to 0 points)
    // Check if multiple top holders have suspiciously similar balances
    let sybilPoints = 0;
    if (holders.length >= 3) {
      const balances = holders.slice(0, 5).map((h) => h.percentage);
      const avgBalance = balances.reduce((a, b) => a + b, 0) / balances.length;

      // Count how many are within 10% of average
      const similarCount = balances.filter(
        (b) => Math.abs(b - avgBalance) / avgBalance < 0.1
      ).length;

      if (similarCount >= 4) sybilPoints = -5; // Likely sybil wallets
      else if (similarCount >= 3) sybilPoints = -2;
    }

    signals.push({
      name: 'Sybil Detection',
      points: sybilPoints,
      maxPoints: 0,
      detail:
        sybilPoints < 0
          ? 'Suspicious similar balances detected'
          : 'No sybil pattern detected',
    });

    // Calculate category score
    const rawScore = signals.reduce((sum, s) => sum + s.points, 0);
    const percentage = ((rawScore + 5) / (MAX_POINTS + 5)) * 100; // Offset by min possible (-5)
    const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

    return {
      name: 'Holder Health',
      weight: CATEGORY_WEIGHT,
      rawScore,
      maxScore: MAX_POINTS,
      weightedScore,
      tier: getTier(percentage),
      signals,
    };
  } catch (error) {
    console.error('Error scoring holder health:', error);

    return {
      name: 'Holder Health',
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
