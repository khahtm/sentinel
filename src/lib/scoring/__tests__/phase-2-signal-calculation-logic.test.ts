import { describe, it, expect } from 'vitest';

/**
 * Pure function tests for signal calculation logic from Phase 2 scorers.
 * These test the signal point calculation logic extracted from:
 * - creator-trust-scorer-with-cache
 * - holder-health-distribution-scorer
 * - contract-safety-honeypot-scorer
 */

/**
 * Creator Trust: Wallet Age Signal (0-10 points)
 * Extracted from scoreCreatorTrust
 */
function calculateWalletAgePoints(walletAgeDays: number): number {
  if (walletAgeDays >= 365) return 10;
  if (walletAgeDays >= 180) return 8;
  if (walletAgeDays >= 90) return 6;
  if (walletAgeDays >= 30) return 4;
  if (walletAgeDays >= 7) return 2;
  return 0;
}

/**
 * Creator Trust: Transaction Count Signal (0-5 points)
 * Extracted from scoreCreatorTrust
 */
function calculateTxCountPoints(txCount: number): number {
  if (txCount >= 1000) return 5;
  if (txCount >= 500) return 4;
  if (txCount >= 100) return 3;
  if (txCount >= 50) return 2;
  if (txCount >= 10) return 1;
  return 0;
}

/**
 * Creator Trust: Holdings Signal (-10 to 0 points)
 * Extracted from scoreCreatorTrust
 */
function calculateHoldingsPoints(holdingsPct: number): number {
  if (holdingsPct >= 50) return -10;
  if (holdingsPct >= 30) return -7;
  if (holdingsPct >= 20) return -5;
  if (holdingsPct >= 10) return -3;
  return 0;
}

/**
 * Creator Trust: Funding Source Signal (-15 to 0 points)
 * Extracted from scoreCreatorTrust
 */
function calculateFundingPoints(ethBalance: number): number {
  if (ethBalance < 0.001) return -15;
  if (ethBalance < 0.01) return -10;
  if (ethBalance < 0.1) return -5;
  return 0;
}

/**
 * Holder Health: Top Wallet Concentration Signal (0-8 points)
 * Extracted from scoreHolderHealth
 */
function calculateTopWalletPoints(topPct: number): number {
  if (topPct < 5) return 8;
  if (topPct < 10) return 6;
  if (topPct < 20) return 4;
  if (topPct < 30) return 2;
  return 0;
}

/**
 * Holder Health: Top 10 Distribution Signal (0-7 points)
 * Extracted from scoreHolderHealth
 */
function calculateTop10Points(top10Pct: number): number {
  if (top10Pct < 30) return 7;
  if (top10Pct < 50) return 5;
  if (top10Pct < 70) return 3;
  if (top10Pct < 85) return 1;
  return 0;
}

/**
 * Holder Health: Holder Count Signal (0-5 points)
 * Extracted from scoreHolderHealth
 */
function calculateHolderCountPoints(holderCount: number): number {
  if (holderCount >= 10) return 5;
  if (holderCount >= 7) return 4;
  if (holderCount >= 5) return 3;
  if (holderCount >= 3) return 2;
  if (holderCount >= 1) return 1;
  return 0;
}

/**
 * Holder Health: Sybil Detection Signal (-10 to 0 points)
 * Extracted from scoreHolderHealth
 */
function calculateSybilPoints(
  holderCount: number,
  firstFiveBalances: number[]
): number {
  if (holderCount < 3) return 0;

  const balances = firstFiveBalances.slice(0, 5);
  const avgBalance =
    balances.reduce((a, b) => a + b, 0) / balances.length;

  const similarCount = balances.filter(
    (b) => Math.abs(b - avgBalance) / avgBalance < 0.1
  ).length;

  if (similarCount >= 4) return -10;
  if (similarCount >= 3) return -5;
  return 0;
}

/**
 * Contract Safety: Transfer Tax Signal (-5 to 0 points)
 * Extracted from scoreContractSafety
 */
