import type { PicksMode } from "@/types/picks";

/** Human-readable cadence labels for UI (cron wiring in later phases). */
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
    trackedAccountsCronCadence: "Every hour",
    firehoseCronCadence: "Off",
    aggregationCronCadence: "Every hour",
    topPersonasNightly: 5,
  },
  heavy: {
    label: "Heavy — more scans",
    trackedAccountsCronCadence: "Every 30 minutes",
    firehoseCronCadence: "Every 30 minutes",
    aggregationCronCadence: "Every 30 minutes",
    topPersonasNightly: 10,
  },
};
