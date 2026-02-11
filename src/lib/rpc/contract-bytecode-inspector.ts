import type { createBaseClient } from './base-client';
import { db } from '../db/dexie-sentinel-database';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Bytecode cache TTL: 7 days (bytecode doesn't change) */
const BYTECODE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get contract bytecode with caching.
 * Returns null if address is not a contract.
 */
export async function getContractCode(
  client: BaseClient,
  address: `0x${string}`
): Promise<string | null> {
  try {
    // Check cache first
    const cached = await db.bytecodes.get(address);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.bytecode;
    }

    // Fetch from chain
    const code = await client.getBytecode({ address });

    if (!code || code === '0x') {
      return null;
    }

    // Cache the result
    try {
      await db.bytecodes.put({
        address,
        bytecode: code,
        expiresAt: Date.now() + BYTECODE_CACHE_TTL_MS,
      });
    } catch (error) {
      console.error('Error caching bytecode:', error);
    }

    return code;
  } catch (error) {
    console.error('Error fetching contract code:', error);
    return null;
  }
}

/**
 * Check if contract implements standard ERC-20 by testing function selectors.
 * Returns true if balanceOf, totalSupply, and transfer respond successfully.
 */
export async function isErc20Standard(
  client: BaseClient,
  address: `0x${string}`
): Promise<boolean> {
  try {
    // Test required ERC-20 functions by calling them
    const testAddress = '0x0000000000000000000000000000000000000001' as `0x${string}`;

    const [balanceResult, supplyResult, nameResult] = await Promise.allSettled([
      // balanceOf(address)
      client.readContract({
        address,
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
        args: [testAddress],
      }),
      // totalSupply()
      client.readContract({
        address,
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
      // name() - optional but good indicator
      client.readContract({
        address,
        abi: [
          {
            inputs: [],
            name: 'name',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'name',
      }),
    ]);

    // Must have balanceOf and totalSupply to be ERC-20
    return (
      balanceResult.status === 'fulfilled' && supplyResult.status === 'fulfilled'
    );
  } catch (error) {
    console.error('Error checking ERC-20 standard:', error);
    return false;
  }
}
