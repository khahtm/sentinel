import type { TokenAlert } from './alert-types-and-websocket-messages';
import { db } from '../db/dexie-sentinel-database';

/**
 * Evaluate Transfer events and generate alerts for suspicious activity.
 * V1 implementation focuses on Creator Dump and Whale Exit detection.
 *
 * Future: Score Drop and Honeypot re-check require expensive RPC calls,
 * so they're deferred to v2.
 */

/**
 * Check if Transfer event indicates creator dumping tokens.
 * Critical alert if creator sells > 20% of total supply.
 */
async function checkCreatorDump(
  tokenAddress: `0x${string}`,
  from: `0x${string}`,
  value: bigint,
  totalSupply: bigint
): Promise<TokenAlert | null> {
  try {
    // Get cached score to find creator address
    const cached = await db.scores.get(tokenAddress);
    if (!cached?.score) return null;

    const creatorAddress = cached.score.creatorAddress.toLowerCase() as `0x${string}`;
    if (from.toLowerCase() !== creatorAddress) return null;

    const percentSold = Number((value * 10000n) / totalSupply) / 100;
    if (percentSold < 20) return null;

    return {
      id: `creator-dump-${tokenAddress}-${Date.now()}`,
      type: 'CREATOR_DUMP',
      severity: 'critical',
      tokenAddress,
      title: 'Creator Dumping!',
      message: `Creator sold ${percentSold.toFixed(1)}% of total supply`,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[AlertEval] Creator dump check failed:', error);
    return null;
  }
}

/**
 * Check if Transfer event indicates whale exit.
 * High alert if top-10 holder sells > 50% of their balance.
 *
 * Note: This is a simplified check. Full implementation would track
 * holder balances in real-time. For v1, we assume if a large transfer
 * occurs, it's worth alerting.
 */
async function checkWhaleExit(
  tokenAddress: `0x${string}`,
  from: `0x${string}`,
  value: bigint,
  totalSupply: bigint
): Promise<TokenAlert | null> {
  try {
    const percentSold = Number((value * 10000n) / totalSupply) / 100;

    // Consider it a whale exit if transfer is > 5% of total supply
    // (implies holder had significant position)
    if (percentSold < 5) return null;

    return {
      id: `whale-exit-${tokenAddress}-${Date.now()}`,
      type: 'WHALE_EXIT',
      severity: 'high',
      tokenAddress,
      title: 'Large Holder Selling',
      message: `Wallet sold ${percentSold.toFixed(1)}% of total supply`,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[AlertEval] Whale exit check failed:', error);
    return null;
  }
}

/**
 * Evaluate a Transfer event and return alert if suspicious activity detected.
 *
 * @param tokenAddress Token contract address
 * @param from Sender address
 * @param to Receiver address
 * @param value Transfer amount (as string to handle bigint)
 * @param totalSupply Token total supply (fetched separately)
 * @returns TokenAlert if suspicious, null otherwise
 */
export async function evaluateTransferEvent(
  tokenAddress: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  value: string,
  totalSupply: string
): Promise<TokenAlert | null> {
  const valueBigInt = BigInt(value);
  const totalSupplyBigInt = BigInt(totalSupply);

  // Check creator dump first (more critical)
  const creatorDump = await checkCreatorDump(
    tokenAddress,
    from,
    valueBigInt,
    totalSupplyBigInt
  );
  if (creatorDump) return creatorDump;

  // Check whale exit
  const whaleExit = await checkWhaleExit(
    tokenAddress,
    from,
    valueBigInt,
    totalSupplyBigInt
  );
  if (whaleExit) return whaleExit;

  return null;
}
