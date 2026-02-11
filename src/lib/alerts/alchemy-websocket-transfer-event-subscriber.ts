import type { WSEventMessage } from './alert-types-and-websocket-messages';

/** ERC20 Transfer event signature for filtering */
const TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/** Exponential backoff config for reconnection */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/**
 * WebSocket manager for subscribing to Transfer events via Alchemy WSS.
 * Used by offscreen document to relay events to service worker.
 */
export class WebSocketTransferEventManager {
  private ws: WebSocket | null = null;
  private apiKey: string = '';
  private tokenAddresses: `0x${string}`[] = [];
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private subscriptionId: string | null = null;

  /**
   * Connect to Alchemy WebSocket and subscribe to Transfer events for tokens.
   * @param apiKey Alchemy API key
   * @param tokenAddresses Token contract addresses to monitor
   */
  connect(apiKey: string, tokenAddresses: `0x${string}`[]): void {
    this.apiKey = apiKey;
    this.tokenAddresses = tokenAddresses;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  /** Disconnect active WebSocket and cancel reconnect attempts */
  disconnect(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptionId = null;
  }

  /**
   * Update watched token addresses (disconnect and reconnect with new filter).
   * @param newAddresses New list of token addresses to monitor
   */
  updateTokens(newAddresses: `0x${string}`[]): void {
    this.tokenAddresses = newAddresses;
    this.disconnect();
    this.connect(this.apiKey, newAddresses);
  }

  /** Create WebSocket connection to Alchemy */
  private createConnection(): void {
    try {
      const wsUrl = `wss://base-mainnet.g.alchemy.com/v2/${this.apiKey}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected to Alchemy');
        this.reconnectAttempts = 0;
        this.subscribeToTransfers();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.sendErrorToServiceWorker('WebSocket connection error');
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.subscriptionId = null;
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[WS] Failed to create connection:', error);
      this.scheduleReconnect();
    }
  }

  /** Subscribe to Transfer events for all watched tokens */
  private subscribeToTransfers(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subscribeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          address: this.tokenAddresses,
          topics: [TRANSFER_EVENT_TOPIC],
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeRequest));
  }

  /** Handle incoming WebSocket messages */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Subscription confirmation
      if (message.result && !message.params) {
        this.subscriptionId = message.result;
        console.log('[WS] Subscribed with ID:', this.subscriptionId);
        return;
      }

      // Transfer event notification
      if (message.params?.result) {
        const log = message.params.result;
        this.processTransferEvent(log);
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }

  /** Decode Transfer event and relay to service worker */
  private processTransferEvent(log: any): void {
    try {
      const tokenAddress = log.address?.toLowerCase() as `0x${string}`;
      const topics = log.topics || [];
      const data = log.data || '0x';

      // Transfer(from, to, value) — topics[1]=from, topics[2]=to, data=value
      if (topics.length < 3) return;

      const from = `0x${topics[1].slice(26)}`.toLowerCase() as `0x${string}`;
      const to = `0x${topics[2].slice(26)}`.toLowerCase() as `0x${string}`;
      const value = BigInt(data).toString();
      const blockNumber = parseInt(log.blockNumber || '0x0', 16);

      const eventMessage: WSEventMessage = {
        type: 'WS_EVENT',
        data: {
          tokenAddress,
          from,
          to,
          value,
          blockNumber,
        },
      };

      // Relay to service worker
      chrome.runtime.sendMessage(eventMessage).catch((err) => {
        console.error('[WS] Failed to relay event to SW:', err);
      });
    } catch (error) {
      console.error('[WS] Failed to process transfer event:', error);
    }
  }

  /** Schedule reconnect with exponential backoff */
  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_MS
    );

    this.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.createConnection();
    }, delay) as unknown as number;
  }

  /** Send error notification to service worker */
  private sendErrorToServiceWorker(error: string): void {
    chrome.runtime
      .sendMessage({
        type: 'WS_ERROR',
        error,
      })
      .catch((err) => {
        console.error('[WS] Failed to send error to SW:', err);
      });
  }
}

/** Singleton instance for offscreen document */
export const wsManager = new WebSocketTransferEventManager();
