import type { createBaseClient } from './base-client';
import type { HolderInfo } from '../../types/scoring-types';

type BaseClient = ReturnType<typeof createBaseClient>;

/** Transfer event signature hash */
const TRANSFER_EVENT = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Fetch top token holders by analyzing Transfer events and querying balances.
 * Returns sorted list of holders with their balances and percentages.
 */
export async function fetchTopHolders(
  client: BaseClient,
  tokenAddress: `0x${string}`,
  limit: number = 10
): Promise<HolderInfo[]> {
  try {
    // Get current block for recent transfers
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > 200000n ? currentBlock - 200000n : 0n; // Last ~200k blocks (~4.5 days on Base)

    // Fetch recent Transfer events to find active holders
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

    // Collect unique holder addresses (excluding zero address)
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const holderSet = new Set<`0x${string}`>();

    for (const log of logs) {
      const to = log.topics[2];
      if (to && to !== zeroAddress) {
        // Convert topic to address format
        const address = `0x${to.slice(26)}` as `0x${string}`;
        holderSet.add(address);
      }
    }

    const holders = Array.from(holderSet);

    // If no holders found, return empty
    if (holders.length === 0) {
      return [];
    }

    // Fetch balances for all holders using multicall
    const balances = await client.multicall({
      contracts: holders.map((address) => ({
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
        args: [address],
      })),
    });

    // Also fetch total supply
    const totalSupply = await client.readContract({
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
    });

    // Build holder info list
    const holderInfos: HolderInfo[] = [];

    for (let i = 0; i < holders.length; i++) {
      const result = balances[i];
      if (result.status === 'success' && result.result > 0n) {
        const percentage =
          totalSupply > 0n
            ? Number((result.result * 10000n) / totalSupply) / 100
            : 0;

        holderInfos.push({
          address: holders[i],
          balance: result.result,
          percentage,
        });
      }
    }

    // Sort by balance descending and return top N
    holderInfos.sort((a, b) => (a.balance > b.balance ? -1 : 1));
    return holderInfos.slice(0, limit);
  } catch (error) {
    console.error('Error fetching token holders:', error);
    return [];
  }
}