function calculateTaxPoints(taxPct: number): number {
  if (taxPct > 20) return -5;
  if (taxPct > 10) return -3;
  if (taxPct > 5) return -1;
  return 0;
}

describe('Creator Trust: Wallet Age Points', () => {
  it('returns 10 points for wallet >= 365 days old', () => {
    expect(calculateWalletAgePoints(365)).toBe(10);
    expect(calculateWalletAgePoints(730)).toBe(10);
  });

  it('returns 8 points for wallet >= 180 days old', () => {
    expect(calculateWalletAgePoints(180)).toBe(8);
    expect(calculateWalletAgePoints(200)).toBe(8);
  });

  it('returns 6 points for wallet >= 90 days old', () => {
    expect(calculateWalletAgePoints(90)).toBe(6);
    expect(calculateWalletAgePoints(120)).toBe(6);
  });

  it('returns 4 points for wallet >= 30 days old', () => {
    expect(calculateWalletAgePoints(30)).toBe(4);
    expect(calculateWalletAgePoints(60)).toBe(4);
  });

  it('returns 2 points for wallet >= 7 days old', () => {
    expect(calculateWalletAgePoints(7)).toBe(2);
    expect(calculateWalletAgePoints(15)).toBe(2);
  });

  it('returns 0 points for wallet < 7 days old', () => {
    expect(calculateWalletAgePoints(0)).toBe(0);
    expect(calculateWalletAgePoints(6)).toBe(0);
  });
});

describe('Creator Trust: Transaction Count Points', () => {
  it('returns 5 points for 1000+ transactions', () => {
    expect(calculateTxCountPoints(1000)).toBe(5);
    expect(calculateTxCountPoints(5000)).toBe(5);
  });

  it('returns 4 points for 500-999 transactions', () => {
    expect(calculateTxCountPoints(500)).toBe(4);
    expect(calculateTxCountPoints(750)).toBe(4);
  });

  it('returns 3 points for 100-499 transactions', () => {
    expect(calculateTxCountPoints(100)).toBe(3);
    expect(calculateTxCountPoints(250)).toBe(3);
  });

  it('returns 2 points for 50-99 transactions', () => {
    expect(calculateTxCountPoints(50)).toBe(2);
    expect(calculateTxCountPoints(75)).toBe(2);
  });

  it('returns 1 point for 10-49 transactions', () => {
    expect(calculateTxCountPoints(10)).toBe(1);
    expect(calculateTxCountPoints(25)).toBe(1);
  });

  it('returns 0 points for < 10 transactions', () => {
    expect(calculateTxCountPoints(0)).toBe(0);
    expect(calculateTxCountPoints(9)).toBe(0);
  });
});

describe('Creator Trust: Holdings Points', () => {
  it('returns -10 points for >= 50% holdings', () => {
    expect(calculateHoldingsPoints(50)).toBe(-10);
    expect(calculateHoldingsPoints(75)).toBe(-10);
  });

  it('returns -7 points for 30-49% holdings', () => {
    expect(calculateHoldingsPoints(30)).toBe(-7);
    expect(calculateHoldingsPoints(40)).toBe(-7);
  });

  it('returns -5 points for 20-29% holdings', () => {
    expect(calculateHoldingsPoints(20)).toBe(-5);
    expect(calculateHoldingsPoints(25)).toBe(-5);
  });

  it('returns -3 points for 10-19% holdings', () => {
    expect(calculateHoldingsPoints(10)).toBe(-3);
    expect(calculateHoldingsPoints(15)).toBe(-3);
  });

  it('returns 0 points for < 10% holdings', () => {
    expect(calculateHoldingsPoints(0)).toBe(0);
    expect(calculateHoldingsPoints(9)).toBe(0);
  });
});

