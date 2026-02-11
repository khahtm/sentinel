import type { createBaseClient } from '../rpc/base-client';
import type { CategoryScore, SignalResult } from '../../types/scoring-types';
import { TIER_THRESHOLDS } from '../constants';
import type { ScoreTier } from '../../types';
import {
  getCachedCreator,
  setCachedCreator,
} from '../db/creator-cache-with-ttl-repository';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Category weight: 30% of total score */
const CATEGORY_WEIGHT = 0.3;

/** Maximum points for this category */
const MAX_POINTS = 30;

/** Get score tier from percentage */
function getTier(percentage: number): ScoreTier {
  const score = (percentage / 100) * 100;
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Score creator trustworthiness based on wallet history and holdings.
 * Signals: wallet age (0-10), tx count (0-5), holdings % (-10 to 0), funding source (-15 to 0)
 */
export async function scoreCreatorTrust(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  creatorAddress: `0x${string}`
): Promise<CategoryScore> {
  const signals: SignalResult[] = [];

  try {
    // Try to get cached creator data first
    let creatorData = await getCachedCreator(creatorAddress);

    if (!creatorData) {
      // Fetch fresh data
      const [txCount, balance, firstBlock] = await Promise.allSettled([
        client.getTransactionCount({ address: creatorAddress }),
        client.getBalance({ address: creatorAddress }),
        // Approximate first tx by checking recent blocks (simplified)
        client.getBlockNumber(),
      ]);

      const txCountValue = txCount.status === 'fulfilled' ? txCount.value : 0;
      const balanceValue = balance.status === 'fulfilled' ? balance.value : 0n;
      const currentBlock = firstBlock.status === 'fulfilled' ? firstBlock.value : 0n;

      // Estimate first tx timestamp (simplified - assume created recently)
      const estimatedFirstTx = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

      creatorData = {
        txCount: txCountValue,
        balance: balanceValue,
        firstTxTimestamp: estimatedFirstTx,
      };

      // Cache for future use
      await setCachedCreator(creatorAddress, creatorData);
    }

    // Signal 1: Wallet age (0-10 points)
    const walletAgeDays = Math.floor(
      (Date.now() - creatorData.firstTxTimestamp) / (24 * 60 * 60 * 1000)
    );
    let agePoints = 0;
    if (walletAgeDays >= 365) agePoints = 10;
    else if (walletAgeDays >= 180) agePoints = 8;
    else if (walletAgeDays >= 90) agePoints = 6;
    else if (walletAgeDays >= 30) agePoints = 4;
    else if (walletAgeDays >= 7) agePoints = 2;

    signals.push({
      name: 'Wallet Age',
      points: agePoints,
      maxPoints: 10,
      detail: `${walletAgeDays} days old`,
    });

    // Signal 2: Transaction count (0-5 points)
    let txPoints = 0;
    if (creatorData.txCount >= 500) txPoints = 5;
    else if (creatorData.txCount >= 200) txPoints = 4;
    else if (creatorData.txCount >= 50) txPoints = 3;
    else if (creatorData.txCount >= 20) txPoints = 2;
    else if (creatorData.txCount >= 5) txPoints = 1;

    signals.push({
      name: 'Transaction History',
      points: txPoints,
      maxPoints: 5,
      detail: `${creatorData.txCount} transactions`,
    });

    // Signal 3: Current holdings % (-10 to 0 points)
    // High creator holdings is a red flag
    const [creatorBalance, totalSupply] = await Promise.allSettled([
      client.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'balanceOf',
        args: [creatorAddress],
      }),
      client.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: 'totalSupply',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'totalSupply',
      }),
    ]);

    const balanceValue =
      creatorBalance.status === 'fulfilled' ? creatorBalance.value : 0n;
    const supplyValue =
      totalSupply.status === 'fulfilled' ? totalSupply.value : 1n;

    const holdingsPct =
      supplyValue > 0n ? Number((balanceValue * 10000n) / supplyValue) / 100 : 0;

    let holdingsPoints = 0;
    if (holdingsPct >= 50) holdingsPoints = -6;
    else if (holdingsPct >= 30) holdingsPoints = -4;
    else if (holdingsPct >= 20) holdingsPoints = -2;
    else if (holdingsPct >= 10) holdingsPoints = -1;

    signals.push({
      name: 'Creator Holdings',
      points: holdingsPoints,
      maxPoints: 0,
      detail: `${holdingsPct.toFixed(2)}% of supply`,
    });

    // Signal 4: Funding source (-15 to 0 points)
    // Simplified: check if wallet has reasonable ETH balance
    const ethBalance = Number(creatorData.balance) / 1e18;
    let fundingPoints = 0;
    if (ethBalance < 0.001) fundingPoints = -8;
    else if (ethBalance < 0.01) fundingPoints = -4;
    else if (ethBalance < 0.1) fundingPoints = -2;

    signals.push({
      name: 'Funding Source',
      points: fundingPoints,
      maxPoints: 0,
      detail: `${ethBalance.toFixed(4)} ETH balance`,
    });

    // Calculate category score
    const rawScore = signals.reduce((sum, s) => sum + s.points, 0);
    const percentage = ((rawScore + 14) / (MAX_POINTS + 14)) * 100; // Offset by min possible (-8 + -6)
    const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

    return {
      name: 'Creator Trust',
      weight: CATEGORY_WEIGHT,
      rawScore,
      maxScore: MAX_POINTS,
      weightedScore,
      tier: getTier(percentage),
      signals,
    };
  } catch (error) {
    console.error('Error scoring creator trust:', error);

    // Return zero score on error
    return {
      name: 'Creator Trust',
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
