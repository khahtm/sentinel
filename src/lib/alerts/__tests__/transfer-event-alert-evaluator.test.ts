import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateTransferEvent } from '../transfer-event-alert-evaluator';
import { db } from '../../db/dexie-sentinel-database';
import type { CachedScore } from '../../../types/scoring-types';

// Mock the database module
vi.mock('../../db/dexie-sentinel-database', () => ({
  db: {
    scores: {
      get: vi.fn(),
    },
  },
}));

describe('Transfer Event Alert Evaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Creator Dump Detection (>20% supply)', () => {
    it('detects critical alert when creator dumps >20% of supply', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens (18 decimals)
      const transferAmount = '250000000000000000000'; // 250 tokens (25% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('CREATOR_DUMP');
      expect(alert?.severity).toBe('critical');
      expect(alert?.message).toContain('25.0%');
    });

    it('detects exactly 20% dump threshold', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '200000000000000000000'; // 200 tokens (20% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('CREATOR_DUMP');
      expect(alert?.message).toContain('20.0%');
    });

    it('ignores transfers below 20% threshold from creator', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '100000000000000000000'; // 100 tokens (10% of supply, below 20% creator dump but triggers whale exit)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      // Creator dump is not triggered (< 20%), but whale exit IS triggered (> 5%)
      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('WHALE_EXIT');
    });

    it('ignores transfers from non-creator addresses if below 5% whale threshold', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const otherAddress = '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '40000000000000000000'; // 40 tokens (4% of supply, below both thresholds)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        otherAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeNull();
    });

    it('handles case-insensitive creator address comparison', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as `0x${string}`;
      const senderAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '250000000000000000000'; // 250 tokens (25% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        senderAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('CREATOR_DUMP');
    });

    it('detects whale exit even when cached score is missing', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '250000000000000000000'; // 250 tokens (25% of supply)

      vi.mocked(db.scores.get).mockResolvedValue(undefined);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      // Creator dump cannot be checked (no cache), but whale exit still triggers
      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('WHALE_EXIT');
    });
  });

  describe('Whale Exit Detection (>5% supply)', () => {
    it('detects high alert when large holder sells >5% of supply', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const whaleAddress = '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '100000000000000000000'; // 100 tokens (10% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        whaleAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('WHALE_EXIT');
      expect(alert?.severity).toBe('high');
      expect(alert?.message).toContain('10.0%');
    });

    it('detects exactly 5% whale exit threshold', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const whaleAddress = '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '50000000000000000000'; // 50 tokens (5% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        whaleAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('WHALE_EXIT');
      expect(alert?.message).toContain('5.0%');
    });

    it('ignores transfers below 5% from non-creator', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const whaleAddress = '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '40000000000000000000'; // 40 tokens (4% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        whaleAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeNull();
    });

    it('prioritizes creator dump alert over whale exit', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '300000000000000000000'; // 300 tokens (30% of supply, triggers both alerts)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('CREATOR_DUMP');
      expect(alert?.severity).toBe('critical');
    });
  });

  describe('Edge Cases', () => {
    it('handles very small transfers with small supply', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000'; // 1000 smallest units
      const transferAmount = '30'; // 3% of supply (below both thresholds)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeNull();
    });

    it('handles very large transfers with massive supply', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const whaleAddress = '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`;
      const totalSupply = '1000000000000000000000000000'; // Huge supply
      const transferAmount = '50000000000000000000000000'; // 5% even with huge numbers

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        whaleAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('WHALE_EXIT');
    });

    it('handles zero transfer amount', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '0';

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeNull();
    });

    it('gracefully handles database errors and still checks whale exit', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '250000000000000000000'; // 250 tokens (25% of supply)

      vi.mocked(db.scores.get).mockRejectedValue(new Error('DB Error'));

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      // Creator dump check fails gracefully, but whale exit still triggers
      expect(alert).toBeTruthy();
      expect(alert?.type).toBe('WHALE_EXIT');
    });
  });

  describe('Alert Structure Validation', () => {
    it('generates properly structured CREATOR_DUMP alert', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '250000000000000000000'; // 250 tokens (25% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        creatorAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.id).toMatch(/^creator-dump-0x/);
      expect(alert?.type).toBe('CREATOR_DUMP');
      expect(alert?.severity).toBe('critical');
      expect(alert?.tokenAddress).toBe(tokenAddress);
      expect(alert?.title).toBe('Creator Dumping!');
      expect(alert?.timestamp).toBeTruthy();
    });

    it('generates properly structured WHALE_EXIT alert', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const creatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const whaleAddress = '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`;
      const totalSupply = '1000000000000000000000'; // 1000 tokens
      const transferAmount = '100000000000000000000'; // 100 tokens (10% of supply)

      const mockScore: CachedScore = {
        tokenAddress,
        score: {
          tokenAddress,
          creatorAddress,
          score: 50,
          tier: 'CAUTION',
          categories: [],
          timestamp: Date.now(),
          phase: 'quick',
        },
        expiresAt: Date.now() + 3600000,
      };

      vi.mocked(db.scores.get).mockResolvedValue(mockScore);

      const alert = await evaluateTransferEvent(
        tokenAddress,
        whaleAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
        transferAmount,
        totalSupply
      );

      expect(alert).toBeTruthy();
      expect(alert?.id).toMatch(/^whale-exit-0x/);
      expect(alert?.type).toBe('WHALE_EXIT');
      expect(alert?.severity).toBe('high');
      expect(alert?.tokenAddress).toBe(tokenAddress);
      expect(alert?.title).toBe('Large Holder Selling');
      expect(alert?.timestamp).toBeTruthy();
    });
  });
});
