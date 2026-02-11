import { AlertToastNotification } from './alert-toast-notification';
import type { TokenAlert } from '../lib/alerts/alert-types-and-websocket-messages';

interface ToastNotificationStackContainerProps {
  alerts: TokenAlert[];
  onDismiss: (id: string) => void;
}

/** Manages stack of toast notifications in fixed top-right position */
export function ToastNotificationStackContainer({
  alerts,
  onDismiss,
}: ToastNotificationStackContainerProps) {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 999998,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  // Show max 3 alerts, newest on top
  const visibleAlerts = alerts.slice(0, 3);

  return (
    <div style={containerStyle}>
      {visibleAlerts.map((alert) => (
        <AlertToastNotification
          key={alert.id}
          alert={alert}
          onDismiss={() => onDismiss(alert.id)}
        />
      ))}
    </div>
  );
}
