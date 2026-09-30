import { describe, it, expect } from 'vitest';
import { parseCalculatorNumber } from '@/lib/calculations/calculator-input';
import {
  checkFHSAEligibility,
  calculateFHSAContributionRoom,
  fhsaRoomThisYear,
  illustratePreTaxContribution,
  calculateRRSPContributionRoom,
  calculateTFSARoom,
  isValidAccountType,
  getAssetLocationStrategy,
  FHSA_ANNUAL_LIMIT,
  FHSA_LIFETIME_LIMIT,
  FHSA_MAX_CARRYFORWARD,
  RRSP_CONTRIBUTION_RATE,
  RRSP_MAX_LIMIT_2025,
  TFSA_ANNUAL_LIMIT_2025,
  VALID_ACCOUNT_TYPES,
} from '@/lib/calculations/canadian-accounts';

describe('calculator number entry', () => {
  it('leaves a cleared box empty instead of writing 0 back', () => {
    expect(parseCalculatorNumber('')).toEqual({ text: '', value: 0 });
    expect(parseCalculatorNumber('0')).toEqual({ text: '0', value: 0 });
    expect(parseCalculatorNumber('500')).toEqual({ text: '500', value: 500 });
  });
});

describe('FHSA Logic', () => {
  describe('checkFHSAEligibility', () => {
    it('eligible: never owned a home, age 18+', () => {
      const result = checkFHSAEligibility(false, 32);
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('ineligible: has owned a home', () => {
      const result = checkFHSAEligibility(true, 32);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('owned a home');
    });

    it('ineligible: under 18', () => {
      const result = checkFHSAEligibility(false, 17);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('18');
    });

    it('ineligible: over 71', () => {
      const result = checkFHSAEligibility(false, 72);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('71');
    });

    it('eligible at exactly age 18', () => {
      expect(checkFHSAEligibility(false, 18).eligible).toBe(true);
    });

    it('eligible at exactly age 71', () => {
      expect(checkFHSAEligibility(false, 71).eligible).toBe(true);
    });
  });

  describe('FHSA constants', () => {
    it('annual limit is $8,000', () => {
      expect(FHSA_ANNUAL_LIMIT).toBe(8000);
    });

    it('lifetime limit is $40,000', () => {
      expect(FHSA_LIFETIME_LIMIT).toBe(40000);
    });

    it('max carryforward is $8,000', () => {
      expect(FHSA_MAX_CARRYFORWARD).toBe(8000);
    });
  });

  describe('calculateFHSAContributionRoom', () => {
    it('first year with no contributions: $8,000 room', () => {
      expect(calculateFHSAContributionRoom(1, 0)).toBe(8000);
    });

    it('second year, maxed first year: $8,000 room', () => {
      expect(calculateFHSAContributionRoom(2, 8000)).toBe(8000);
    });

    it('second year, contributed nothing: base $16k + $8k carryforward = $24k (capped at lifetime)', () => {
      // 2 years × $8k = $16k base, + $8k carryforward (capped) = $24k
      expect(calculateFHSAContributionRoom(2, 0, 8000)).toBe(24000);
    });

    it('carryforward capped at $8,000 per year', () => {
      // 3 years × $8k = $24k base, + $8k carryforward (capped from $16k unused) = $32k
      const room = calculateFHSAContributionRoom(3, 0, 16000);
      expect(room).toBe(32000);
    });

    it('lifetime cap of $40,000', () => {
      const room = calculateFHSAContributionRoom(10, 0, 8000);
      expect(room).toBeLessThanOrEqual(40000);
    });

    it('zero room after lifetime max contributed', () => {
      expect(calculateFHSAContributionRoom(5, 40000)).toBe(0);
    });

    it('partial contribution leaves correct room', () => {
      expect(calculateFHSAContributionRoom(1, 5000)).toBe(3000);
    });
  });

  describe('fhsaRoomThisYear', () => {
    it('has no room until the account is open', () => {
      expect(
        fhsaRoomThisYear({
          yearsOpen: 0,
          carryIntoThisYear: 8000,
          contributedBeforeThisYear: 0,
          contributedThisYear: 0,
        }).roomLeft,
      ).toBe(0);
    });

    it('gives a first year $8,000 and ignores carry-forward', () => {
      const picture = fhsaRoomThisYear({
        yearsOpen: 1,
        carryIntoThisYear: 8000,
        contributedBeforeThisYear: 0,
        contributedThisYear: 0,
      });
      expect(picture.carryUsed).toBe(0);
      expect(picture.roomLeft).toBe(8000);
    });

    it('adds carried room in a later year, capped at $8,000', () => {
      const picture = fhsaRoomThisYear({
        yearsOpen: 2,
        carryIntoThisYear: 20000,
        contributedBeforeThisYear: 0,
        contributedThisYear: 1000,
      });
      expect(picture.roomAtStart).toBe(16000);
      expect(picture.roomLeft).toBe(15000);
    });

    it('stops at the lifetime limit', () => {
      const picture = fhsaRoomThisYear({
        yearsOpen: 3,
        carryIntoThisYear: 8000,
        contributedBeforeThisYear: 36000,
        contributedThisYear: 0,
      });
      expect(picture.roomLeft).toBe(4000);
      expect(picture.lifetimeRemaining).toBe(4000);
    });
  });
});

describe('pre-tax contribution illustration', () => {
  it('compares RRSP, TFSA, and a qualifying FHSA withdrawal without growth', () => {
    const picture = illustratePreTaxContribution(10000, 40, 25);
    expect(picture.rrsp).toEqual({
      deposited: 10000,
      taxReducedNow: 4000,
      taxOnWithdrawal: 2500,
      leftAfterWithdrawal: 7500,
    });
    expect(picture.tfsa).toEqual({
      deposited: 6000,
      taxReducedNow: 0,
      taxOnWithdrawal: 0,
      leftAfterWithdrawal: 6000,
    });
    expect(picture.fhsaQualifying).toEqual({
      deposited: 10000,
      taxReducedNow: 4000,
      taxOnWithdrawal: 0,
      leftAfterWithdrawal: 10000,
    });
  });
});

describe('RRSP Logic', () => {
  describe('calculateRRSPContributionRoom', () => {
    it('calculates 18% of previous year income', () => {
      const room = calculateRRSPContributionRoom(95000);
      expect(room).toBeCloseTo(17100, 0);
    });

    it('caps at annual maximum', () => {
      const room = calculateRRSPContributionRoom(500000);
      expect(room).toBe(RRSP_MAX_LIMIT_2025);
    });

    it('adds unused carry-forward room', () => {
      const room = calculateRRSPContributionRoom(95000, 0, 14000);
      expect(room).toBeCloseTo(31100, 0);
    });

    it('subtracts pension adjustment', () => {
      const room = calculateRRSPContributionRoom(95000, 5000);
      expect(room).toBeCloseTo(12100, 0);
    });

    it('never goes negative', () => {
      const room = calculateRRSPContributionRoom(10000, 50000);
      expect(room).toBe(0);
    });

    it('zero income produces zero room (before carry-forward)', () => {
      expect(calculateRRSPContributionRoom(0)).toBe(0);
    });
  });

  describe('RRSP constants', () => {
    it('contribution rate is 18%', () => {
      expect(RRSP_CONTRIBUTION_RATE).toBe(0.18);
    });

    it('2025 max limit is $32,490', () => {
      expect(RRSP_MAX_LIMIT_2025).toBe(32490);
    });
  });
});

describe('TFSA Logic', () => {
  describe('calculateTFSARoom', () => {
    it('calculates cumulative room for someone eligible since 2009', () => {
      // Turned 18 in 2005 → eligible from 2009
      const room = calculateTFSARoom(2005, 0);
      expect(room).toBeGreaterThan(80000);
    });

    it('reduces room by total contributed', () => {
      const fullRoom = calculateTFSARoom(2005, 0);
      const partialRoom = calculateTFSARoom(2005, 50000);
      expect(partialRoom).toBe(fullRoom - 50000);
    });

    it('starts from year turned 18 if after TFSA inception', () => {
      // Turned 18 in 2015 — eligible from 2015
      const roomFrom2015 = calculateTFSARoom(2015, 0);
      const roomFrom2009 = calculateTFSARoom(2005, 0);
      expect(roomFrom2015).toBeLessThan(roomFrom2009);
    });

    it('never goes negative', () => {
      const room = calculateTFSARoom(2005, 999999);
      expect(room).toBe(0);
    });

    it('2025 annual limit is $7,000', () => {
      expect(TFSA_ANNUAL_LIMIT_2025).toBe(7000);
    });
  });
});

describe('Account Type Validation', () => {
  it('accepts all valid Canadian account types', () => {
    for (const type of VALID_ACCOUNT_TYPES) {
      expect(isValidAccountType(type)).toBe(true);
    }
  });

  it('rejects invalid account types', () => {
    expect(isValidAccountType('401k')).toBe(false);
    expect(isValidAccountType('IRA')).toBe(false);
    expect(isValidAccountType('Roth IRA')).toBe(false);
    expect(isValidAccountType('')).toBe(false);
  });

  it('includes all expected Canadian account types', () => {
    expect(VALID_ACCOUNT_TYPES).toContain('RRSP');
    expect(VALID_ACCOUNT_TYPES).toContain('TFSA');
    expect(VALID_ACCOUNT_TYPES).toContain('FHSA');
    expect(VALID_ACCOUNT_TYPES).toContain('RESP');
    expect(VALID_ACCOUNT_TYPES).toContain('RDSP');
    expect(VALID_ACCOUNT_TYPES).toContain('RRIF');
    expect(VALID_ACCOUNT_TYPES).toContain('non-registered');
    expect(VALID_ACCOUNT_TYPES).toContain('LIRA');
    expect(VALID_ACCOUNT_TYPES).toContain('DC-RPP');
    expect(VALID_ACCOUNT_TYPES).toContain('DB-RPP');
    expect(VALID_ACCOUNT_TYPES).toContain('Group-RRSP');
    expect(VALID_ACCOUNT_TYPES).toContain('ESOP');
    expect(VALID_ACCOUNT_TYPES).toContain('RSU');
    expect(VALID_ACCOUNT_TYPES).toContain('Joint');
    expect(VALID_ACCOUNT_TYPES).toContain('Corporate');
    expect(VALID_ACCOUNT_TYPES).toContain('Annuity');
    expect(VALID_ACCOUNT_TYPES.length).toBe(36);
  });
});

describe('Asset Location Strategy', () => {
  it('returns recommendations for RRSP, TFSA, FHSA, and non-registered', () => {
    const strategy = getAssetLocationStrategy();
    const accountTypes = strategy.map((s) => s.accountType);
    expect(accountTypes).toContain('RRSP');
    expect(accountTypes).toContain('TFSA');
    expect(accountTypes).toContain('FHSA');
    expect(accountTypes).toContain('non-registered');
  });

  it('RRSP recommendation mentions US withholding tax treaty', () => {
    const strategy = getAssetLocationStrategy();
    const rrsp = strategy.find((s) => s.accountType === 'RRSP');
    expect(rrsp?.reason).toMatch(/withholding tax/i);
  });

  it('TFSA recommendation mentions tax-free growth', () => {
    const strategy = getAssetLocationStrategy();
    const tfsa = strategy.find((s) => s.accountType === 'TFSA');
    expect(tfsa?.reason).toMatch(/tax.free/i);
  });

  it('non-registered recommendation mentions dividend tax credit', () => {
    const strategy = getAssetLocationStrategy();
    const nonReg = strategy.find((s) => s.accountType === 'non-registered');
    expect(nonReg?.reason).toMatch(/dividend tax credit/i);
  });
});
