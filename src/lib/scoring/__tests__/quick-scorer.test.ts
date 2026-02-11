import { describe, it, expect } from 'vitest';
import { scoreCreatorAge, scoreHolderConcentration, getTier } from '../quick-scorer';

describe('scoreCreatorAge', () => {
  it('returns max score (50) for 500+ transactions', () => {
    expect(scoreCreatorAge(500)).toBe(50);
    expect(scoreCreatorAge(1000)).toBe(50);
  });

  it('returns min score (5) for <10 transactions', () => {
    expect(scoreCreatorAge(0)).toBe(5);
    expect(scoreCreatorAge(9)).toBe(5);
  });

  it('scales linearly between 10-500 tx', () => {
    const score = scoreCreatorAge(255);
    expect(score).toBeGreaterThan(5);
    expect(score).toBeLessThan(50);
  });

  it('returns 5 for exactly 10 tx', () => {
    expect(scoreCreatorAge(10)).toBe(5);
  });
});

describe('scoreHolderConcentration', () => {
  it('returns 0 for 50%+ holder concentration', () => {
    expect(scoreHolderConcentration(50)).toBe(0);
    expect(scoreHolderConcentration(100)).toBe(0);
  });

  it('returns max score (50) for <=5% concentration', () => {
    expect(scoreHolderConcentration(5)).toBe(50);
    expect(scoreHolderConcentration(0)).toBe(50);
  });

  it('scales inversely between 5-50%', () => {
    const score = scoreHolderConcentration(25);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(50);
  });
});

describe('getTier', () => {
  it('returns SAFE for score >= 80', () => {
    expect(getTier(80)).toBe('SAFE');
    expect(getTier(100)).toBe('SAFE');
  });

  it('returns CAUTION for 60-79', () => {
    expect(getTier(60)).toBe('CAUTION');
    expect(getTier(79)).toBe('CAUTION');
  });

  it('returns RISKY for 40-59', () => {
    expect(getTier(40)).toBe('RISKY');
    expect(getTier(59)).toBe('RISKY');
  });

  it('returns DANGER for 0-39', () => {
    expect(getTier(0)).toBe('DANGER');
    expect(getTier(39)).toBe('DANGER');
  });
});
