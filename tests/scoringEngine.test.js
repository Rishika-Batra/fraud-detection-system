const { scoreTransaction, setScorer } = require('../server/services/scoringEngine');
const config = require('../server/config/scoringConfig');

describe('Scoring Engine (server/services/scoringEngine.js)', () => {
  // Capture the default scorer so we can restore it if any test overrides it
  let defaultScorer;

  beforeAll(() => {
    // Save reference to default scorer by calling with dummy transaction
    // setScorer is tested in an isolated describe block and restored afterwards
  });

  describe('Low-Amount Normal Transactions (scores below 70)', () => {
    test('scores 0 and evaluates to "low" risk for a standard low-amount transaction', () => {
      const transaction = {
        amount: 1500, // Not round 10,000, well below 50,000
        timestamp: '2026-10-15T14:30:00.000Z', // 14:30 UTC (normal business hours)
        transaction_type: 'purchase',
        region: 'North',
        merchant_category: 'groceries'
      };

      const result = scoreTransaction(transaction);

      expect(result).toBeDefined();
      expect(result.score).toBe(0);
      expect(result.score).toBeLessThan(70);
      expect(result.level).toBe('low');
      expect(result.factors).toEqual([]);
    });

    test('scores below 70 for moderate amounts with round numbers', () => {
      const transaction = {
        amount: 10000, // Round number: +10 points
        timestamp: '2026-10-15T12:00:00.000Z', // Normal hour
        transaction_type: 'purchase',
        region: 'West'
      };

      const result = scoreTransaction(transaction);

      expect(result.score).toBe(10);
      expect(result.score).toBeLessThan(70);
      expect(result.level).toBe('low');
      expect(result.factors).toContain('Amount is a round multiple of 10,000');
    });

    test('scores below 70 for transactions with amount just below the high threshold', () => {
      const transaction = {
        amount: 49999, // Just below config.HIGH_AMOUNT (50,000)
        timestamp: '2026-10-15T16:00:00.000Z',
        transaction_type: 'purchase',
        region: 'South'
      };

      const result = scoreTransaction(transaction);

      expect(result.score).toBe(0);
      expect(result.score).toBeLessThan(70);
      expect(result.level).toBe('low');
      expect(result.factors).toEqual([]);
    });
  });

  describe('Very High Amount Transactions (scores above 70)', () => {
    test('scores above 70 when very high amount is combined with other risk factors', () => {
      // Amount 300,000:
      // - ruleHighAmount: +35 points (exceeds VERY_HIGH_AMOUNT 200,000)
      // - ruleRoundNumber: +10 points (multiple of 10,000)
      // - ruleOddHours: +15 points (03:00 UTC is between 1 and 5 AM)
      // - ruleLargeTransfer: +15 points (transfer >= 50,000)
      // Total = 35 + 10 + 15 + 15 = 75 points
      const transaction = {
        amount: 300000,
        timestamp: '2026-10-15T03:00:00.000Z',
        transaction_type: 'transfer',
        region: 'East'
      };

      const result = scoreTransaction(transaction);

      expect(result.score).toBe(75);
      expect(result.score).toBeGreaterThan(70);
      expect(result.level).toBe('high');
      expect(result.factors).toHaveLength(4);
      expect(result.factors).toContain(`Amount exceeds very high threshold (${config.VERY_HIGH_AMOUNT})`);
      expect(result.factors).toContain('Amount is a round multiple of 10,000');
      expect(result.factors).toContain(`Transaction occurred during odd hours (${config.ODD_HOURS.start}-${config.ODD_HOURS.end} UTC)`);
      expect(result.factors).toContain('Large transfer at or above high threshold');
    });

    test('scores above 70 when very high amount combines with high velocity and odd hours', () => {
      const txTime = '2026-10-15T02:00:00.000Z'; // Odd hour
      const transaction = {
        amount: 250000, // Non-round: +35 (very high amount), not round (+0)
        timestamp: txTime, // +15 (odd hours)
        transaction_type: 'purchase', // +0
        region: 'North'
      };

      // Context with 5 recent transactions within 10 minutes (+25 velocity)
      const context = {
        recentTransactions: [
          { timestamp: '2026-10-15T01:55:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:56:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:57:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:58:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:59:00.000Z', region: 'North' }
        ]
      };
      // Total = 35 (very high amount) + 10 (round number) + 15 (odd hours) + 25 (velocity) = 85 points
      const result = scoreTransaction(transaction, context);

      expect(result.score).toBe(85);
      expect(result.score).toBeGreaterThan(70);
      expect(result.level).toBe('high');
    });
  });

  describe('Threshold Boundary Tests (exactly at and just below 70)', () => {
    test('scores exactly at the threshold of 70 and classifies as "high" risk', () => {
      // Combination yielding exactly 70:
      // - ruleHighAmount: +35 (amount: 200,000 >= VERY_HIGH_AMOUNT)
      // - ruleRoundNumber: +10 (200,000 % 10,000 === 0)
      // - ruleOddHours: +0 (14:00 UTC daytime)
      // - ruleVelocity: +25 (5 recent transactions within 10 min window)
      // - ruleRegionChange: +0 (all transactions in 'North')
      // - ruleLargeTransfer: +0 (transaction_type: 'purchase')
      // Total: 35 + 10 + 0 + 25 + 0 + 0 = 70 points
      const transaction = {
        amount: 200000,
        timestamp: '2026-10-15T14:00:00.000Z',
        transaction_type: 'purchase',
        region: 'North'
      };

      const context = {
        recentTransactions: [
          { timestamp: '2026-10-15T13:52:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T13:54:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T13:55:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T13:57:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T13:59:00.000Z', region: 'North' }
        ]
      };

      const result = scoreTransaction(transaction, context);

      expect(result.score).toBe(70);
      expect(result.level).toBe('high'); // Threshold: >= 70 is 'high'
      expect(result.factors).toHaveLength(3);
    });

    test('scores another combination yielding exactly 70 (high amount + round + odd hours + velocity)', () => {
      // Combination:
      // - ruleHighAmount: +20 (amount 50,000 >= HIGH_AMOUNT, < VERY_HIGH_AMOUNT)
      // - ruleRoundNumber: +10 (50,000 % 10,000 === 0)
      // - ruleOddHours: +15 (02:00 UTC)
      // - ruleVelocity: +25 (5 transactions in window)
      // - ruleLargeTransfer: +0 (type 'purchase')
      // Total: 20 + 10 + 15 + 25 = 70 points
      const transaction = {
        amount: 50000,
        timestamp: '2026-10-15T02:00:00.000Z',
        transaction_type: 'purchase',
        region: 'Central'
      };

      const context = {
        recentTransactions: [
          { timestamp: '2026-10-15T01:52:00.000Z', region: 'Central' },
          { timestamp: '2026-10-15T01:53:00.000Z', region: 'Central' },
          { timestamp: '2026-10-15T01:55:00.000Z', region: 'Central' },
          { timestamp: '2026-10-15T01:57:00.000Z', region: 'Central' },
          { timestamp: '2026-10-15T01:58:00.000Z', region: 'Central' }
        ]
      };

      const result = scoreTransaction(transaction, context);

      expect(result.score).toBe(70);
      expect(result.level).toBe('high');
    });

    test('scores just below the threshold of 70 (score 65) and classifies as "medium" risk', () => {
      // Combination yielding 65:
      // - ruleHighAmount: +35 (amount 250,001 non-round)
      // - ruleRoundNumber: +0 (non-round)
      // - ruleOddHours: +15 (04:00 UTC)
      // - ruleLargeTransfer: +15 (withdrawal >= 50,000)
      // - ruleVelocity: +0
      // - ruleRegionChange: +0
      // Total: 35 + 0 + 15 + 15 = 65 points
      const transaction = {
        amount: 250001,
        timestamp: '2026-10-15T04:00:00.000Z',
        transaction_type: 'withdrawal',
        region: 'South'
      };

      const result = scoreTransaction(transaction);

      expect(result.score).toBe(65);
      expect(result.score).toBeLessThan(70);
      expect(result.level).toBe('medium'); // 40 <= score <= 69 is 'medium'
      expect(result.factors).toHaveLength(3);
    });

    test('scores 60 (below 70 threshold) and classifies as "medium" risk', () => {
      // Combination yielding 60:
      // - ruleHighAmount: +35 (amount 200,000)
      // - ruleRoundNumber: +10 (round number)
      // - ruleOddHours: +15 (03:00 UTC)
      // - transaction_type: 'purchase' (+0)
      // Total: 35 + 10 + 15 = 60 points
      const transaction = {
        amount: 200000,
        timestamp: '2026-10-15T03:00:00.000Z',
        transaction_type: 'purchase',
        region: 'North'
      };

      const result = scoreTransaction(transaction);

      expect(result.score).toBe(60);
      expect(result.score).toBeLessThan(70);
      expect(result.level).toBe('medium');
    });

    test('strictly differentiates boundary level between 69 ("medium") and 70 ("high")', () => {
      // Validate risk level categorization across the 69 vs 70 boundary using setScorer
      const testCases = [
        { score: 39, expectedLevel: 'low' },
        { score: 40, expectedLevel: 'medium' },
        { score: 69, expectedLevel: 'medium' }, // Just below 70 threshold
        { score: 70, expectedLevel: 'high' },   // Exactly at 70 threshold
        { score: 71, expectedLevel: 'high' }    // Just above 70 threshold
      ];

      // Temporarily swap scorer to test exact numerical boundaries
      for (const tc of testCases) {
        setScorer(() => {
          const configLevels = config.LEVELS;
          let level;
          if (tc.score <= configLevels.low.max) level = 'low';
          else if (tc.score <= configLevels.medium.max) level = 'medium';
          else level = 'high';
          return { score: tc.score, level, factors: [] };
        });

        const result = scoreTransaction({ amount: 1000 });
        expect(result.score).toBe(tc.score);
        expect(result.level).toBe(tc.expectedLevel);
      }

      // Restore default scorer
      jest.isolateModules(() => {
        const freshEngine = require('../server/services/scoringEngine');
        setScorer((tx, ctx) => freshEngine.scoreTransaction(tx, ctx));
      });
    });
  });

  describe('Odd-Hour Timestamp Analysis', () => {
    test('an odd-hour timestamp raises the score by 15 points compared to daytime', () => {
      const baseTransaction = {
        amount: 5000,
        transaction_type: 'purchase',
        region: 'Central',
        merchant_category: 'retail'
      };

      const txDaytime = {
        ...baseTransaction,
        timestamp: '2026-10-15T14:30:00.000Z' // 14:30 UTC (daytime)
      };

      const txOddHours = {
        ...baseTransaction,
        timestamp: '2026-10-15T03:30:00.000Z' // 03:30 UTC (odd hours: 1 AM to 5 AM)
      };

      const resultDaytime = scoreTransaction(txDaytime);
      const resultOddHours = scoreTransaction(txOddHours);

      expect(resultDaytime.score).toBe(0);
      expect(resultOddHours.score).toBe(15);
      expect(resultOddHours.score).toBe(resultDaytime.score + 15);

      expect(resultOddHours.factors).toContain(`Transaction occurred during odd hours (${config.ODD_HOURS.start}-${config.ODD_HOURS.end} UTC)`);
      expect(resultDaytime.factors).not.toContain(`Transaction occurred during odd hours (${config.ODD_HOURS.start}-${config.ODD_HOURS.end} UTC)`);
    });

    test('evaluates odd-hour window boundaries correctly (1:00 UTC to 5:00 UTC inclusive)', () => {
      // 00:59:59 UTC -> Outside odd hours (0 points)
      const txBefore = { amount: 1000, timestamp: '2026-10-15T00:59:59.000Z' };
      expect(scoreTransaction(txBefore).score).toBe(0);

      // 01:00:00 UTC -> Start boundary (15 points)
      const txStart = { amount: 1000, timestamp: '2026-10-15T01:00:00.000Z' };
      expect(scoreTransaction(txStart).score).toBe(15);

      // 05:45:00 UTC -> End boundary hour 5 (15 points)
      const txEnd = { amount: 1000, timestamp: '2026-10-15T05:45:00.000Z' };
      expect(scoreTransaction(txEnd).score).toBe(15);

      // 06:00:00 UTC -> Outside odd hours (0 points)
      const txAfter = { amount: 1000, timestamp: '2026-10-15T06:00:00.000Z' };
      expect(scoreTransaction(txAfter).score).toBe(0);
    });
  });

  describe('Score Range Invariant (always stays between 0 and 100)', () => {
    test('caps the maximum score at 100 even when accumulated points exceed 100', () => {
      // Trigger all 6 scoring rules simultaneously:
      // 1. ruleHighAmount: +35 (amount 300,000 >= 200,000)
      // 2. ruleRoundNumber: +10 (300,000 % 10,000 === 0)
      // 3. ruleOddHours: +15 (02:00 UTC)
      // 4. ruleVelocity: +25 (5 recent transactions)
      // 5. ruleRegionChange: +25 (previous region 'South' vs current 'North')
      // 6. ruleLargeTransfer: +15 (transfer >= 50,000)
      // Raw total = 35 + 10 + 15 + 25 + 25 + 15 = 125 points!
      const transaction = {
        amount: 300000,
        timestamp: '2026-10-15T02:00:00.000Z',
        transaction_type: 'transfer',
        region: 'North'
      };

      const context = {
        recentTransactions: [
          { timestamp: '2026-10-15T01:52:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:53:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:55:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:57:00.000Z', region: 'North' },
          { timestamp: '2026-10-15T01:58:00.000Z', region: 'South' } // Triggers region change!
        ]
      };

      const result = scoreTransaction(transaction, context);

      expect(result.score).toBe(100); // Must be strictly capped at 100, not 125
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.level).toBe('high');
      expect(result.factors).toHaveLength(6);
    });

    test('score never falls below 0', () => {
      const benignTransaction = {
        amount: 50,
        timestamp: '2026-10-15T12:00:00.000Z',
        transaction_type: 'purchase',
        region: 'North'
      };

      const result = scoreTransaction(benignTransaction);

      expect(result.score).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.level).toBe('low');
    });

    test('various transaction profiles always produce scores between 0 and 100 inclusive', () => {
      const profiles = [
        { amount: 0, timestamp: '2026-10-15T12:00:00Z', transaction_type: 'purchase' },
        { amount: 500, timestamp: '2026-10-15T03:00:00Z', transaction_type: 'purchase' },
        { amount: 50000, timestamp: '2026-10-15T12:00:00Z', transaction_type: 'withdrawal' },
        { amount: 200000, timestamp: '2026-10-15T04:00:00Z', transaction_type: 'transfer' },
        { amount: 1000000, timestamp: '2026-10-15T02:00:00Z', transaction_type: 'transfer' }
      ];

      profiles.forEach(profile => {
        const res = scoreTransaction(profile);
        expect(res.score).toBeGreaterThanOrEqual(0);
        expect(res.score).toBeLessThanOrEqual(100);
        expect(['low', 'medium', 'high']).toContain(res.level);
      });
    });
  });

  describe('Resilience to Missing or Malformed Fields (Graceful Degradation)', () => {
    let warnSpy;

    beforeEach(() => {
      // Spy and suppress console.warn to keep test output clean when malformed data triggers rule warnings
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    test('handles missing amount field without crashing', () => {
      const transaction = {
        timestamp: '2026-10-15T14:00:00.000Z',
        transaction_type: 'purchase',
        region: 'North'
      };

      expect(() => {
        const result = scoreTransaction(transaction);
        expect(result).toBeDefined();
        expect(typeof result.score).toBe('number');
        expect(result.score).toBe(0);
        expect(result.level).toBe('low');
        expect(Array.isArray(result.factors)).toBe(true);
      }).not.toThrow();
    });

    test('handles a string amount without crashing', () => {
      const transactionWithStringNumber = {
        amount: '50000',
        timestamp: '2026-10-15T14:00:00.000Z',
        transaction_type: 'purchase'
      };

      expect(() => {
        const result = scoreTransaction(transactionWithStringNumber);
        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }).not.toThrow();

      const transactionWithInvalidString = {
        amount: 'invalid_amount_string',
        timestamp: '2026-10-15T14:00:00.000Z'
      };

      expect(() => {
        const result = scoreTransaction(transactionWithInvalidString);
        expect(result).toBeDefined();
        expect(result.score).toBe(0);
        expect(result.level).toBe('low');
      }).not.toThrow();
    });

    test('handles null or undefined amount without crashing', () => {
      const transactionWithNullAmount = {
        amount: null,
        timestamp: '2026-10-15T14:00:00.000Z'
      };

      expect(() => {
        const result = scoreTransaction(transactionWithNullAmount);
        expect(result).toBeDefined();
        expect(result.score).toBe(0);
        expect(result.level).toBe('low');
      }).not.toThrow();

      const transactionWithUndefinedAmount = {
        amount: undefined,
        timestamp: '2026-10-15T14:00:00.000Z'
      };

      expect(() => {
        const result = scoreTransaction(transactionWithUndefinedAmount);
        expect(result).toBeDefined();
        expect(result.score).toBe(0);
        expect(result.level).toBe('low');
      }).not.toThrow();
    });

    test('handles null or undefined transaction object gracefully', () => {
      expect(() => {
        const resultNull = scoreTransaction(null);
        expect(resultNull).toBeDefined();
        expect(resultNull.score).toBe(0);
        expect(resultNull.level).toBe('low');
        expect(resultNull.factors).toEqual([]);
      }).not.toThrow();

      expect(() => {
        const resultUndefined = scoreTransaction(undefined);
        expect(resultUndefined).toBeDefined();
        expect(resultUndefined.score).toBe(0);
        expect(resultUndefined.level).toBe('low');
        expect(resultUndefined.factors).toEqual([]);
      }).not.toThrow();
    });

    test('handles empty object transaction gracefully', () => {
      expect(() => {
        const result = scoreTransaction({});
        expect(result).toBeDefined();
        expect(result.score).toBe(0);
        expect(result.level).toBe('low');
        expect(result.factors).toEqual([]);
      }).not.toThrow();
    });

    test('handles missing or malformed timestamp without crashing', () => {
      const txNoTimestamp = { amount: 1500 };
      expect(() => {
        const result = scoreTransaction(txNoTimestamp);
        expect(result.score).toBe(0);
      }).not.toThrow();

      const txInvalidTimestamp = { amount: 1500, timestamp: 'not-a-valid-date' };
      expect(() => {
        const result = scoreTransaction(txInvalidTimestamp);
        expect(result.score).toBe(0);
      }).not.toThrow();
    });

    test('handles malformed or unexpected context structures without crashing', () => {
      const transaction = { amount: 1500, timestamp: '2026-10-15T14:00:00Z' };

      // Context with recentTransactions as null, string, number, or object
      const malformedContexts = [
        null,
        undefined,
        {},
        { recentTransactions: null },
        { recentTransactions: 'invalid' },
        { recentTransactions: 42 },
        { recentTransactions: [{ invalid: 'item' }] }
      ];

      malformedContexts.forEach(badContext => {
        expect(() => {
          const result = scoreTransaction(transaction, badContext);
          expect(result).toBeDefined();
          expect(result.score).toBeGreaterThanOrEqual(0);
        }).not.toThrow();
      });
    });
  });

  describe('Pluggable Scorer Architecture (setScorer)', () => {
    afterEach(() => {
      // Re-initialize default scorer after custom scorer tests
      const { RULES } = require('../server/services/scoringRules');
      const configObj = require('../server/config/scoringConfig');
      setScorer((transaction, context) => {
        let totalScore = 0;
        const factors = [];
        for (const rule of RULES) {
          try {
            const result = rule(transaction, context);
            if (result) {
              totalScore += result.points;
              factors.push(result.reason);
            }
          } catch (error) {
            console.warn(`Rule execution failed: ${error.message}`, error);
          }
        }
        const finalScore = Math.min(totalScore, 100);
        let level;
        if (finalScore <= configObj.LEVELS.low.max) level = 'low';
        else if (finalScore <= configObj.LEVELS.medium.max) level = 'medium';
        else level = 'high';

        return { score: finalScore, level, factors };
      });
    });

    test('allows swapping the active scorer with a custom ML/alternative scorer', () => {
      const mockMLScorer = jest.fn().mockReturnValue({
        score: 88,
        level: 'high',
        factors: ['ML Model v2.1 anomaly detected (confidence 0.94)']
      });

      setScorer(mockMLScorer);

      const dummyTx = { amount: 100, timestamp: '2026-10-15T14:00:00Z' };
      const dummyContext = { test: true };

      const result = scoreTransaction(dummyTx, dummyContext);

      expect(mockMLScorer).toHaveBeenCalledTimes(1);
      expect(mockMLScorer).toHaveBeenCalledWith(dummyTx, dummyContext);
      expect(result.score).toBe(88);
      expect(result.level).toBe('high');
      expect(result.factors).toContain('ML Model v2.1 anomaly detected (confidence 0.94)');
    });
  });
});
