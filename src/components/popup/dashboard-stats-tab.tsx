import { useEffect, useState } from 'react';
import { getStats, type DailyStats } from '../../lib/stats/daily-usage-stats-tracker';

/** Dashboard tab showing daily usage statistics */
export function DashboardStatsTab() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const data = await getStats();
    setStats(data);
    setLoading(false);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const statCardStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #2a2a2a',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 700,
    color: '#f3f4f6',
  };

  const skeletonStyle: React.CSSProperties = {
    height: '32px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    animation: 'sentinelfi-pulse 1.5s infinite',
  };

  const refreshButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0d0d0d',
    backgroundColor: '#34d399',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
  };

  const formatLastScan = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <>
      <style>{`
        @keyframes sentinelfi-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={containerStyle}>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Tokens Scanned</div>
          {loading ? (
            <div style={skeletonStyle} />
          ) : (
            <div style={statValueStyle}>{stats?.tokensScannedToday ?? 0}</div>
          )}
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Rugs Detected</div>
          {loading ? (
            <div style={skeletonStyle} />
          ) : (
            <div style={statValueStyle}>{stats?.rugsDetected ?? 0}</div>
          )}
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Last Scan</div>
          {loading ? (
            <div style={skeletonStyle} />
          ) : (
            <div style={statValueStyle}>
              {formatLastScan(stats?.lastScanTimestamp ?? 0)}
            </div>
          )}
        </div>

        <button style={refreshButtonStyle} onClick={loadStats}>
          Refresh Stats
        </button>
      </div>
    </>
  );
}
