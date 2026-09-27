import type { PicksMode } from "@/types/picks";

/** Cadence labels shown in the picks UI. Schedules match vercel.json. */
export interface ModeConfigEntry {
  label: string;
  /** Tracks X accounts ingestion */
  trackedAccountsCronCadence: string;
  /** Broad X discovery */
  firehoseCronCadence: string;
  aggregationCronCadence: string;
  topPersonasNightly: number;
}

export const MODE_CONFIG: Record<PicksMode, ModeConfigEntry> = {
  light: {
    label: "Light — lower API use",
    trackedAccountsCronCadence: "Once each weekday",
    firehoseCronCadence: "Off",
    aggregationCronCadence: "With each scan",
    topPersonasNightly: 5,
  },
  heavy: {
    label: "Heavy — broader scan",
    trackedAccountsCronCadence: "Once each weekday",
    firehoseCronCadence: "Included in the weekday scan",
    aggregationCronCadence: "With each scan",
    topPersonasNightly: 10,
  },
};
