import { db } from './dexie-sentinel-database';
import type { FullScore, CachedScore } from '../../types/scoring-types';

/** Score cache TTL: 60 seconds */
const SCORE_CACHE_TTL_MS = 60 * 1000;

/** Get cached score if not expired */
export async function getCachedScore(
  tokenAddress: `0x${string}`
): Promise<FullScore | null> {
  try {
    const cached = await db.scores.get(tokenAddress);
    if (!cached) return null;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      await db.scores.delete(tokenAddress);
      return null;
    }

    return cached.score;
  } catch (error) {
    console.error('Error reading score cache:', error);
    return null;
  }
}

/** Cache a score with 60s TTL */
export async function setCachedScore(
  tokenAddress: `0x${string}`,
  score: FullScore
): Promise<void> {
  try {
    const entry: CachedScore = {
      tokenAddress,
      score,
      expiresAt: Date.now() + SCORE_CACHE_TTL_MS,
    };
    await db.scores.put(entry);
  } catch (error) {
    console.error('Error writing score cache:', error);
  }
}

/** Clear all expired scores (cleanup task) */
export async function clearExpiredScores(): Promise<void> {
  try {
    const now = Date.now();
    await db.scores.where('expiresAt').below(now).delete();
  } catch (error) {
    console.error('Error clearing expired scores:', error);
  }
}
