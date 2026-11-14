/**
 * Copy for the marketing section that shows where the weekly logs lead:
 * the Cash Flow Review and Net Worth (homepage and waitlist page).
 *
 * Compliance: describes what the tracker shows. No advice, no promise about
 * returns or results. Guarded by tests/unit/marketing-demos.test.ts.
 */
export const TRACKING_PICTURE_COPY = {
  eyebrow: "What the logs add up to",
  heading: "From this week's spend to the whole picture.",
  intro:
    "Logging is the habit. Review and Net Worth turn it into a picture you can read, month by month. Educational information, not financial advice.",
  review: {
    eyebrow: "Cash Flow · Review",
    title: "See what the month added up to",
    body: "Every spend you log rolls into the month's Review: what you tracked against what you planned, category by category, with your tracking balance and savings rate.",
  },
  netWorth: {
    eyebrow: "Net Worth",
    title: "Watch the picture build, one check-in at a time",
    body: "Once a month, record what you own and what you owe. Each check-in adds a point to your net worth history, so you can see which way it is heading. It shows the direction; it does not predict it.",
  },
} as const;
