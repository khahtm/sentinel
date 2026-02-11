import type { createBaseClient } from '../rpc/base-client';
import type { CategoryScore, SignalResult } from '../../types/scoring-types';
import { TIER_THRESHOLDS } from '../constants';
import type { ScoreTier } from '../../types';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Category weight: 10% of total score */
const CATEGORY_WEIGHT = 0.1;

/** Maximum points for this category */
const MAX_POINTS = 15;

/** Get score tier from percentage */
function getTier(percentage: number): ScoreTier {
  const score = (percentage / 100) * 100;
  if (score >= TIER_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TIER_THRESHOLDS.CAUTION) return 'CAUTION';
  if (score >= TIER_THRESHOLDS.RISKY) return 'RISKY';
  return 'DANGER';
}

/**
 * Score liquidity depth signals.
 * With pool: ETH balance (0-5), curve age (0-5), buy/sell ratio (0-5)
 * Without pool: total supply (0-5), contract code size (0-5), ETH balance (0-5)
 */
export async function scoreLiquiditySignal(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  poolAddress?: `0x${string}`
): Promise<CategoryScore> {
  const signals: SignalResult[] = [];

  try {
    if (poolAddress) {
      // --- Pool-based signals ---
      const balance = await client.getBalance({ address: poolAddress });
      const ethAmount = Number(balance) / 1e18;
      let ethPoints = 0;
      if (ethAmount >= 10) ethPoints = 5;
      else if (ethAmount >= 5) ethPoints = 4;
      else if (ethAmount >= 1) ethPoints = 3;
      else if (ethAmount >= 0.5) ethPoints = 2;
      else if (ethAmount >= 0.1) ethPoints = 1;
      signals.push({ name: 'Pool Liquidity', points: ethPoints, maxPoints: 5, detail: `${ethAmount.toFixed(4)} ETH in pool` });

      let agePoints = 0;
      let ageDetail = 'Age unknown';
      try {
        const code = await client.getBytecode({ address: poolAddress });
        if (code && code !== '0x') {
          const txCount = await client.getTransactionCount({ address: poolAddress });
          if (txCount >= 1000) agePoints = 5;
          else if (txCount >= 500) agePoints = 4;
          else if (txCount >= 100) agePoints = 3;
          else if (txCount >= 50) agePoints = 2;
          else if (txCount >= 10) agePoints = 1;
          ageDetail = `${txCount} pool transactions`;
        }
      } catch {
        ageDetail = 'Pool check failed';
      }
      signals.push({ name: 'Curve Age', points: agePoints, maxPoints: 5, detail: ageDetail });

      let ratioPoints = 0;
      const tokenBalance = await client.getBalance({ address: tokenAddress });
      const tokenEth = Number(tokenBalance) / 1e18;
      if (tokenEth >= 1) ratioPoints = 5;
      else if (tokenEth >= 0.5) ratioPoints = 4;
      else if (tokenEth >= 0.1) ratioPoints = 3;
      else if (tokenEth >= 0.01) ratioPoints = 2;
      else if (tokenEth >= 0.001) ratioPoints = 1;
      signals.push({ name: 'Activity Level', points: ratioPoints, maxPoints: 5, detail: `${tokenEth.toFixed(4)} ETH in contract` });
    } else {
      // --- No pool: use token-specific data ---
      const [supplyResult, codeResult, balanceResult] = await Promise.allSettled([
        client.readContract({
          address: tokenAddress,
          abi: [{
            inputs: [],
            name: 'totalSupply',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          }] as const,
          functionName: 'totalSupply',
        }),
        client.getBytecode({ address: tokenAddress }),
        client.getBalance({ address: tokenAddress }),
      ]);

      // Signal 1: Total supply magnitude (0-5)
      let supplyPoints = 0;
      let supplyDetail = 'Supply unknown';
      if (supplyResult.status === 'fulfilled') {
        const raw = supplyResult.value as bigint;
        const supply = Number(raw / (10n ** 18n));
        if (supply > 0 && supply <= 1_000_000_000) {
          supplyPoints = 5;
          supplyDetail = `Supply: ${supply.toLocaleString()}`;
        } else if (supply > 0 && supply <= 100_000_000_000) {
          supplyPoints = 3;
          supplyDetail = `Large supply: ${supply.toLocaleString()}`;
        } else if (supply > 0) {
          supplyPoints = 1;
          supplyDetail = `Very large supply: ${supply.toLocaleString()}`;
        }
      }
      signals.push({ name: 'Token Supply', points: supplyPoints, maxPoints: 5, detail: supplyDetail });

      // Signal 2: Contract code complexity (0-5)
      let codePoints = 0;
      let codeDetail = 'No bytecode';
      if (codeResult.status === 'fulfilled' && codeResult.value) {
        const codeSize = Math.floor(codeResult.value.length / 2);
        if (codeSize >= 5000) codePoints = 5;
        else if (codeSize >= 3000) codePoints = 4;
        else if (codeSize >= 1000) codePoints = 3;
        else if (codeSize >= 500) codePoints = 2;
        else if (codeSize > 0) codePoints = 1;
        codeDetail = `Contract: ${codeSize} bytes`;
      }
      signals.push({ name: 'Code Complexity', points: codePoints, maxPoints: 5, detail: codeDetail });

      // Signal 3: Token contract ETH balance (0-5)
      let ethPoints = 0;
      let ethDetail = '0 ETH in contract';
      if (balanceResult.status === 'fulfilled') {
        const ethAmount = Number(balanceResult.value) / 1e18;
        if (ethAmount >= 1) ethPoints = 5;
        else if (ethAmount >= 0.5) ethPoints = 4;
        else if (ethAmount >= 0.1) ethPoints = 3;
        else if (ethAmount >= 0.01) ethPoints = 2;
        else if (ethAmount >= 0.001) ethPoints = 1;
        ethDetail = `${ethAmount.toFixed(6)} ETH in contract`;
      }
      signals.push({ name: 'Contract Balance', points: ethPoints, maxPoints: 5, detail: ethDetail });
    }

    // Calculate category score
    const rawScore = signals.reduce((sum, s) => sum + s.points, 0);
    const percentage = (rawScore / MAX_POINTS) * 100;
    const weightedScore = (percentage / 100) * CATEGORY_WEIGHT * 100;

    return {
      name: 'Liquidity Signals',
      weight: CATEGORY_WEIGHT,
      rawScore,
      maxScore: MAX_POINTS,
      weightedScore,
      tier: getTier(percentage),
      signals,
    };
  } catch (error) {
    console.error('Error scoring liquidity signals:', error);

    return {
      name: 'Liquidity Signals',
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
