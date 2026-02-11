import { db } from './dexie-sentinel-database';
import type { CachedCreator } from '../../types/scoring-types';

/** Creator cache TTL: 24 hours */
const CREATOR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Creator data interface for caching */
export interface CreatorData {
  txCount: number;
  firstTxTimestamp: number;
  balance: bigint;
}

/** Get cached creator data if not expired */
export async function getCachedCreator(
  walletAddress: `0x${string}`
): Promise<CreatorData | null> {
  try {
    const cached = await db.creators.get(walletAddress);
    if (!cached) return null;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      await db.creators.delete(walletAddress);
      return null;
    }

    return {
      txCount: cached.txCount,
      firstTxTimestamp: cached.firstTxTimestamp,
      balance: cached.balance,
    };
  } catch (error) {
    console.error('Error reading creator cache:', error);
    return null;
  }
}

/** Cache creator data with 24h TTL */
export async function setCachedCreator(
  walletAddress: `0x${string}`,
  data: CreatorData
): Promise<void> {
  try {
    const entry: CachedCreator = {
      walletAddress,
      txCount: data.txCount,
      firstTxTimestamp: data.firstTxTimestamp,
      balance: data.balance,
      expiresAt: Date.now() + CREATOR_CACHE_TTL_MS,
    };
    await db.creators.put(entry);
  } catch (error) {
    console.error('Error writing creator cache:', error);
  }
}

/** Clear all expired creator entries (cleanup task) */
export async function clearExpiredCreators(): Promise<void> {
  try {
    const now = Date.now();
    await db.creators.where('expiresAt').below(now).delete();
  } catch (error) {
    console.error('Error clearing expired creators:', error);
  }
}