describe('Creator Trust: Funding Points', () => {
  it('returns -15 points for < 0.001 ETH balance', () => {
    expect(calculateFundingPoints(0)).toBe(-15);
    expect(calculateFundingPoints(0.0005)).toBe(-15);
  });

  it('returns -10 points for 0.001-0.009 ETH balance', () => {
    expect(calculateFundingPoints(0.001)).toBe(-10);
    expect(calculateFundingPoints(0.005)).toBe(-10);
  });

  it('returns -5 points for 0.01-0.099 ETH balance', () => {
    expect(calculateFundingPoints(0.01)).toBe(-5);
    expect(calculateFundingPoints(0.05)).toBe(-5);
  });

  it('returns 0 points for >= 0.1 ETH balance', () => {
    expect(calculateFundingPoints(0.1)).toBe(0);
    expect(calculateFundingPoints(1.0)).toBe(0);
  });
});

describe('Holder Health: Top Wallet Concentration Points', () => {
  it('returns 8 points for < 5% concentration', () => {
    expect(calculateTopWalletPoints(0)).toBe(8);
    expect(calculateTopWalletPoints(4.99)).toBe(8);
  });

  it('returns 6 points for 5-9% concentration', () => {
    expect(calculateTopWalletPoints(5)).toBe(6);
    expect(calculateTopWalletPoints(9.99)).toBe(6);
  });

  it('returns 4 points for 10-19% concentration', () => {
    expect(calculateTopWalletPoints(10)).toBe(4);
    expect(calculateTopWalletPoints(19.99)).toBe(4);
  });

  it('returns 2 points for 20-29% concentration', () => {
    expect(calculateTopWalletPoints(20)).toBe(2);
    expect(calculateTopWalletPoints(29.99)).toBe(2);
  });

  it('returns 0 points for >= 30% concentration', () => {
    expect(calculateTopWalletPoints(30)).toBe(0);
    expect(calculateTopWalletPoints(100)).toBe(0);
  });
});

describe('Holder Health: Top 10 Distribution Points', () => {
  it('returns 7 points for < 30% in top 10', () => {
    expect(calculateTop10Points(0)).toBe(7);
    expect(calculateTop10Points(29.99)).toBe(7);
  });

  it('returns 5 points for 30-49% in top 10', () => {
    expect(calculateTop10Points(30)).toBe(5);
    expect(calculateTop10Points(49.99)).toBe(5);
  });

  it('returns 3 points for 50-69% in top 10', () => {
    expect(calculateTop10Points(50)).toBe(3);
    expect(calculateTop10Points(69.99)).toBe(3);
  });

  it('returns 1 point for 70-84% in top 10', () => {
    expect(calculateTop10Points(70)).toBe(1);
    expect(calculateTop10Points(84.99)).toBe(1);
  });

  it('returns 0 points for >= 85% in top 10', () => {
    expect(calculateTop10Points(85)).toBe(0);
    expect(calculateTop10Points(100)).toBe(0);
  });
});

describe('Holder Health: Holder Count Points', () => {
  it('returns 5 points for >= 10 holders', () => {
    expect(calculateHolderCountPoints(10)).toBe(5);
    expect(calculateHolderCountPoints(100)).toBe(5);
  });

  it('returns 4 points for 7-9 holders', () => {
    expect(calculateHolderCountPoints(7)).toBe(4);
    expect(calculateHolderCountPoints(9)).toBe(4);
  });

  it('returns 3 points for 5-6 holders', () => {
    expect(calculateHolderCountPoints(5)).toBe(3);
    expect(calculateHolderCountPoints(6)).toBe(3);
  });

  it('returns 2 points for 3-4 holders', () => {
    expect(calculateHolderCountPoints(3)).toBe(2);
    expect(calculateHolderCountPoints(4)).toBe(2);
  });

  it('returns 1 point for 1-2 holders', () => {
    expect(calculateHolderCountPoints(1)).toBe(1);
    expect(calculateHolderCountPoints(2)).toBe(1);
  });

  it('returns 0 points for 0 holders', () => {
    expect(calculateHolderCountPoints(0)).toBe(0);
  });
});

