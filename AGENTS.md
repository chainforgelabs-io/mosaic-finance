
# AGENTS.md — Mosaic Finance

Read this before every task. If a task conflicts with this file, stop and ask.

## What this is

Mosaic Finance (mosaicfinance.ai) is a Canadian personal-finance **tracking and education** app. It is not an advice product. Users track spending, budgets, net worth, holdings, and goals for free. Paid tiers add Charlie (the AI money guide), the Progress Report (the codebase may call it a "plan"), and statement/receipt parsing.

Tiers: **Pulse** (free, with a 14-day card-free reverse trial of Progress) → **Progress** → **Mastery**.

## Stack

- Next.js + React on Vercel (yul1)
- Supabase (Postgres, auth, RLS) in AWS ca-central-1 for Canadian data residency
- Stripe (CAD), Resend (email), PostHog (analytics), Sentry (errors)
- Anthropic API: fact-find, report generation, Charlie chat (streamed over SSE), statement parsing

Use the scripts in `package.json` for lint, typecheck, test, and build. Follow existing patterns before inventing new ones. Don't change hosting regions or add services outside Canada without asking.

## Hard rules

1. **Staging and test mode only.** If you see a `sk_live_` Stripe key, a production Supabase URL, or a production service-role key, stop immediately and report it.
2. **Migrations.** Every schema change ships as a migration file in the PR, following the repo's existing convention. You may apply additive migrations to staging to test. No drops, renames, or destructive data changes without asking. A human applies production migrations.
3. **One task, one branch, one PR.** Branch name: `agent/<short-task-name>`. Don't expand scope. List anything else you notice under "Found but not fixed."
4. **No secrets in code, logs, or PR text.** Never commit `.env` files, keys, or tokens.
5. **Don't weaken checks.** Never skip, delete, or loosen tests, lint rules, type checks, or RLS policies to get green.
6. **Don't change these unless the task says to:** prices, tier definitions, model IDs, prompt content, report section structure, auth flows.
7. **New dependencies** only when necessary, each justified in the PR.
8. **Ask instead of guessing** on billing, entitlements, auth, data deletion, or user-facing compliance copy.
9. **Missing environment variable?** Stop and list what you need.

## Test data

- Use seeded fake users and fake financial data only. On staging, create pre-confirmed test users through the Supabase admin API.
- Don't let staging send email to made-up addresses; bounces damage the sending domain. Use Resend's documented test addresses or stub the send.
- Stripe test cards only.

## User data and privacy (PIPEDA / Quebec Law 25)

- Never send dollar amounts, account details, names, emails, or free-text financial information to PostHog, Sentry, logs, or any third party. User IDs and counts only.
- Don't copy prompt or response content into new tables, logs, or services.
- Don't add a third-party service that receives user data. If a task seems to need one, stop and ask.

## Compliance: every UI string, email, and AI prompt

Mosaic provides **education and analysis, not advice.** Canadian securities rules (NI 31-103) are technology-neutral: tailored recommendations about specific securities or account actions cross the line, whether a human or an AI makes them.

**Safe:** "Charlie, your AI money guide" · "AI-powered financial guidance / education / analysis" · Pulse / Progress / Mastery

**Never use:**

- "AI financial advisor," "financial advisor," or "financial planner" for Charlie or the product
- "personalized asset allocation"
- "which account to prioritize"
- "we recommend you buy / sell," or any recommendation about a specific security
- Any promise about investment returns, performance, or dollars saved
- Any suggestion that a human advisor, CFP, or CIM reviews a user's report or chats
- The founder's name or credentials, unless the task supplies that exact copy

**The Consistency Guarantee** is conditioned only on logging spending weekly and completing the monthly net-worth snapshot for 90 days, measured by the Financial Health Score. Never on returns, savings, or "following action steps."

If you add or edit any user-facing text or AI prompt, list every changed string in the PR under **Copy changes for compliance review.**

## Pricing (CAD)

Every price sits on a ladder where the digit sum reduces to 8. Never introduce a price that isn't listed here.

| Product | Monthly | Annual |
|---|---|---|
| Pulse | $0 | $0 |
| Progress | $17 | $170 |
| Progress founding (first 200, locked for life) | $8 | $80 |
| Mastery | $44 | $350 |
| Academy standalone | $26 | $260 |

## Entitlements: "free tracks, paid thinks"

**Never gate (free on Pulse forever):** tracking, budgets, net worth, manual holdings, goals, the live Financial Health Score, Score history, all gamification (achievements and streaks), Canadian calculators.

| Gated feature | Progress | Mastery |
|---|---|---|
| Fact-find, Progress Report, monthly regeneration | ✅ | ✅ |
| Charlie | soft cap ~100 messages/month | "unlimited," soft cap ~100 conversations/month |
| Statement / receipt parsing | ✅ | ✅ |
| Priority generation, quarterly guided reviews, tax year-end pack | — | ✅ |
| Money Club | — | ✅ |
| Academy | — | annual plan only |

Reverse-trial users get full Progress for 14 days. Soft caps are enforced quietly; only users who actually hit one should ever see it.

## AI calls

- **First reports and trial reports are real-time, always.** Never route them through the Batch API, a queue, or a review step that delays what the user sees.
- **The Batch API is for scheduled monthly regenerations only.**
- Once the AI usage wrapper exists, every Anthropic call goes through it. Never instantiate a raw client elsewhere.
- Charlie's streaming must never get slower. Do bookkeeping after the stream completes, not in the token path.

## Definition of done

1. Read the relevant code and confirm current behaviour before changing it.
2. Lint, typecheck, tests, and build all pass.
3. New logic has tests where a test setup exists; otherwise write manual verification steps.
4. For UI or flow changes, run the app and attach screenshots or a recording.
5. The PR description uses the template below.

## PR description template

```
## Summary
What changed, in 2–3 sentences.

## Why
The problem this solves.

## How to verify on the Vercel preview (phone-friendly steps)
1.
2.

## Migrations
Files, what each does, whether applied to staging, how to roll back. "None" if none.

## Environment variables
New or changed. "None" if none.

## Copy changes for compliance review
Every added or edited user-facing string or AI prompt. "None" if none.

## Found but not fixed
Out-of-scope issues noticed.

## Risks
What could break.
```
