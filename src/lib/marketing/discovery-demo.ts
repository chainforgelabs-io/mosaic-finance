import {
  createDemoTimeline,
  type DemoBaseState,
  type DemoKeyframe,
  type DemoStep,
} from "@/lib/marketing/demo-timeline";
import { REVIEW_DEMO } from "@/lib/marketing/review-demo";
import { formatMoney } from "@/lib/tracking/format";

/**
 * The discovery demo: a shortened chat with Charlie that ends on the monthly
 * picture Charlie heard, ready to confirm.
 *
 * The conversation is made up. The monthly figures are the plan the Review
 * demo measures the month against, so the four demos describe one household.
 *
 * Compliance: Charlie is "your AI money guide" and only asks questions here.
 * Nothing in the chat explains options, recommends anything, or promises a
 * result. These lines are an illustration, not the prompt Charlie runs on.
 */

function planned(kind: "income" | "expenses" | "savings"): number {
  const amount = REVIEW_DEMO[kind].totals.budget;
  if (amount == null) throw new Error(`Review demo has no planned ${kind}.`);
  return amount;
}

/** The monthly picture on the confirmation card. */
export const DISCOVERY_DEMO_SUMMARY = {
  income: planned("income"),
  expenses: planned("expenses"),
  savings: planned("savings"),
} as const;

export interface DiscoveryDemoWord {
  text: string;
  /** The question itself is bold, as it is in the app. */
  bold: boolean;
}

export type DiscoveryDemoItem =
  | { kind: "charlie"; words: readonly DiscoveryDemoWord[] }
  | { kind: "user"; text: string }
  /** Marks where the illustration skips part of the conversation. */
  | { kind: "gap"; text: string }
  /** The card that reads the monthly picture back. */
  | { kind: "summary" };

/** A Charlie message. Text between ** pairs is bold. */
function charlie(markup: string): DiscoveryDemoItem {
  const words = markup.split("**").flatMap((part, index) =>
    part
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({ text, bold: index % 2 === 1 })),
  );
  return { kind: "charlie", words };
}

/** Everything that appears in the thread, in order. */
export const DISCOVERY_DEMO_THREAD: readonly DiscoveryDemoItem[] = [
  charlie(
    "Hi, I'm Charlie, your AI money guide. **Would you like a quick overview (about 5 minutes) or a more thorough conversation?**",
  ),
  { kind: "user", text: "A quick overview is fine." },
  charlie(
    "Great. First question: **what do you bring home each month, after tax?** A rough number is fine.",
  ),
  { kind: "user", text: `About ${formatMoney(DISCOVERY_DEMO_SUMMARY.income)} a month.` },
  { kind: "gap", text: "A few questions later" },
  // The line Charlie closes every discovery chat with in the app.
  charlie("Perfect. Let me pull everything together and make sure I've got it right."),
  { kind: "summary" },
];

/** The plain text of a thread item, for tests and screen readers. */
export function discoveryDemoText(item: DiscoveryDemoItem): string {
  if (item.kind === "charlie") return item.words.map((word) => word.text).join(" ");
  if (item.kind === "summary") return "";
  return item.text;
}

/** Labels inside the phone. The app's wording, except the step name (see the roadmap backlog). */
export const DISCOVERY_DEMO_LABELS = {
  steps: ["Profile", "Discovery", "Risk Profile", "Holdings"],
  thread: "Discovery chat",
  charlie: "Charlie",
  placeholder: "Type your response...",
  summaryTitle: "Assessment Complete",
  summaryIntro: "Your monthly picture, from what you told Charlie",
  summaryRows: { income: "Income", expenses: "Expenses", savings: "Savings" },
  perMonth: "/mo",
  confirm: "Looks right — continue",
  correct: "Let me correct something",
} as const;

export type DiscoveryDemoPress = "send" | "confirm";

export interface DiscoveryDemoFrame extends DemoBaseState {
  /** How many thread items are on screen. */
  shown: number;
  /** True while the newest item is a Charlie message that is still arriving. */
  streaming: boolean;
  /** Words of that arriving message shown so far. Zero means Charlie is still thinking. */
  words: number;
  /** What is typed in the reply box. */
  draft: string;
  pressed: DiscoveryDemoPress | null;
  /** True once the monthly picture is confirmed and the chat step is done. */
  confirmed: boolean;
}

