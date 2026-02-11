import type { ScoreTier } from './index';

/** Individual signal result within a category */
export interface SignalResult {
  name: string;
  points: number;
  maxPoints: number;
  detail: string;
}

/** Category score with weighted contribution to total */
export interface CategoryScore {
  name: string;
  weight: number; // 0-1 (e.g., 0.30 = 30%)
  rawScore: number; // Sum of signal points
  maxScore: number; // Maximum possible points for category
  weightedScore: number; // rawScore/maxScore * weight * 100
  tier: ScoreTier;
  signals: SignalResult[];
}

/** Full comprehensive score with all category breakdowns */
export interface FullScore {
  tokenAddress: `0x${string}`;
  creatorAddress: `0x${string}`;
  score: number; // 0-100 composite score
  tier: ScoreTier;
  categories: CategoryScore[];
  timestamp: number;
  phase: 'quick' | 'full';
}

/** Cached score entry with expiration */
export interface CachedScore {
  tokenAddress: `0x${string}`;
  score: FullScore;
  expiresAt: number;
}

/** Cached creator data with expiration */
export interface CachedCreator {
  walletAddress: `0x${string}`;
  txCount: number;
  firstTxTimestamp: number;
  balance: bigint;
  expiresAt: number;
}

/** Honeypot detection result */
export interface HoneypotResult {
  isHoneypot: boolean;
  taxPercent: number; // 0-100
  detail: string;
}

/** Token holder info */
export interface HolderInfo {
  address: `0x${string}`;
  balance: bigint;
  percentage: number; // 0-100
}
