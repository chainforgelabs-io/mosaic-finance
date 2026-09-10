export type LaunchMode = "waitlist" | "live";

export function getLaunchMode(): LaunchMode {
  return process.env.NEXT_PUBLIC_LAUNCH_MODE === "live" ? "live" : "waitlist";
}

export function isLaunchLive(): boolean {
  return getLaunchMode() === "live";
}
