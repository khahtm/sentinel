import { describe, it, expect } from 'vitest';
import { computeCompositeScore, getTierFromScore } from '../weighted-score-normalizer';
import type { CategoryScore } from '../../../types/scoring-types';

describe('computeCompositeScore', () => {
  it('sums weighted scores from all categories', () => {
    const categories: CategoryScore[] = [
      {
        name: 'Creator Trust',
        weight: 0.3,
        rawScore: 20,
        maxScore: 30,
        weightedScore: 20,
        tier: 'SAFE',
        signals: [],
      },
      {
        name: 'Holder Health',
        weight: 0.25,
        rawScore: 15,
        maxScore: 25,
        weightedScore: 15,
        tier: 'CAUTION',
        signals: [],
      },
      {
        name: 'Contract Safety',
        weight: 0.2,
        rawScore: 10,
        maxScore: 20,
        weightedScore: 10,
        tier: 'SAFE',
        signals: [],
      },
    ];

    const result = computeCompositeScore(categories);
    expect(result).toBe(45);
  });

  it('clamps score to maximum 100', () => {
    const categories: CategoryScore[] = [
      {
        name: 'Test',
        weight: 0.5,
        rawScore: 100,
        maxScore: 100,
        weightedScore: 150, // Over 100
        tier: 'SAFE',
        signals: [],
      },
    ];

    const result = computeCompositeScore(categories);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('clamps score to minimum 0', () => {
    const categories: CategoryScore[] = [
      {
        name: 'Test',
        weight: 0.5,
        rawScore: -50,
        maxScore: 100,
        weightedScore: -50,
        tier: 'DANGER',
        signals: [],
      },
    ];

    const result = computeCompositeScore(categories);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('handles empty categories array', () => {
    const result = computeCompositeScore([]);
    expect(result).toBe(0);
  });

  it('rounds to nearest integer', () => {
    const categories: CategoryScore[] = [
      {
        name: 'Test',
        weight: 0.5,
        rawScore: 33,
        maxScore: 100,
        weightedScore: 33.7,
        tier: 'DANGER',
        signals: [],
      },
    ];

    const result = computeCompositeScore(categories);
    expect(result).toBe(34);
  });

  it('handles exact boundary value 50', () => {
    const categories: CategoryScore[] = [
      {
        name: 'Test',
        weight: 0.5,
        rawScore: 50,
        maxScore: 100,
        weightedScore: 50,
        tier: 'RISKY',
        signals: [],
      },
    ];

    const result = computeCompositeScore(categories);
    expect(result).toBe(50);
  });
});

describe('getTierFromScore', () => {
  it('returns SAFE for score >= 80', () => {
    expect(getTierFromScore(80)).toBe('SAFE');
    expect(getTierFromScore(90)).toBe('SAFE');
    expect(getTierFromScore(100)).toBe('SAFE');
  });

  it('returns CAUTION for score 60-79', () => {
    expect(getTierFromScore(60)).toBe('CAUTION');
    expect(getTierFromScore(70)).toBe('CAUTION');
    expect(getTierFromScore(79)).toBe('CAUTION');
  });

  it('returns RISKY for score 40-59', () => {
    expect(getTierFromScore(40)).toBe('RISKY');
    expect(getTierFromScore(50)).toBe('RISKY');
    expect(getTierFromScore(59)).toBe('RISKY');
  });

  it('returns DANGER for score 0-39', () => {
    expect(getTierFromScore(0)).toBe('DANGER');
    expect(getTierFromScore(20)).toBe('DANGER');
    expect(getTierFromScore(39)).toBe('DANGER');
  });

  it('handles exact boundary values correctly', () => {
    expect(getTierFromScore(80)).toBe('SAFE'); // SAFE lower bound
    expect(getTierFromScore(79.99)).toBe('CAUTION'); // Just below SAFE
    expect(getTierFromScore(60)).toBe('CAUTION'); // CAUTION lower bound
    expect(getTierFromScore(59.99)).toBe('RISKY'); // Just below CAUTION
    expect(getTierFromScore(40)).toBe('RISKY'); // RISKY lower bound
    expect(getTierFromScore(39.99)).toBe('DANGER'); // Just below RISKY
  });

  it('handles negative scores', () => {
    expect(getTierFromScore(-10)).toBe('DANGER');
  });

  it('handles fractional scores', () => {
    expect(getTierFromScore(85.5)).toBe('SAFE');
    expect(getTierFromScore(65.5)).toBe('CAUTION');
    expect(getTierFromScore(45.5)).toBe('RISKY');
    expect(getTierFromScore(25.5)).toBe('DANGER');
  });
});
