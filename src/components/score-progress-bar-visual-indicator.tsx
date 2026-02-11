import { TIER_COLORS } from '../lib/constants';
import type { ScoreTier } from '../types';

interface ScoreBarVisualIndicatorProps {
  score: number;
  maxScore: number;
  tier: ScoreTier;
}

/** Small visual progress bar component showing score as a colored bar */
export function ScoreBarVisualIndicator({
  score,
  maxScore,
  tier,
}: ScoreBarVisualIndicatorProps) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const fillStyle: React.CSSProperties = {
    height: '100%',
    width: `${clampedPercentage}%`,
    backgroundColor: TIER_COLORS[tier] ?? '#6b7280',
    transition: 'width 0.3s ease',
  };

  const textStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '11px',
    fontWeight: 600,
    color: '#1f2937',
    userSelect: 'none',
  };

  return (
    <div style={containerStyle}>
      <div style={fillStyle} />
      <span style={textStyle}>
        {score.toFixed(1)} / {maxScore}
      </span>
    </div>
  );
}
