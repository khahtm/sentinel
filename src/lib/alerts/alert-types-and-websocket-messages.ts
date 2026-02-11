/** Alert severity levels from most to least critical */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'info';

/** Alert types for different rug-pull signals */
export type AlertType =
  | 'CREATOR_DUMP'
  | 'WHALE_EXIT'
  | 'SCORE_DROP'
  | 'HONEYPOT_DETECTED';

/** Token alert generated from on-chain events or score changes */
export interface TokenAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  tokenAddress: `0x${string}`;
  tokenName?: string;
  title: string;
  message: string;
  oldScore?: number;
  newScore?: number;
  timestamp: number;
}

/** WebSocket message types for internal communication */
export type WSMessageType =
  | 'WS_CONNECT'
  | 'WS_DISCONNECT'
  | 'WS_UPDATE_TOKENS'
  | 'WS_EVENT'
  | 'WS_ERROR';

/** Connect WebSocket to Alchemy for token monitoring */
export interface WSConnectMessage {
  type: 'WS_CONNECT';
  apiKey: string;
  tokenAddresses: `0x${string}`[];
}

/** Disconnect active WebSocket */
export interface WSDisconnectMessage {
  type: 'WS_DISCONNECT';
}

/** Update watched token addresses (reconnect with new filter) */
export interface WSUpdateTokensMessage {
  type: 'WS_UPDATE_TOKENS';
  tokenAddresses: `0x${string}`[];
}

/** Transfer event from WebSocket subscription */
export interface WSEventMessage {
  type: 'WS_EVENT';
  data: {
    tokenAddress: `0x${string}`;
    from: `0x${string}`;
    to: `0x${string}`;
    value: string; // bigint as string
    blockNumber: number;
  };
}

/** WebSocket error notification */
export interface WSErrorMessage {
  type: 'WS_ERROR';
  error: string;
}

/** Union of all WebSocket message types */
export type WSMessage =
  | WSConnectMessage
  | WSDisconnectMessage
  | WSUpdateTokensMessage
  | WSEventMessage
  | WSErrorMessage;
