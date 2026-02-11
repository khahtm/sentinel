import { db } from './dexie-sentinel-database';
import type { WatchlistEntry } from './dexie-sentinel-database';

/**
 * Add wallet address to watchlist for monitoring.
 * @param walletAddress Wallet address to watch
 * @param label Optional label/note for the wallet
 */
export async function addToWatchlist(
  walletAddress: `0x${string}`,
  label?: string
): Promise<void> {
  try {
    const entry: WatchlistEntry = {
      walletAddress: walletAddress.toLowerCase() as `0x${string}`,
      label,
      addedAt: Date.now(),
    };

    await db.watchlist.put(entry);
  } catch (error) {
    console.error('[Watchlist] Failed to add to watchlist:', error);
    throw error;
  }
}

/**
 * Remove wallet address from watchlist.
 * @param walletAddress Wallet address to remove
 */
export async function removeFromWatchlist(
  walletAddress: `0x${string}`
): Promise<void> {
  try {
    const normalized = walletAddress.toLowerCase() as `0x${string}`;
    await db.watchlist.delete(normalized);
  } catch (error) {
    console.error('[Watchlist] Failed to remove from watchlist:', error);
    throw error;
  }
}

/**
 * Get all watchlist entries.
 * @returns Array of watchlist entries sorted by most recent first
 */
export async function getWatchlist(): Promise<WatchlistEntry[]> {
  try {
    const entries = await db.watchlist.toArray();
    // Sort by most recently added first
    return entries.sort((a, b) => b.addedAt - a.addedAt);
  } catch (error) {
    console.error('[Watchlist] Failed to get watchlist:', error);
    return [];
  }
}

/**
 * Check if wallet address is in watchlist.
 * @param walletAddress Wallet address to check
 * @returns True if watched, false otherwise
 */
export async function isWatched(walletAddress: `0x${string}`): Promise<boolean> {
  try {
    const normalized = walletAddress.toLowerCase() as `0x${string}`;
    const entry = await db.watchlist.get(normalized);
    return !!entry;
  } catch (error) {
    console.error('[Watchlist] Failed to check watchlist:', error);
    return false;
  }
}

/**
 * Update label for existing watchlist entry.
 * @param walletAddress Wallet address to update
 * @param label New label
 */
export async function updateWatchlistLabel(
  walletAddress: `0x${string}`,
  label: string
): Promise<void> {
  try {
    const normalized = walletAddress.toLowerCase() as `0x${string}`;
    await db.watchlist.update(normalized, { label });
  } catch (error) {
    console.error('[Watchlist] Failed to update label:', error);
    throw error;
  }
}
