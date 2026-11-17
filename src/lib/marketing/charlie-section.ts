/**
 * Copy for the marketing section that shows the discovery chat with Charlie
 * (homepage and waitlist page). It closes the run of four demos: log the
 * week, review the month, check in on net worth, then Charlie on Progress.
 *
 * Compliance: Charlie is "your AI money guide". Education and analysis, not
 * advice. No promise about results, and no Charlie allowance is stated.
 * Guarded by tests/unit/marketing-demos.test.ts.
 */
export const CHARLIE_SECTION_COPY = {
  eyebrow: "Charlie on Progress",
  heading: "When you want the why, a five-minute conversation with Charlie.",
  intro:
    "Charlie, your AI money guide, starts with a discovery chat: a few plain questions about what comes in, what goes out, and what you are working toward. Educational information, not financial advice.",
  points: [
    {
      title: "Start with a discovery chat",
      body: "Answer in your own words, one question at a time. Choose a quick overview or a more thorough conversation.",
    },
    {
      title: "Check what Charlie heard",
      body: "Charlie reads your monthly picture back to you. Confirm it, or correct anything that is off.",
    },
    {
      title: "Get the picture explained",
      body: "Your answers are the starting point for your Progress Report, which explains the picture in plain Canadian terms.",
    },
  ],
  progressNote: {
    label: "Included with Progress",
    body: "Charlie comes with a Progress membership. After the discovery chat, you can keep asking Charlie for further analysis of your numbers and for help using Mosaic.",
  },
} as const;
