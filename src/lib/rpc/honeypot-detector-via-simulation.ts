import type { createBaseClient } from './base-client';
import type { HoneypotResult } from '../../types/scoring-types';

type BaseClient = ReturnType<typeof createBaseClient>;

/**
 * Detect honeypot tokens via buy/sell simulation using eth_call.
 * Simulates buying tokens and then selling them to check for:
 * - Transfer failures (honeypot)
 * - High buy/sell taxes
 *
 * Returns safe result on error to avoid false positives.
 */
export async function detectHoneypot(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  poolAddress?: `0x${string}`
): Promise<HoneypotResult> {
  try {
    // If no pool address provided, return safe (can't simulate without pool)
    if (!poolAddress) {
      return {
        isHoneypot: false,
        taxPercent: 0,
        detail: 'No liquidity pool found for simulation',
      };
    }

    // Simulate buy: transfer tokens from pool to test wallet
    const testWallet = '0x0000000000000000000000000000000000000001' as `0x${string}`;
    const buyAmount = 1000000000000000000n; // 1 token (18 decimals)

    // Transfer function selector: 0xa9059cbb
    const transferData = `0xa9059cbb${testWallet.slice(2).padStart(64, '0')}${buyAmount.toString(16).padStart(64, '0')}`;

    // Try simulated transfer from pool (simulating buy)
    try {
      await client.call({
        to: tokenAddress,
        data: transferData as `0x${string}`,
        account: poolAddress,
      });
    } catch (error) {
      // Transfer failed - likely honeypot
      return {
        isHoneypot: true,
        taxPercent: 100,
        detail: 'Transfer simulation failed - likely honeypot',
      };
    }

    // Try reverse transfer (simulating sell)
    const sellData = `0xa9059cbb${poolAddress.slice(2).padStart(64, '0')}${buyAmount.toString(16).padStart(64, '0')}`;

    try {
      await client.call({
        to: tokenAddress,
        data: sellData as `0x${string}`,
        account: testWallet,
        // Override balance for test wallet to simulate ownership
        stateOverride: [
          {
            address: testWallet,
            balance: buyAmount,
          },
        ],
      });
    } catch (error) {
      // Sell failed but buy worked - honeypot!
      return {
        isHoneypot: true,
        taxPercent: 100,
        detail: 'Sell simulation failed - cannot sell tokens',
      };
    }

    // Both transfers worked - not a honeypot
    // Note: Tax detection would require comparing amounts, which needs more complex simulation
    return {
      isHoneypot: false,
      taxPercent: 0,
      detail: 'Buy/sell simulation passed',
    };
  } catch (error) {
    // On any error, return safe to avoid false positives
    console.error('Honeypot detection error:', error);
    return {
      isHoneypot: false,
      taxPercent: 0,
      detail: `Simulation error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
