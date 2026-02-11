import type { CategoryScore, SignalResult } from '../../types/scoring-types';
import type { DexScreenerPair } from '../api/dexscreener-token-data-fetcher';
import { TIER_THRESHOLDS } from '../constants';
import type { ScoreTier } from '../../types';

/** Category weight: 30% of total score (strongest differentiator) */
const CATEGORY_WEIGHT = 0.3;

/** Maximum points for this category */
const MAX_POINTS = 30;

/** Get score tier from percentage */
function getTier(percentage: number): ScoreTier {
  if (percentage >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (percentage >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (percentage >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Score market activity using DexScreener data.
 * Signals: market cap (0-8), volume (0-7), liquidity (0-5), txns (0-5), price stability (0-5)
 */
export function scoreMarketActivity(
  dexData: DexScreenerPair | null,
  domMarketCapUsd?: number
): CategoryScore {
  const signals: SignalResult[] = [];

  // When no DexScreener data, use DOM-parsed market cap as sole signal
  if (!dexData) {
    return scoreFromDomData(domMarketCapUsd);
  }

  // Signal 1: Market cap / FDV (0-8 points)
  const fdv = dexData.fdv ?? 0;
  let mcapPoints = 0;
  if (fdv >= 1_000_000) mcapPoints = 8;
  else if (fdv >= 500_000) mcapPoints = 7;
  else if (fdv >= 100_000) mcapPoints = 6;
  else if (fdv >= 50_000) mcapPoints = 5;
  else if (fdv >= 10_000) mcapPoints = 4;
  else if (fdv >= 5_000) mcapPoints = 3;
  else if (fdv >= 1_000) mcapPoints = 2;
  else if (fdv > 0) mcapPoints = 1;

  signals.push({
    name: 'Market Cap',
    points: mcapPoints,
    maxPoints: 8,
    detail: fdv > 0 ? `$${formatNumber(fdv)} FDV` : 'No market cap data',
  });

  // Signal 2: 24h Volume (0-7 points)
  const vol = dexData.volume?.h24 ?? 0;
  let volPoints = 0;
  if (vol >= 100_000) volPoints = 7;
  else if (vol >= 50_000) volPoints = 6;
  else if (vol >= 10_000) volPoints = 5;
  else if (vol >= 5_000) volPoints = 4;
  else if (vol >= 1_000) volPoints = 3;
  else if (vol >= 100) volPoints = 2;
  else if (vol > 0) volPoints = 1;

  signals.push({
    name: '24h Volume',
    points: volPoints,
    maxPoints: 7,
    detail: vol > 0 ? `$${formatNumber(vol)} volume` : 'No volume',
  });

  // Signal 3: Liquidity USD (0-5 points)
  const liq = dexData.liquidity?.usd ?? 0;
  let liqPoints = 0;
  if (liq >= 50_000) liqPoints = 5;
  else if (liq >= 10_000) liqPoints = 4;
  else if (liq >= 5_000) liqPoints = 3;
  else if (liq >= 1_000) liqPoints = 2;
  else if (liq > 0) liqPoints = 1;

  signals.push({
    name: 'Liquidity',
    points: liqPoints,
    maxPoints: 5,
    detail: liq > 0 ? `$${formatNumber(liq)} liquidity` : 'No liquidity',
  });

  // Signal 4: 24h Transaction count (0-5 points)
  const buys = dexData.txns?.h24?.buys ?? 0;
  const sells = dexData.txns?.h24?.sells ?? 0;
  const totalTxns = buys + sells;
  let txnPoints = 0;
  if (totalTxns >= 500) txnPoints = 5;
  else if (totalTxns >= 200) txnPoints = 4;
  else if (totalTxns >= 50) txnPoints = 3;
  else if (totalTxns >= 10) txnPoints = 2;
  else if (totalTxns > 0) txnPoints = 1;

  signals.push({
    name: '24h Transactions',
    points: txnPoints,
    maxPoints: 5,
    detail: `${buys} buys / ${sells} sells`,
  });

  // Signal 5: Price stability (0-5 points)
  // Extreme dumps are bad, moderate movement is normal for meme tokens
  const priceChange = dexData.priceChange?.h24 ?? 0;
  const absChange = Math.abs(priceChange);
  let stabilityPoints = 0;
  if (absChange <= 10) stabilityPoints = 5;
  else if (absChange <= 25) stabilityPoints = 4;
  else if (absChange <= 50) stabilityPoints = 3;
  else if (absChange <= 75) stabilityPoints = 2;
  else if (priceChange > 0) stabilityPoints = 1; // big pump, not as bad
  // Big dump (< -75%) = 0 points

  signals.push({
    name: 'Price Stability',
    points: stabilityPoints,
    maxPoints: 5,
    detail: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}% (24h)`,
  });

  // Calculate category score
  const rawScore = signals.reduce((sum, s) => sum + s.points, 0);
  const percentage = (rawScore / MAX_POINTS) * 100;
  const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

  return {
    name: 'Market Activity',
    weight: CATEGORY_WEIGHT,
    rawScore,
    maxScore: MAX_POINTS,
    weightedScore,
    tier: getTier(percentage),
    signals,
  };
}

/**
 * Fallback scoring when DexScreener has no data.
 * Uses DOM-parsed market cap for continuous scoring (logarithmic scale).
 */
function scoreFromDomData(domMarketCapUsd?: number): CategoryScore {
  const signals: SignalResult[] = [];

  if (!domMarketCapUsd || domMarketCapUsd <= 0) {
    signals.push({
      name: 'Market Data',
      points: 0,
      maxPoints: MAX_POINTS,
      detail: 'No market data available',
    });
    return {
      name: 'Market Activity',
      weight: CATEGORY_WEIGHT,
      rawScore: 0,
      maxScore: MAX_POINTS,
      weightedScore: 0,
      tier: 'DANGER',
      signals,
    };
  }

  // Continuous logarithmic scoring based on market cap (0-30 points)
  // $100 = ~5pts, $1K = ~10pts, $10K = ~17pts, $100K = ~23pts, $1M = ~30pts
  const logScore = Math.log10(Math.max(1, domMarketCapUsd));
  const points = Math.min(MAX_POINTS, Math.round((logScore / 6) * MAX_POINTS));

  signals.push({
    name: 'Market Cap (from page)',
    points,
    maxPoints: MAX_POINTS,
    detail: `$${formatNumber(domMarketCapUsd)} market cap`,
  });

  const percentage = (points / MAX_POINTS) * 100;
  const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

  return {
    name: 'Market Activity',
    weight: CATEGORY_WEIGHT,
    rawScore: points,
    maxScore: MAX_POINTS,
    weightedScore,
    tier: getTier(percentage),
    signals,
  };
}

/** Format number with K/M/B suffixes */
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
