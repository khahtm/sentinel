import { wsManager } from '../../lib/alerts/alchemy-websocket-transfer-event-subscriber';
import type { WSMessage } from '../../lib/alerts/alert-types-and-websocket-messages';

/**
 * Offscreen document entry point for WebSocket subscriptions.
 * Handles WebSocket connections to Alchemy for Transfer event monitoring.
 */

console.log('[Offscreen] Initialized');

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message: WSMessage) => {
  switch (message.type) {
    case 'WS_CONNECT':
      console.log('[Offscreen] Connecting WebSocket for', message.tokenAddresses.length, 'tokens');
      wsManager.connect(message.apiKey, message.tokenAddresses);
      break;

    case 'WS_DISCONNECT':
      console.log('[Offscreen] Disconnecting WebSocket');
      wsManager.disconnect();
      break;

    case 'WS_UPDATE_TOKENS':
      console.log('[Offscreen] Updating tokens:', message.tokenAddresses.length);
      wsManager.updateTokens(message.tokenAddresses);
      break;

    default:
      // Ignore other message types
      break;
  }
});
