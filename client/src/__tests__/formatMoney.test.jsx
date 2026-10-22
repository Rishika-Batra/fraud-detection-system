import { describe, it, expect } from 'vitest';
import { formatMoney } from '../utils/formatters';

describe('formatMoney utility', () => {
  describe('INR formatting', () => {
    it('formats INR amounts with ₹ symbol and Indian digit grouping', () => {
      expect(formatMoney(150.75, 'INR')).toBe('₹150.75');
      expect(formatMoney(2400, 'INR')).toBe('₹2,400.00');
      expect(formatMoney(100000, 'INR')).toBe('₹1,00,000.00');
      expect(formatMoney(300000, 'INR')).toBe('₹3,00,000.00');
    });

    it('handles lowercase inr', () => {
      expect(formatMoney(150.75, 'inr')).toBe('₹150.75');
    });
  });

  describe('EUR formatting', () => {
    it('formats EUR amounts with € symbol', () => {
      expect(formatMoney(500, 'EUR')).toBe('€500.00');
      expect(formatMoney(1250.5, 'EUR')).toBe('€1,250.50');
    });
  });

  describe('USD formatting', () => {
    it('formats USD amounts with $ symbol', () => {
      expect(formatMoney(85.5, 'USD')).toBe('$85.50');
      expect(formatMoney(25000, 'USD')).toBe('$25,000.00');
    });
  });

  describe('Missing currency', () => {
    it('formats number without crashing when currency is null', () => {
      expect(formatMoney(500, null)).toBe('500.00');
    });

    it('formats number without crashing when currency is undefined', () => {
      expect(formatMoney(500, undefined)).toBe('500.00');
      expect(formatMoney(500)).toBe('500.00');
    });

    it('formats number without crashing when currency is an empty string', () => {
      expect(formatMoney(500, '')).toBe('500.00');
      expect(formatMoney(500, '   ')).toBe('500.00');
    });
  });

  describe('Invalid currency code', () => {
    it('falls back to number with raw code text when currency is not 3 letters', () => {
      expect(formatMoney(500, 'INVALID')).toBe('500.00 INVALID');
      expect(formatMoney(500, '12')).toBe('500.00 12');
      expect(formatMoney(500, 'TOOLONG')).toBe('500.00 TOOLONG');
    });

    it('preserves raw currency text without crashing', () => {
      expect(formatMoney(1200.5, 'POINTS')).toBe('1,200.50 POINTS');
    });
  });

  describe('Edge cases', () => {
    it('handles string amounts properly', () => {
      expect(formatMoney('2400.00', 'INR')).toBe('₹2,400.00');
      expect(formatMoney('500.5', 'EUR')).toBe('€500.50');
    });

    it('handles zero amount', () => {
      expect(formatMoney(0, 'USD')).toBe('$0.00');
    });

    it('handles null/NaN amount safely', () => {
      expect(formatMoney(null, 'USD')).toBe('$0.00');
      expect(formatMoney('invalid-num', 'USD')).toBe('$0.00');
    });
  });
});
