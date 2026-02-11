/** Score tier based on risk level: 80-100 SAFE, 60-79 CAUTION, 40-59 RISKY, 0-39 DANGER */
export type ScoreTier = 'SAFE' | 'CAUTION' | 'RISKY' | 'DANGER';

/** Quick score result from 2-signal analysis (creator age + holder concentration) */
export interface QuickScore {
  tokenAddress: `0x${string}`;
  score: number; // 0-100
  tier: ScoreTier;
  creatorTxCount: number;
  topHolderPct: number; // 0-100
  timestamp: number;
}

/** Parsed token card data extracted from RobinPump DOM */
export interface TokenCardData {
  tokenAddress: `0x${string}`;
  creatorAddress?: `0x${string}`;
  element: HTMLElement;
  marketCapUsd?: number;
}

/** Message sent from content script to service worker requesting quick scores */
export interface QuickScoreRequest {
  action: 'score-quick';
  tokens: Array<{
    tokenAddress: `0x${string}`;
    creatorAddress?: `0x${string}`;
  }>;
}

/** Message sent from content script to service worker requesting full score */
export interface FullScoreRequest {
  action: 'score-full';
  tokenAddress: `0x${string}`;
  creatorAddress: `0x${string}`;
  poolAddress?: `0x${string}`;
  marketCapUsd?: number;
}

/** Union type for all score request messages */
export type ScoreRequest = QuickScoreRequest | FullScoreRequest;

/** Response from service worker with computed quick scores */
export interface ScoreResponse {
  scores: QuickScore[];
}
