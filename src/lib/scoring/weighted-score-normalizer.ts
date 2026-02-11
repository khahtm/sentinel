import type { CategoryScore } from '../../types/scoring-types';
import type { ScoreTier } from '../../types';
import { TIER_THRESHOLDS } from '../constants';

/**
 * Compute composite score from weighted category scores.
 * Returns value clamped to 0-100 range.
 */
export function computeCompositeScore(categories: CategoryScore[]): number {
  // Sum all weighted scores
  const totalWeighted = categories.reduce(
    (sum, cat) => sum + cat.weightedScore,
    0
  );

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(totalWeighted)));
}

/**
 * Get tier from composite score.
 * SAFE: 80-100, CAUTION: 60-79, RISKY: 40-59, DANGER: 0-39
 */
export function getTierFromScore(score: number): ScoreTier {
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}