const INITIAL: DiscoveryDemoFrame = {
  step: 0,
  resetting: false,
  shown: 0,
  streaming: false,
  words: 0,
  draft: "",
  pressed: null,
  confirmed: false,
};

type Keyframe = DemoKeyframe<DiscoveryDemoFrame>;

const WORDS_PER_BEAT = 3;
const BEAT_MS = 130;
const TYPING_BEAT_MS = 180;
const TYPING_BEATS = 3;

function itemAt(index: number): DiscoveryDemoItem {
  const item = DISCOVERY_DEMO_THREAD[index];
  if (!item) throw new Error(`Discovery demo has no thread item ${index}.`);
  return item;
}

/** Charlie's message `index` appears as "thinking" at `at`, then arrives a few words at a time. */
function charlieSays(index: number, at: number, thinkMs: number): Keyframe[] {
  const item = itemAt(index);
  if (item.kind !== "charlie") throw new Error(`Thread item ${index} is not Charlie's.`);
  const total = item.words.length;
  const beats = Math.ceil(total / WORDS_PER_BEAT);
  return [
    { at, set: { shown: index + 1, streaming: true, words: 0 } },
    ...Array.from({ length: beats }, (_, beat): Keyframe => {
      const words = Math.min(total, (beat + 1) * WORDS_PER_BEAT);
      return {
        at: at + thinkMs + beat * BEAT_MS,
        set: words === total ? { words, streaming: false } : { words },
      };
    }),
  ];
}

/** The reply `index` is typed from `at`, the send button is pressed, and it joins the thread. */
function userReplies(index: number, at: number): Keyframe[] {
  const item = itemAt(index);
  if (item.kind !== "user") throw new Error(`Thread item ${index} is not a reply.`);
  const words = item.text.split(" ");
  const typed = Array.from({ length: TYPING_BEATS }, (_, beat): Keyframe => ({
    at: at + beat * TYPING_BEAT_MS,
    set: { draft: words.slice(0, Math.ceil(((beat + 1) * words.length) / TYPING_BEATS)).join(" ") },
  }));
  const typedBy = at + (TYPING_BEATS - 1) * TYPING_BEAT_MS;
  return [
    ...typed,
    { at: typedBy + 400, set: { pressed: "send" } },
    { at: typedBy + 650, set: { pressed: null, draft: "", shown: index + 1 } },
  ];
}

const SCRIPT: Keyframe[] = [
  // 1. Charlie says hello and asks how deep to go.
  ...charlieSays(0, 500, 700),
  // 2. The answers, in the visitor's own words.
  { at: 3_300, set: { step: 1 } },
  ...userReplies(1, 3_500),
  ...charlieSays(2, 4_900, 600),
  ...userReplies(3, 7_000),
  { at: 8_500, set: { shown: 5 } },
  // 3. Charlie reads the picture back, and it is confirmed.
  { at: 9_000, set: { step: 2 } },
  ...charlieSays(5, 9_000, 600),
  { at: 10_500, set: { shown: 7 } },
  { at: 11_300, set: { pressed: "confirm" } },
  { at: 11_600, set: { pressed: null, confirmed: true } },
];

export const DISCOVERY_DEMO_TIMELINE = createDemoTimeline<DiscoveryDemoFrame>({
  initial: INITIAL,
  keyframes: SCRIPT,
});

/** How many words of Charlie's message `index` the frame shows. */
export function discoveryDemoWordsShown(frame: DiscoveryDemoFrame, index: number): number {
  const item = DISCOVERY_DEMO_THREAD[index];
  if (!item || item.kind !== "charlie" || index >= frame.shown) return 0;
  const arriving = frame.streaming && index === frame.shown - 1;
  return arriving ? frame.words : item.words.length;
}

export const DISCOVERY_DEMO_STEPS: readonly DemoStep[] = [
  { label: "Meet Charlie", detail: "your AI money guide" },
  { label: "Answer a few questions", detail: "in your words" },
  { label: "Check your picture", detail: "then confirm it" },
];

export const DISCOVERY_DEMO_ALT =
  "Illustration of a discovery chat with Charlie in Mosaic: Charlie introduces itself and asks a question, a reply is typed and sent, and after a few more questions Charlie shows the monthly picture it heard, ready to confirm or correct.";

export const DISCOVERY_DEMO_NOTE =
  "Illustration. A shortened, made-up conversation. Educational information, not financial advice.";
