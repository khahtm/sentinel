import { useState } from 'react';
import { TIER_COLORS } from '../lib/constants';
import { ScoreBarVisualIndicator } from './score-progress-bar-visual-indicator';
import type { CategoryScore } from '../types/scoring-types';

interface CategoryScoreBreakdownPanelProps {
  category: CategoryScore;
  expanded?: boolean;
}

/** Displays single scoring category with expandable signal details */
export function CategoryScoreBreakdownPanel({
  category,
  expanded = false,
}: CategoryScoreBreakdownPanelProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const containerStyle: React.CSSProperties = {
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
    marginBottom: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const titleRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
  };

  const tierBadgeStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '8px',
    backgroundColor: TIER_COLORS[category.tier] ?? '#6b7280',
    color: '#fff',
  };

  const scoreStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: '#374151',
  };

  const expandIconStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    transition: 'transform 0.2s',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
  };

  const signalListStyle: React.CSSProperties = {
    marginTop: '12px',
    paddingLeft: '8px',
    display: isExpanded ? 'block' : 'none',
  };

  const signalItemStyle: React.CSSProperties = {
    marginBottom: '8px',
    fontSize: '12px',
    color: '#4b5563',
  };

  const signalHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
    fontWeight: 600,
  };

  const signalDetailStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#6b7280',
    marginLeft: '4px',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={titleRowStyle}>
          <span style={nameStyle}>{category.name}</span>
          <span style={tierBadgeStyle}>{category.tier}</span>
        </div>
        <div style={titleRowStyle}>
          <span style={scoreStyle}>
            {category.weightedScore.toFixed(1)}
          </span>
          <span style={expandIconStyle}>▼</span>
        </div>
      </div>

      <ScoreBarVisualIndicator
        score={category.rawScore}
        maxScore={category.maxScore}
        tier={category.tier}
      />

      <div style={signalListStyle}>
        {category.signals.map((signal, idx) => (
          <div key={idx} style={signalItemStyle}>
            <div style={signalHeaderStyle}>
              <span>{signal.name}</span>
              <span>
                {signal.points}/{signal.maxPoints}
              </span>
            </div>
            <div style={signalDetailStyle}>{signal.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
