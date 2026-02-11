import { useEffect, useRef, useState } from 'react';
import { CategoryScoreBreakdownPanel } from './category-score-breakdown-panel';
import { TIER_COLORS } from '../lib/constants';
import { db } from '../lib/db/dexie-sentinel-database';
import type { FullScore } from '../types/scoring-types';

interface DetailSidebarPanelWithFullScoreBreakdownProps {
  score: FullScore | null;
  loading: boolean;
  onClose: () => void;
}

/** Main sidebar panel that slides in from right on badge click */
export function DetailSidebarPanelWithFullScoreBreakdown({
  score,
  loading,
  onClose,
}: DetailSidebarPanelWithFullScoreBreakdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [reported, setReported] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999999,
    animation: 'sentinelfi-fade-in 0.2s ease',
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '360px',
    backgroundColor: '#fff',
    boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
    overflowY: 'auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    animation: 'sentinelfi-slide-in 0.3s ease',
    zIndex: 1000000,
  };

  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px',
    zIndex: 10,
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px 8px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '8px',
  };

  const addressStyle: React.CSSProperties = {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#6b7280',
    wordBreak: 'break-all',
  };

  const contentStyle: React.CSSProperties = {
    padding: '16px',
  };

  const scoreSummaryStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '20px',
  };

  const scoreNumberStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '8px',
  };

  const tierBadgeStyle = (tier: string): React.CSSProperties => ({
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: TIER_COLORS[tier] ?? '#6b7280',
    color: '#fff',
  });

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: '#374151',
    marginBottom: '12px',
    marginTop: '20px',
  };

  const footerStyle: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    backgroundColor: '#fff',
    borderTop: '1px solid #e5e7eb',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const linkStyle: React.CSSProperties = {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
  };

  const reportButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: reported ? '#fff' : '#ef4444',
    backgroundColor: reported ? '#22c55e' : 'transparent',
    border: reported ? 'none' : '1px solid #ef4444',
    borderRadius: '6px',
    cursor: reported ? 'default' : 'pointer',
  };

  const skeletonStyle: React.CSSProperties = {
    height: '20px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    marginBottom: '12px',
    animation: 'sentinelfi-pulse 1.5s infinite',
  };

  const truncateAddress = (addr: string): string => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  const handleReportFalsePositive = async () => {
    if (!score || reported) return;

    try {
      await db.falsePositives.add({
        tokenAddress: score.tokenAddress,
        reportedAt: Date.now(),
      });
      setReported(true);
    } catch (error) {
      console.error('[Sidebar] Failed to report false positive:', error);
    }
  };

  return (
    <>
      <style>{`
        @keyframes sentinelfi-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sentinelfi-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes sentinelfi-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={overlayStyle} />

      <div ref={panelRef} style={panelStyle}>
        <div style={headerStyle}>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <div style={titleStyle}>SentinelFi Risk Score</div>
          {score && (
            <div style={addressStyle} title={score.tokenAddress}>
              {truncateAddress(score.tokenAddress)}
            </div>
          )}
        </div>

        <div style={contentStyle}>
          {loading && (
            <>
              <div style={skeletonStyle} />
              <div style={skeletonStyle} />
              <div style={skeletonStyle} />
              <div style={skeletonStyle} />
            </>
          )}

          {!loading && score && (
            <>
              <div style={scoreSummaryStyle}>
                <div style={scoreNumberStyle}>{score.score}</div>
                <span style={tierBadgeStyle(score.tier)}>{score.tier}</span>
              </div>

              <div style={sectionTitleStyle}>Category Breakdown</div>
              {score.categories.map((category, idx) => (
                <CategoryScoreBreakdownPanel
                  key={idx}
                  category={category}
                  expanded={idx === 0}
                />
              ))}
            </>
          )}
        </div>

        {score && (
          <div style={footerStyle}>
            <button
              style={reportButtonStyle}
              onClick={handleReportFalsePositive}
              disabled={reported}
            >
              {reported ? '✓ Reported' : 'Report False Positive'}
            </button>
            <a
              href={`https://basescan.org/token/${score.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              View on BaseScan →
            </a>
          </div>
        )}
      </div>
    </>
  );
}
