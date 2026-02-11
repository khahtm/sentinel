interface HolderDistributionHorizontalBarChartProps {
  holders: Array<{ address: string; percentage: number }>;
}

/** Simple horizontal bar chart showing holder distribution with color gradient */
export function HolderDistributionHorizontalBarChart({
  holders,
}: HolderDistributionHorizontalBarChartProps) {
  const topHolders = holders.slice(0, 10);

  const containerStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
  };

  const holderRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  };

  const addressStyle: React.CSSProperties = {
    width: '100px',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#4b5563',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const barContainerStyle: React.CSSProperties = {
    flex: 1,
    height: '18px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  };

  const percentLabelStyle: React.CSSProperties = {
    width: '50px',
    textAlign: 'right',
    fontSize: '11px',
    fontWeight: 600,
    color: '#374151',
  };

  const getBarColor = (percentage: number): string => {
    // Green (low %) to Red (high %)
    // 0-10%: green, 10-25%: yellow, 25%+: red
    if (percentage <= 10) return '#22c55e';
    if (percentage <= 25) return '#eab308';
    return '#ef4444';
  };

  const truncateAddress = (addr: string): string => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div style={containerStyle}>
      {topHolders.map((holder, idx) => {
        const barStyle: React.CSSProperties = {
          width: `${holder.percentage}%`,
          height: '100%',
          backgroundColor: getBarColor(holder.percentage),
          transition: 'width 0.3s ease',
        };

        return (
          <div key={idx} style={holderRowStyle}>
            <span style={addressStyle} title={holder.address}>
              {truncateAddress(holder.address)}
            </span>
            <div style={barContainerStyle}>
              <div style={barStyle} />
            </div>
            <span style={percentLabelStyle}>{holder.percentage.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}
