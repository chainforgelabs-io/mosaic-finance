import { describe, it, expect } from 'vitest';
import {
  calculateSavingsRate,
  calculateEmergencyFundMonths,
  calculateRetirementNumber,
  calculateDebtAvalanche,
  calculateDebtSnowball,
  calculateNetWorth,
  calculateMonthlyCashFlow,
  type DebtInfo,
} from '@/lib/calculations/financial';

describe('Financial Calculations', () => {
  describe('calculateSavingsRate', () => {
    it('calculates correctly for typical income and expenses', () => {
      const rate = calculateSavingsRate(95000, 4200);
      expect(rate).toBeCloseTo(46.95, 0);
    });

    it('returns 0 for zero income', () => {
      expect(calculateSavingsRate(0, 4200)).toBe(0);
    });

    it('returns 0 for negative income', () => {
      expect(calculateSavingsRate(-50000, 4200)).toBe(0);
    });

    it('caps at 100% when expenses are zero', () => {
      expect(calculateSavingsRate(95000, 0)).toBe(100);
    });

    it('returns 0 when expenses exceed income', () => {
      expect(calculateSavingsRate(40000, 5000)).toBe(0);
    });

    it('handles precise calculation for known values', () => {
      // $120,000 income = $10,000/month, $6,000 expenses = $4,000 savings = 40%
      expect(calculateSavingsRate(120000, 6000)).toBeCloseTo(40, 1);
    });
  });

  describe('calculateEmergencyFundMonths', () => {
    it('calculates months correctly', () => {
      expect(calculateEmergencyFundMonths(25200, 4200)).toBeCloseTo(6, 1);
    });

    it('returns 0 for zero expenses', () => {
      expect(calculateEmergencyFundMonths(10000, 0)).toBe(0);
    });

    it('handles partial months', () => {
      expect(calculateEmergencyFundMonths(5000, 4200)).toBeCloseTo(1.19, 1);
    });

    it('returns 0 when fund is empty', () => {
      expect(calculateEmergencyFundMonths(0, 4200)).toBe(0);
    });
  });

  describe('calculateRetirementNumber', () => {
    it('returns current savings when years = 0', () => {
      expect(calculateRetirementNumber(100000, 500, 0)).toBe(100000);
    });

    it('grows a lump sum correctly with no contributions', () => {
      // $100,000 at 6% for 30 years = ~$574,349
      const result = calculateRetirementNumber(100000, 0, 30, 0.06);
      expect(result).toBeGreaterThan(500000);
      expect(result).toBeLessThan(600000);
    });

    it('calculates future value of monthly contributions', () => {
      // $0 initial, $1000/month at 6% for 30 years ≈ $1,004,515
      const result = calculateRetirementNumber(0, 1000, 30, 0.06);
      expect(result).toBeGreaterThan(900000);
      expect(result).toBeLessThan(1100000);
    });

    it('combines lump sum and contributions', () => {
      const lumpOnly = calculateRetirementNumber(100000, 0, 30, 0.06);
      const contribOnly = calculateRetirementNumber(0, 1000, 30, 0.06);
      const combined = calculateRetirementNumber(100000, 1000, 30, 0.06);
      expect(combined).toBeCloseTo(lumpOnly + contribOnly, -2);
    });

    it('uses 6% default return rate', () => {
      const withDefault = calculateRetirementNumber(100000, 0, 10);
      const withExplicit = calculateRetirementNumber(100000, 0, 10, 0.06);
      expect(withDefault).toBe(withExplicit);
    });

    it('handles high return rates without overflow', () => {
      const result = calculateRetirementNumber(100000, 1000, 40, 0.10);
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe('calculateDebtAvalanche', () => {
    const sampleDebts: DebtInfo[] = [
      { type: 'Credit card', balance: 10000, rate: 19.99, monthly_payment: 300 },
      { type: 'Car loan', balance: 12000, rate: 5.9, monthly_payment: 350 },
      { type: 'Student loan', balance: 6500, rate: 3.5, monthly_payment: 200 },
    ];

    it('orders debts by highest interest rate first', () => {
      const result = calculateDebtAvalanche(sampleDebts);
      expect(result.order[0]).toBe('Credit card');
      expect(result.order[1]).toBe('Car loan');
      expect(result.order[2]).toBe('Student loan');
    });

    it('returns zero for empty debt list', () => {
      const result = calculateDebtAvalanche([]);
      expect(result.totalInterestPaid).toBe(0);
      expect(result.payoffMonths).toBe(0);
      expect(result.order).toEqual([]);
    });

    it('reduces payoff time with extra payments', () => {
      const withoutExtra = calculateDebtAvalanche(sampleDebts, 0);
      const withExtra = calculateDebtAvalanche(sampleDebts, 500);
      expect(withExtra.payoffMonths).toBeLessThan(withoutExtra.payoffMonths);
    });

    it('reduces total interest with extra payments', () => {
      const withoutExtra = calculateDebtAvalanche(sampleDebts, 0);
      const withExtra = calculateDebtAvalanche(sampleDebts, 500);
      expect(withExtra.totalInterestPaid).toBeLessThan(withoutExtra.totalInterestPaid);
    });

    it('calculates a reasonable payoff timeline', () => {
      const result = calculateDebtAvalanche(sampleDebts, 500);
      expect(result.payoffMonths).toBeGreaterThan(0);
      expect(result.payoffMonths).toBeLessThan(120);
    });

    it('total interest is always positive when debts exist', () => {
      const result = calculateDebtAvalanche(sampleDebts);
      expect(result.totalInterestPaid).toBeGreaterThan(0);
    });
  });

  describe('calculateDebtSnowball', () => {
    const sampleDebts: DebtInfo[] = [
      { type: 'Credit card', balance: 10000, rate: 19.99, monthly_payment: 300 },
      { type: 'Car loan', balance: 12000, rate: 5.9, monthly_payment: 350 },
      { type: 'Student loan', balance: 6500, rate: 3.5, monthly_payment: 200 },
    ];

    it('orders debts by smallest balance first', () => {
      const result = calculateDebtSnowball(sampleDebts);
      expect(result.order[0]).toBe('Student loan');
      expect(result.order[1]).toBe('Credit card');
      expect(result.order[2]).toBe('Car loan');
    });

    it('returns zero for empty debt list', () => {
      const result = calculateDebtSnowball([]);
      expect(result.totalInterestPaid).toBe(0);
      expect(result.payoffMonths).toBe(0);
    });

    it('typically costs more in interest than avalanche', () => {
      const avalanche = calculateDebtAvalanche(sampleDebts, 500);
      const snowball = calculateDebtSnowball(sampleDebts, 500);
      expect(snowball.totalInterestPaid).toBeGreaterThanOrEqual(avalanche.totalInterestPaid);
    });
  });

  describe('calculateNetWorth', () => {
    it('calculates positive net worth', () => {
      expect(calculateNetWorth(200000, 28500)).toBe(171500);
    });

    it('calculates negative net worth', () => {
      expect(calculateNetWorth(10000, 50000)).toBe(-40000);
    });

    it('returns zero when assets equal debts', () => {
      expect(calculateNetWorth(50000, 50000)).toBe(0);
    });
  });

  describe('calculateMonthlyCashFlow', () => {
    it('calculates positive cash flow', () => {
      expect(calculateMonthlyCashFlow(95000, 4200)).toBeCloseTo(3716.67, 0);
    });

    it('calculates negative cash flow when expenses exceed income', () => {
      expect(calculateMonthlyCashFlow(40000, 5000)).toBeLessThan(0);
    });

    it('returns monthly income when expenses are zero', () => {
      expect(calculateMonthlyCashFlow(120000, 0)).toBeCloseTo(10000, 0);
    });
  });
});
