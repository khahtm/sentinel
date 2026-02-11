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

/** Category weight: 20% of total score */
const CATEGORY_WEIGHT = 0.2;

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
    const [honeypotResult, bytecode, isStandard] = await Promise.allSettled([
      detectHoneypot(client, tokenAddress, poolAddress),
      getContractCode(client, tokenAddress),
      isErc20Standard(client, tokenAddress),
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