describe('Holder Health: Sybil Detection Points', () => {
  it('returns 0 points for < 3 holders', () => {
    expect(calculateSybilPoints(1, [10, 5])).toBe(0);
    expect(calculateSybilPoints(2, [10, 5])).toBe(0);
  });

  it('returns -10 points for 4+ similar balances (within 10% of avg)', () => {
    // avg = (10 + 10 + 10 + 10 + 50) / 5 = 18
    // 10 is within 10% of 18? |10-18|/18 = 8/18 = 0.44 (NO)
    // Let's use values that ARE similar: 10, 11, 9, 10.5, 1
    // avg = 41.5/5 = 8.3
    // 10 is within 10% of 8.3? |10-8.3|/8.3 = 1.7/8.3 = 0.20 (NO, > 0.1)
    // Better: 10, 10, 10, 10, 50 -> avg = 18
    // Try: 18, 18, 18, 18, 1 -> avg = 10.6
    // 18 within 10%? |18-10.6|/10.6 = 0.698 (NO)
    // Try balances where 4+ are within 10% of avg
    // 100, 100, 100, 100, 200 -> avg = 120
    // 100 within 10%? |100-120|/120 = 0.167 (NO)
    // 100, 101, 99, 102, 200 -> avg = 120.4
    // 100: |100-120.4|/120.4 = 0.169 (NO)
    // Let's try: 10, 10.5, 9.5, 10.2, 100
    // avg = 140.2/5 = 28.04
    // 10: |10-28.04|/28.04 = 0.643 (NO)
    // Simple approach: use 4 identical and 1 different
    // 20, 20, 20, 20, 100 -> avg = 36
    // 20: |20-36|/36 = 0.44 (NO)
    // Closer values: 50, 51, 49, 52, 100 -> avg = 60.4
    // 50: |50-60.4|/60.4 = 0.172 (NO)
    // Even closer: 10, 10.8, 9.2, 10.5, 100 -> avg = 28.1
    // 10: |10-28.1|/28.1 = 0.644 (NO)
    // Fundamentally different approach needed - use very similar values
    // 50, 50, 50, 50, 51 -> avg = 50.2
    // 50: |50-50.2|/50.2 = 0.004 (YES) - 4 similar
    const balances = [50, 50, 50, 50, 51];
    expect(calculateSybilPoints(5, balances)).toBe(-10);
  });

  it('returns -5 points for 3 similar balances (within 10% of avg)', () => {
    // Need exactly 3 values within 10% of average
    // 100, 100, 100, 50, 40 -> avg = 78
    // 100: |100-78|/78 = 0.282 (NO)
    // Better: use 3 similar, 2 different
    // 45, 45, 45, 30, 100 -> avg = 53
    // 45: |45-53|/53 = 0.151 (NO)
    // Try: 80, 80, 80, 60, 100 -> avg = 80
    // 80: |80-80|/80 = 0 (YES)
    // 60: |60-80|/80 = 0.25 (NO)
    // So we'd have 3 at 80 - correct!
    const balances = [80, 80, 80, 60, 100];
    expect(calculateSybilPoints(5, balances)).toBe(-5);
  });

  it('returns 0 points for diverse balance distribution', () => {
    const balances = [100, 50, 20, 10, 5];
    expect(calculateSybilPoints(5, balances)).toBe(0);
  });

  it('handles edge case with very different balances', () => {
    const balances = [1000, 500, 200, 100, 50];
    expect(calculateSybilPoints(5, balances)).toBe(0);
  });
});

describe('Contract Safety: Transfer Tax Points', () => {
  it('returns -5 points for tax > 20%', () => {
    expect(calculateTaxPoints(21)).toBe(-5);
    expect(calculateTaxPoints(50)).toBe(-5);
  });

  it('returns -3 points for 10% < tax <= 20%', () => {
    expect(calculateTaxPoints(11)).toBe(-3);
    expect(calculateTaxPoints(20)).toBe(-3);
  });

  it('returns -1 point for 5% < tax <= 10%', () => {
    expect(calculateTaxPoints(5.1)).toBe(-1);
    expect(calculateTaxPoints(10)).toBe(-1);
  });

  it('returns 0 points for tax <= 5%', () => {
    expect(calculateTaxPoints(0)).toBe(0);
    expect(calculateTaxPoints(5)).toBe(0);
  });

  it('handles very high tax', () => {
    expect(calculateTaxPoints(100)).toBe(-5);
  });
});
