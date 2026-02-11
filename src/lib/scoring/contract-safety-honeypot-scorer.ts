import type { createBaseClient } from '../rpc/base-client';
import type { CategoryScore, SignalResult } from '../../types/scoring-types';
import { TIER_THRESHOLDS } from '../constants';
import type { ScoreTier } from '../../types';
import { detectHoneypot } from '../rpc/honeypot-detector-via-simulation';
import {
  getContractCode,
  isErc20Standard,
} from '../rpc/contract-bytecode-inspector';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Category weight: 15% of total score */
const CATEGORY_WEIGHT = 0.15;

/** Maximum points for this category */
const MAX_POINTS = 20;

/** Get score tier from percentage */
function getTier(percentage: number): ScoreTier {
  const score = (percentage / 100) * 100;
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Score contract safety.
 * Signals: honeypot check (-20 to 0), transfer tax (-5 to 0), ERC-20 standard (0-5), bytecode exists (0-5)
 */
export async function scoreContractSafety(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  poolAddress?: `0x${string}`
): Promise<CategoryScore> {
  const signals: SignalResult[] = [];

  try {
    // Run checks in parallel
    const [honeypotResult, bytecode, isStandard, transferEventCount] = await Promise.allSettled([
      detectHoneypot(client, tokenAddress, poolAddress),
      getContractCode(client, tokenAddress),
      isErc20Standard(client, tokenAddress),
      // Count recent Transfer events (getTransactionCount returns contract nonce, not activity)
      (async () => {
        const currentBlock = await client.getBlockNumber();
        const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;
        const logs = await client.getLogs({
          address: tokenAddress,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { type: 'address', indexed: true, name: 'from' },
              { type: 'address', indexed: true, name: 'to' },
              { type: 'uint256', indexed: false, name: 'value' },
            ],
          },
          fromBlock,
          toBlock: currentBlock,
        });
        return logs.length;
      })(),
    ]);

    // Signal 1: Honeypot check (-20 to 0 points)
    let honeypotPoints = 0;
    let honeypotDetail = 'Not checked';

    if (honeypotResult.status === 'fulfilled') {
      const result = honeypotResult.value;
      if (result.isHoneypot) {
        honeypotPoints = -12;
        honeypotDetail = result.detail;
      } else {
        honeypotPoints = 0;
        honeypotDetail = result.detail;
      }
    }

    signals.push({
      name: 'Honeypot Detection',
      points: honeypotPoints,
      maxPoints: 0,
      detail: honeypotDetail,
    });

    // Signal 2: Transfer tax (-5 to 0 points)
    // Use tax from honeypot detection
    let taxPoints = 0;
    let taxDetail = 'No tax detected';

    if (honeypotResult.status === 'fulfilled') {
      const taxPct = honeypotResult.value.taxPercent;
      if (taxPct > 20) {
        taxPoints = -3;
        taxDetail = `High tax: ${taxPct}%`;
      } else if (taxPct > 10) {
        taxPoints = -2;
        taxDetail = `Moderate tax: ${taxPct}%`;
      } else if (taxPct > 5) {
        taxPoints = -1;
        taxDetail = `Low tax: ${taxPct}%`;
      } else {
        taxDetail = `${taxPct}% tax`;
      }
    }

    signals.push({
      name: 'Transfer Tax',
      points: taxPoints,
      maxPoints: 0,
      detail: taxDetail,
    });

    // Signal 3: ERC-20 standard compliance (0-5 points)
    let standardPoints = 0;
    if (isStandard.status === 'fulfilled' && isStandard.value) {
      standardPoints = 5;
    }

    signals.push({
      name: 'ERC-20 Standard',
      points: standardPoints,
      maxPoints: 5,
      detail: standardPoints > 0 ? 'Implements ERC-20' : 'Non-standard interface',
    });

    // Signal 4: Bytecode exists (0-5 points)
    let bytecodePoints = 0;
    let bytecodeDetail = 'No bytecode found';

    if (bytecode.status === 'fulfilled' && bytecode.value) {
      bytecodePoints = 5;
      const codeLength = bytecode.value.length;
      bytecodeDetail = `Contract deployed (${Math.floor(codeLength / 2)} bytes)`;
    }

    signals.push({
      name: 'Contract Deployed',
      points: bytecodePoints,
      maxPoints: 5,
      detail: bytecodeDetail,
    });

    // Signal 5: Token transfer activity (0-5 points)
    let activityPoints = 0;
    let activityDetail = 'No activity data';
    if (transferEventCount.status === 'fulfilled') {
      const txCount = transferEventCount.value;
      if (txCount >= 200) activityPoints = 5;
      else if (txCount >= 100) activityPoints = 4;
      else if (txCount >= 30) activityPoints = 3;
      else if (txCount >= 10) activityPoints = 2;
      else if (txCount >= 1) activityPoints = 1;
      activityDetail = `${txCount} recent transfers`;
    }

    signals.push({
      name: 'Contract Activity',
      points: activityPoints,
      maxPoints: 5,
      detail: activityDetail,
    });

    // Calculate category score
    const rawScore = signals.reduce((sum, s) => sum + s.points, 0);
    const percentage = ((rawScore + 15) / (MAX_POINTS + 15)) * 100; // Offset by min possible (-12 + -3)
    const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

    return {
      name: 'Contract Safety',
      weight: CATEGORY_WEIGHT,
      rawScore,
      maxScore: MAX_POINTS,
      weightedScore,
      tier: getTier(percentage),
      signals,
    };
  } catch (error) {
    console.error('Error scoring contract safety:', error);

    return {
      name: 'Contract Safety',
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
