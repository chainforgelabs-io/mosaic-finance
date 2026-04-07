/**
 * Province, employment, and family structure: DB (CHECK constraint) ↔ display strings used in UI.
 */

import type { NotificationPreferences } from "@/types";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  plan_ready: true,
  weekly_market: true,
  quarterly_replan: false,
};

export const PROVINCE_CODE_TO_NAME: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NT: "Northwest Territories",
  NS: "Nova Scotia",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

export const PROVINCE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCE_CODE_TO_NAME).map(([code, name]) => [name, code]),
);

export const EMPLOYMENT_DB_TO_DISPLAY: Record<string, string> = {
  employed: "Employed",
  "self-employed": "Self-Employed",
  retired: "Retired",
  student: "Student",
  other: "Other",
};

export const EMPLOYMENT_DISPLAY_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(EMPLOYMENT_DB_TO_DISPLAY).map(([db, display]) => [display, db]),
);

export const FAMILY_DB_TO_DISPLAY: Record<string, string> = {
  single: "Single",
  married: "Married",
  "common-law": "Common-Law",
  "single-parent": "Single Parent",
  family: "Family",
};

export const FAMILY_DISPLAY_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(FAMILY_DB_TO_DISPLAY).map(([db, display]) => [display, db]),
);
