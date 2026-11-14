/**
 * Shared clockwork for the marketing demos (weekly loop, Review, net worth).
 *
 * A demo is a list of keyframes over a fixed loop. Every frame is a pure
 * function of time, so a component only has to ask "what is on screen at t".
 * Each loop ends by fading the screen out and rewinding while hidden, so the
 * last frame matches the first.
 */

export const DEMO_DURATION_MS = 14_000;
/** A frame from the settled end of the loop, shown when motion is reduced. */
export const DEMO_STILL_AT_MS = 12_000;
const FADE_OUT_AT_MS = 12_800;
const REWIND_AT_MS = 13_300;

export interface DemoBaseState {
  /** Which of the three steps the caption names. */
  step: 0 | 1 | 2;
  /** True while the screen is faded out so the loop restarts unseen. */
  resetting: boolean;
}

export interface DemoKeyframe<S> {
  at: number;
  set: Partial<S>;
}

export interface DemoStep {
  label: string;
  detail: string;
}

export interface DemoTimeline<F> {
  durationMs: number;
  /** Every time the picture changes, in order. Zero is the loop restart. */
  changeTimes: readonly number[];
  frameAt(timeMs: number): F;
  /** Milliseconds from `timeMs` until the picture next changes. Always positive. */
  msUntilChange(timeMs: number): number;
}

export function createDemoTimeline<S extends DemoBaseState, F extends DemoBaseState = S>(options: {
  initial: S;
  /** The story. The closing fade and rewind are added here. */
  keyframes: DemoKeyframe<S>[];
  /** Turns the stored state into what the screen shows, e.g. computed numbers. */
  derive?: (state: S) => F;
}): DemoTimeline<F> {
  const { initial } = options;
  const derive = options.derive ?? ((state: S) => state as unknown as F);

  for (const keyframe of options.keyframes) {
    if (keyframe.at <= 0 || keyframe.at >= FADE_OUT_AT_MS) {
      throw new Error(`Demo keyframe at ${keyframe.at}ms is outside the story (0 to ${FADE_OUT_AT_MS}ms).`);
    }
  }

  const fadeOut: Partial<DemoBaseState> = { resetting: true };
  const keyframes: DemoKeyframe<S>[] = [
    ...options.keyframes,
    { at: FADE_OUT_AT_MS, set: fadeOut as Partial<S> },
    { at: REWIND_AT_MS, set: { ...initial, resetting: true } },
  ].sort((a, b) => a.at - b.at);

  const changeTimes = [0, ...new Set(keyframes.map((keyframe) => keyframe.at))];

  const wrap = (timeMs: number) => {
    const t = timeMs % DEMO_DURATION_MS;
    return t < 0 ? t + DEMO_DURATION_MS : t;
  };

  return {
    durationMs: DEMO_DURATION_MS,
    changeTimes,
    frameAt(timeMs) {
      const t = wrap(timeMs);
      let state = initial;
      for (const keyframe of keyframes) {
        if (keyframe.at > t) break;
        state = { ...state, ...keyframe.set };
      }
      return derive(state);
    },
    msUntilChange(timeMs) {
      const t = wrap(timeMs);
      const next = changeTimes.find((at) => at > t) ?? DEMO_DURATION_MS;
      return next - t;
    },
  };
}

/** Shared by every demo. */
export const DEMO_CONTROLS = {
  pause: "Pause demo",
  play: "Play demo",
} as const;
