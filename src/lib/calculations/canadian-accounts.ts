export const TFSA_ANNUAL_LIMIT_2025 = 7_000;
export const TFSA_CUMULATIVE_LIMIT_2025 = 102_000;

export const FHSA_ANNUAL_LIMIT = 8_000;
export const FHSA_LIFETIME_LIMIT = 40_000;
export const FHSA_MAX_CARRYFORWARD = 8_000;

export const RRSP_CONTRIBUTION_RATE = 0.18;
export const RRSP_MAX_LIMIT_2025 = 32_490;

export interface FHSAEligibility {
  eligible: boolean;
  reason?: string;
}

export function checkFHSAEligibility(
  hasOwnedHome: boolean,
  age: number,
): FHSAEligibility {
  if (hasOwnedHome) {
    return { eligible: false, reason: 'Has previously owned a home' };
  }
  if (age < 18) {
    return { eligible: false, reason: 'Must be at least 18 years old' };
  }
  if (age > 71) {
    return { eligible: false, reason: 'Must be 71 or younger' };
  }
  return { eligible: true };
}

export function calculateFHSAContributionRoom(
  yearsOpen: number,
  totalContributed: number,
  previousUnusedRoom: number = 0,
): number {
  const baseRoom = yearsOpen * FHSA_ANNUAL_LIMIT;
  const carryforward = Math.min(previousUnusedRoom, FHSA_MAX_CARRYFORWARD);
  const totalRoom = Math.min(baseRoom + carryforward, FHSA_LIFETIME_LIMIT);
  return Math.max(0, totalRoom - totalContributed);
}

export function calculateRRSPContributionRoom(
  previousYearIncome: number,
  pensionAdjustment: number = 0,
  unusedRoom: number = 0,
): number {
  const earnedRoom = Math.min(
    previousYearIncome * RRSP_CONTRIBUTION_RATE,
    RRSP_MAX_LIMIT_2025,
  );
  return Math.max(0, earnedRoom - pensionAdjustment + unusedRoom);
}

export function calculateTFSARoom(
  yearTurnedEighteen: number,
  totalContributed: number,
): number {
  const tfsaStartYear = 2009;
  const currentYear = new Date().getFullYear();

  const limitsPerYear: Record<number, number> = {
    2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000,
    2013: 5500, 2014: 5500, 2015: 10000, 2016: 5500,
    2017: 5500, 2018: 5500, 2019: 6000, 2020: 6000,
    2021: 6000, 2022: 6000, 2023: 6500, 2024: 7000,
    2025: 7000, 2026: 7000,
  };

  const eligibleFrom = Math.max(yearTurnedEighteen, tfsaStartYear);
  let totalRoom = 0;

  for (let year = eligibleFrom; year <= currentYear; year++) {
    totalRoom += limitsPerYear[year] ?? 7000;
  }

  return Math.max(0, totalRoom - totalContributed);
}

export type AccountType =
  // Registered Personal
  | 'RRSP' | 'TFSA' | 'FHSA' | 'RESP' | 'RDSP' | 'RRIF'
  // Registered Pension Plans
  | 'DB-RPP' | 'DC-RPP' | 'Hybrid-RPP' | 'Target-Benefit'
  // Employer-Sponsored
  | 'Group-RRSP' | 'Group-TFSA' | 'DPSP' | 'EPSP' | 'PRPP' | 'VRSP' | 'SPP'
  // Employee Equity / Stock
  | 'ESOP' | 'ESPP' | 'DSPP' | 'RSU' | 'Stock-Options' | 'Phantom-Stock' | 'EOT'
  // Locked-In Accounts
  | 'LIRA' | 'LRSP' | 'RLSP' | 'LIF' | 'LRIF' | 'PRIF' | 'RLIF'
  // Non-Registered / Other
  | 'non-registered' | 'Joint' | 'Corporate' | 'In-Trust' | 'Annuity';

export const VALID_ACCOUNT_TYPES: AccountType[] = [
  'RRSP', 'TFSA', 'FHSA', 'RESP', 'RDSP', 'RRIF',
  'DB-RPP', 'DC-RPP', 'Hybrid-RPP', 'Target-Benefit',
  'Group-RRSP', 'Group-TFSA', 'DPSP', 'EPSP', 'PRPP', 'VRSP', 'SPP',
  'ESOP', 'ESPP', 'DSPP', 'RSU', 'Stock-Options', 'Phantom-Stock', 'EOT',
  'LIRA', 'LRSP', 'RLSP', 'LIF', 'LRIF', 'PRIF', 'RLIF',
  'non-registered', 'Joint', 'Corporate', 'In-Trust', 'Annuity',
];

export function isValidAccountType(type: string): type is AccountType {
  return VALID_ACCOUNT_TYPES.includes(type as AccountType);
}

export interface AssetLocationRecommendation {
  accountType: AccountType;
  holdingTypes: string[];
  reason: string;
}

export function getAssetLocationStrategy(): AssetLocationRecommendation[] {
  return [
    {
      accountType: 'RRSP',
      holdingTypes: ['US equities', 'US-listed ETFs', 'fixed income'],
      reason: 'US withholding tax exemption under Canada-US tax treaty; interest income taxed at full rate on withdrawal',
    },
    {
      accountType: 'TFSA',
      holdingTypes: ['Canadian equities', 'growth stocks', 'Canadian-listed ETFs'],
      reason: 'Growth compounds tax-free; no tax on withdrawal; maximize high-growth assets here',
    },
    {
      accountType: 'FHSA',
      holdingTypes: ['balanced ETFs', 'conservative growth'],
      reason: 'Tax-deductible contributions with tax-free withdrawal for home purchase; balance growth with preservation for near-term goal',
    },
    {
      accountType: 'non-registered',
      holdingTypes: ['Canadian dividend stocks', 'return of capital ETFs'],
      reason: 'Canadian dividends receive preferential tax treatment via dividend tax credit; return of capital defers taxation',
    },
  ];
}
