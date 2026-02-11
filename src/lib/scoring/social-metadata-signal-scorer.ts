import type { createBaseClient } from '../rpc/base-client';
import type { CategoryScore, SignalResult } from '../../types/scoring-types';
import { TIER_THRESHOLDS } from '../constants';
import type { ScoreTier } from '../../types';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Category weight: 5% of total score */
const CATEGORY_WEIGHT = 0.05;

/** Maximum points for this category */
const MAX_POINTS = 10;

/** Get score tier from percentage */
function getTier(percentage: number): ScoreTier {
  const score = (percentage / 100) * 100;
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Score social/metadata signals.
 * Signals: social links present (0-5), custom image/metadata (0-5)
 *
 * Note: This is RobinPump-specific and requires DOM context.
 * In service worker context, we return neutral score.
 */
export async function scoreSocialSignal(
  client: BaseClient,
  tokenAddress: `0x${string}`
): Promise<CategoryScore> {
  const signals: SignalResult[] = [];

  try {
    // Signal 1: Social links presence (0-5 points)
    // Hardcoded stub - would need DOM access or API call to RobinPump
    let socialPoints = 0;
    let socialDetail = 'Social links not checked (requires UI context)';

    signals.push({
      name: 'Social Links',
      points: socialPoints,
      maxPoints: 5,
      detail: socialDetail,
    });

    // Signal 2: Custom image/metadata (0-5 points)
    // Check if token has name/symbol via ERC-20
    let metadataPoints = 0;
    let metadataDetail = 'No metadata found';

    try {
      const [name, symbol] = await Promise.allSettled([
        client.readContract({
          address: tokenAddress,
          abi: [
            {
              inputs: [],
              name: 'name',
              outputs: [{ name: '', type: 'string' }],
              stateMutability: 'view',
              type: 'function',
            },
          ] as const,
          functionName: 'name',
        }),
        client.readContract({
          address: tokenAddress,
          abi: [
            {
              inputs: [],
              name: 'symbol',
              outputs: [{ name: '', type: 'string' }],
              stateMutability: 'view',
              type: 'function',
            },
          ] as const,
          functionName: 'symbol',
        }),
      ]);

      const hasName = name.status === 'fulfilled' && name.value;
      const hasSymbol = symbol.status === 'fulfilled' && symbol.value;

      if (hasName && hasSymbol) {
        metadataPoints = 5;
        metadataDetail = `Token has name and symbol`;
      } else if (hasName || hasSymbol) {
        metadataPoints = 3;
        metadataDetail = 'Partial metadata found';
      }
    } catch (error) {
      metadataDetail = 'Metadata check failed';
    }

    signals.push({
      name: 'Token Metadata',
      points: metadataPoints,
      maxPoints: 5,
      detail: metadataDetail,
    });

    // Calculate category score
    const rawScore = signals.reduce((sum, s) => sum + s.points, 0);
    const percentage = (rawScore / MAX_POINTS) * 100;
    const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

    return {
      name: 'Social Signals',
      weight: CATEGORY_WEIGHT,
      rawScore,
      maxScore: MAX_POINTS,
      weightedScore,
      tier: getTier(percentage),
      signals,
    };
  } catch (error) {
    console.error('Error scoring social signals:', error);

    return {
      name: 'Social Signals',
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
