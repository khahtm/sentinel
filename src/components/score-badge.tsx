import { TIER_COLORS } from '../lib/constants';
import type { ScoreTier } from '../types';

interface ScoreBadgeProps {
  score: number;
  tier: ScoreTier;
  loading: boolean;
  onClick?: () => void;
}

/** Glow color per tier for the box-shadow pulse */
const TIER_GLOW: Record<string, string> = {
  SAFE: 'rgba(34, 197, 94, 0.6)',
  CAUTION: 'rgba(234, 179, 8, 0.6)',
  RISKY: 'rgba(249, 115, 22, 0.6)',
  DANGER: 'rgba(239, 68, 68, 0.6)',
};

/** Inline styles for Shadow DOM isolation — no external CSS needed */
const badgeStyle = (tier: ScoreTier, clickable: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  borderRadius: '14px',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#fff',
  backgroundColor: TIER_COLORS[tier] ?? '#6b7280',
  boxShadow: `0 0 8px ${TIER_GLOW[tier] ?? 'rgba(107,114,128,0.5)'}`,
  lineHeight: '18px',
  cursor: clickable ? 'pointer' : 'default',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  animation: 'sentinelfi-glow 2s ease-in-out infinite',
  letterSpacing: '0.3px',
});

const skeletonStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '100px',
  height: '24px',
  borderRadius: '14px',
  background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
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

/** Score badge pill — "Sentinel · score TIER" with glow effect */
export function ScoreBadge({ score, tier, loading, onClick }: ScoreBadgeProps) {
  if (loading) return <LoadingSkeleton />;

  return (
    <>
      <style>{`
        @keyframes sentinelfi-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
      <span
        style={badgeStyle(tier, !!onClick)}
        title={`Sentinel Risk Score: ${score}/100 (${tier})`}
        onClick={onClick}
      >
        Sentinel | {score} {tier}
      </span>
    </>
  );
}
