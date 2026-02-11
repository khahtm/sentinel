import { TIER_COLORS } from '../lib/constants';
import type { ScoreTier } from '../types';

interface ScoreBadgeProps {
  score: number;
  tier: ScoreTier;
  loading: boolean;
  onClick?: () => void;
}

/** Inline styles for Shadow DOM isolation — no external CSS needed */
const badgeStyle = (tier: ScoreTier, clickable: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 700,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#fff',
  backgroundColor: TIER_COLORS[tier] ?? '#6b7280',
  lineHeight: '18px',
  cursor: clickable ? 'pointer' : 'default',
  userSelect: 'none',
  whiteSpace: 'nowrap',
});

const skeletonStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '60px',
  height: '22px',
  borderRadius: '12px',
  background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
  backgroundSize: '200% 100%',
  animation: 'sentinelfi-shimmer 1.5s infinite',
};

/** Animated loading skeleton displayed while score is being computed */
function LoadingSkeleton() {
  return (
    <>
      <style>{`
        @keyframes sentinelfi-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <span style={skeletonStyle} />
    </>
  );
}

/** Score badge pill showing score number + tier label with color coding */
export function ScoreBadge({ score, tier, loading, onClick }: ScoreBadgeProps) {
  if (loading) return <LoadingSkeleton />;

  return (
    <span
      style={badgeStyle(tier, !!onClick)}
      title={`SentinelFi Risk Score: ${score}/100 (${tier})`}
      onClick={onClick}
    >
      {score} {tier}
    </span>
  );
}
