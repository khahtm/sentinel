import { getBaseClient, resetBaseClient } from '../../lib/rpc/base-client';
import { computeQuickScore } from '../../lib/scoring/quick-scorer';
import { computeFullScore } from '../../lib/scoring/full-scorer-orchestrator';
import { evaluateTransferEvent } from '../../lib/alerts/transfer-event-alert-evaluator';
import { incrementTokensScanned } from '../../lib/stats/daily-usage-stats-tracker';
import { getWatchlist } from '../../lib/db/watchlist-crud-operations';
import { STORAGE_KEYS, DEFAULT_ALCHEMY_KEY } from '../../lib/constants';
import type {
  ScoreRequest,
  QuickScoreRequest,
  FullScoreRequest,
  ScoreResponse,
  QuickScore,
} from '../../types';
import type { FullScore } from '../../types/scoring-types';
import type {
  WSMessage,
  WSEventMessage,
} from '../../lib/alerts/alert-types-and-websocket-messages';

/**
 * Handle quick score requests from content script.
 * Scores each token in parallel using viem multicall via Base RPC.
 */
async function handleQuickScore(
  tokens: QuickScoreRequest['tokens']
): Promise<ScoreResponse> {
  const client = await getBaseClient();
  const scores: QuickScore[] = [];

  // Use creator address if available, otherwise use token address as fallback
  const results = await Promise.allSettled(
    tokens.map((t) =>
      computeQuickScore(
        client,
        t.tokenAddress,
        (t.creatorAddress ?? t.tokenAddress) as `0x${string}`
      )
    )
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      scores.push(result.value);
    }
  }

  // Track stats
  await incrementTokensScanned(scores.length);

  return { scores };
}

/**
 * Handle full score request for a single token.
 * Runs comprehensive analysis across all scoring categories.
 */
async function handleFullScore(
  request: FullScoreRequest
): Promise<FullScore> {
  const client = await getBaseClient();

  const score = await computeFullScore(
    client,
    request.tokenAddress,
    request.creatorAddress,
    request.poolAddress,
    request.marketCapUsd
  );

  // Track stats
  await incrementTokensScanned(1);

  return score;
}

/**
 * Handle Transfer events from offscreen WebSocket.
 * Evaluates events and sends alerts to content script tabs.
 */
async function handleTransferEvent(message: WSEventMessage): Promise<void> {
  try {
    const { tokenAddress, from, to, value } = message.data;

    // Get total supply for percentage calculation
    const client = await getBaseClient();
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
      ],
      functionName: 'totalSupply',
    });

    // Evaluate event for alerts
    const alert = await evaluateTransferEvent(
      tokenAddress,
      from,
      to,
      value,
      totalSupply.toString()
    );

    if (alert) {
      // Send alert to all RobinPump tabs
      const tabs = await chrome.tabs.query({
        url: 'https://robinpump.fun/*',
      });

      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TOKEN_ALERT',
            alert,
          }).catch(() => {
            // Tab may not have content script loaded yet
          });
        }
      }
    }
  } catch (error) {
    console.error('[Background] Transfer event handling failed:', error);
  }
}

/**
 * Ensure offscreen document exists for WebSocket connections.
 */
async function ensureOffscreen(): Promise<void> {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    });

    if (existingContexts.length > 0) return;

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS' as chrome.offscreen.Reason],
      justification: 'WebSocket connection for monitoring token transfers',
    });
  } catch (error) {
    console.error('[Background] Failed to create offscreen document:', error);
  }
}

/**
 * Initialize WebSocket for watched tokens on extension startup.
 */
async function initializeWebSocket(): Promise<void> {
  try {
    const watchlist = await getWatchlist();
    if (watchlist.length === 0) return;

    let apiKey = DEFAULT_ALCHEMY_KEY;
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.alchemyApiKey);
      if (stored[STORAGE_KEYS.alchemyApiKey]) {
        apiKey = String(stored[STORAGE_KEYS.alchemyApiKey]);
      }
    } catch {
      // Use default key
    }

    const tokenAddresses = watchlist.map((w) => w.walletAddress);

    if (tokenAddresses.length > 0) {
      await ensureOffscreen();

      const connectMessage: WSMessage = {
        type: 'WS_CONNECT',
        apiKey,
        tokenAddresses,
      };

      await chrome.runtime.sendMessage(connectMessage);
    }
  } catch (error) {
    console.error('[Background] Failed to initialize WebSocket:', error);
  }
}

export default defineBackground(() => {
  // Reset cached RPC client when API key changes in storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.alchemyApiKey]) {
      resetBaseClient();
    }
  });

  // Initialize WebSocket on extension startup
  initializeWebSocket();

  chrome.runtime.onMessage.addListener(
    (msg: ScoreRequest | WSMessage, _sender, sendResponse) => {
      // Handle score requests
      if ('action' in msg) {
        if (msg.action === 'score-quick') {
          handleQuickScore(msg.tokens)
            .then(sendResponse)
            .catch(() => sendResponse({ scores: [] }));
          return true;
        }

        if (msg.action === 'score-full') {
          handleFullScore(msg)
            .then(sendResponse)
            .catch(() => sendResponse(null));
          return true;
        }
      }

      // Handle WebSocket events
      if ('type' in msg) {
        if (msg.type === 'WS_EVENT') {
          handleTransferEvent(msg as WSEventMessage);
        }
      }
    }
  );
});
