import { useEffect } from 'react';
import type { TokenAlert } from '../lib/alerts/alert-types-and-websocket-messages';

interface AlertToastNotificationProps {
  alert: TokenAlert;
  onDismiss: () => void;
}

/** Single toast notification for token alerts */
export function AlertToastNotification({
  alert,
  onDismiss,
}: AlertToastNotificationProps) {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const severityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    info: '#3b82f6',
  };

  const toastStyle: React.CSSProperties = {
    width: '200px',
    backgroundColor: '#fff',
    borderLeft: `4px solid ${severityColors[alert.severity]}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
    animation: 'sentinelfi-toast-slide-in 0.3s ease',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '2px 6px',
    lineHeight: '1',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#374151',
    marginBottom: '8px',
    lineHeight: '1.4',
  };

  const addressStyle: React.CSSProperties = {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#6b7280',
    marginBottom: '4px',
    wordBreak: 'break-all',
  };

  const timestampStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#9ca3af',
  };

  const truncateAddress = (addr: string): string => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <style>{`
        @keyframes sentinelfi-toast-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={toastStyle}>
        <button
          style={closeButtonStyle}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          x
        </button>
        <div style={titleStyle}>{alert.title}</div>
        <div style={messageStyle}>{alert.message}</div>
        <div style={addressStyle} title={alert.tokenAddress}>
          {truncateAddress(alert.tokenAddress)}
        </div>
        <div style={timestampStyle}>{formatTimestamp(alert.timestamp)}</div>
      </div>
    </>
  );
}
