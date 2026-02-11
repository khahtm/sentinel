/** Daily usage statistics tracked in chrome.storage.local */
export interface DailyStats {
  tokensScannedToday: number;
  rugsDetected: number;
  lastScanTimestamp: number;
  currentDate: string; // YYYY-MM-DD for daily reset check
}

const STORAGE_KEY = 'sentinel_daily_stats';

/** Get current date as YYYY-MM-DD string */
function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/** Get default stats object */
function getDefaultStats(): DailyStats {
  return {
    tokensScannedToday: 0,
    rugsDetected: 0,
    lastScanTimestamp: 0,
    currentDate: getCurrentDate(),
  };
}

/**
 * Load stats from storage and reset if new day.
 * @returns Current daily stats
 */
async function loadStats(): Promise<DailyStats> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as DailyStats | undefined;

    if (!stored) return getDefaultStats();

    // Reset counters if new day
    if (stored.currentDate !== getCurrentDate()) {
      return getDefaultStats();
    }

    return stored;
  } catch (error) {
    console.error('[Stats] Failed to load stats:', error);
    return getDefaultStats();
  }
}

/**
 * Save stats to storage.
 * @param stats Stats object to save
 */
async function saveStats(stats: DailyStats): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: stats });
  } catch (error) {
    console.error('[Stats] Failed to save stats:', error);
  }
}

/**
 * Increment tokens scanned counter.
 * @param count Number of tokens scanned (default 1)
 */
export async function incrementTokensScanned(count: number = 1): Promise<void> {
  const stats = await loadStats();
  stats.tokensScannedToday += count;
  stats.lastScanTimestamp = Date.now();
  await saveStats(stats);
}

/**
 * Increment rugs detected counter.
 */
export async function incrementRugsDetected(): Promise<void> {
  const stats = await loadStats();
  stats.rugsDetected += 1;
  await saveStats(stats);
}

/**
 * Get current daily stats.
 * @returns DailyStats object
 */
export async function getStats(): Promise<DailyStats> {
  return loadStats();
}

/**
 * Reset all stats to zero (for testing or manual reset).
 */
export async function resetStats(): Promise<void> {
  await saveStats(getDefaultStats());
}
