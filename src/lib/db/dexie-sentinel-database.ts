import Dexie, { type Table } from 'dexie';
import type { CachedScore, CachedCreator } from '../../types/scoring-types';

/** Cached contract bytecode for quick reuse */
export interface CachedBytecode {
  address: `0x${string}`;
  bytecode: string;
  expiresAt: number;
}

/** Watchlist entry for monitoring wallet addresses */
export interface WatchlistEntry {
  walletAddress: `0x${string}`;
  label?: string;
  addedAt: number;
}

/** False positive report for user feedback */
export interface FalsePositiveReport {
  id?: number;
  tokenAddress: `0x${string}`;
  reportedAt: number;
  reason?: string;
}

/** SentinelFi IndexedDB database using Dexie */
export class SentinelDatabase extends Dexie {
  scores!: Table<CachedScore, string>;
  creators!: Table<CachedCreator, string>;
  bytecodes!: Table<CachedBytecode, string>;
  watchlist!: Table<WatchlistEntry, string>;
  falsePositives!: Table<FalsePositiveReport, number>;

  constructor() {
    super('SentinelDB');

    this.version(1).stores({
      scores: 'tokenAddress, expiresAt',
      creators: 'walletAddress, expiresAt',
      bytecodes: 'address, expiresAt',
    });

    // Version 2: Add watchlist and false positives tables
    this.version(2).stores({
      scores: 'tokenAddress, expiresAt',
      creators: 'walletAddress, expiresAt',
      bytecodes: 'address, expiresAt',
      watchlist: 'walletAddress, addedAt',
      falsePositives: '++id, tokenAddress, reportedAt',
    });
  }
}

/** Singleton database instance */
export const db = new SentinelDatabase();
