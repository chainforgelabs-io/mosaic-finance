export const FIXED_ASSET_CATEGORIES = [
  "real_estate",
  "vehicle",
  "land",
  "precious_metals",
  "collectibles",
  "life_insurance",
  "other",
] as const;

export type FixedAssetCategory = (typeof FIXED_ASSET_CATEGORIES)[number];

export const LIFE_INSURANCE_CASH_VALUE_NOTE =
  "Cash value only. The death benefit is coverage, not part of this asset.";
