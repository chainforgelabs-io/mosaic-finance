# Launch-readiness QA report — mosaicfinance.ai

**Date:** 2026-10-06 · **Build under test:** production (`main` @ `6a8c86f`) · **Account:** the founder's own account (the only user) · **Method:** scripted browser sweep (Playwright/Chromium, desktop + 390px mobile), direct API probes, Supabase REST probes with the session JWT, and a line-by-line read of every calculation module, entitlement check, Stripe handler, cron route, and AI prompt.

## Verdict

**Not ready for public onboarding and marketing yet.** The free tracking surface (cash flow, budgets, goals, net worth, gamification, calculators) is solid and the paid AI surfaces work end to end — Charlie streams a first token in ~1–2 s, the report PDF renders, checkout sessions open for every tier. But the sweep found four launch blockers, three of which are fixed in the launch-readiness PR, plus a set of trust-breaking calculation defects (also fixed). The investment-section compliance exposure (B4) is fixed in the follow-up: new reports no longer assign a weight or a return to a named fund, and the on-screen report and PDF no longer call the mix a recommendation.

| | Before | After this PR |
|---|---|---|
| Blockers | 4 | 0 (B4 fixed in the follow-up; see below) |
| High | 9 | 4 |
| Medium | 13 | 12 |
| Low | 11 | 11 |

Recommended path: apply migration 035 to production → fix the two Stripe High items → flip Stripe to live → launch. B4 (investment-section copy) is fixed; review that copy before the next report regeneration.

---

## 1. Blockers

### B1 · Fabricated content shown to real users (walkthrough + mock-data fallback) — FIXED
- `plan/[planId]` and `walkthrough` pages called `loadMockData("delivered")` whenever the real plan wasn't loaded, replacing the user and report with a fictional "professionally reviewed" plan containing "We strongly recommend…", "6.2% nominal return", and account-priority advice.
- The walkthrough's Charlie panel never called the API. Intros were canned strings per section ("Your savings rate is above average", "this fee reduction alone could add over $100,000 to your portfolio", "could improve your projected retirement age by 2.5 years", "a $500K term life policy… high-priority"), follow-ups were `Math.random()` picks from three templates, and the completion card listed three hard-coded action items for every user.
- **Fix:** removed `loadMockData` and `src/lib/mock-data.ts`; walkthrough now opens a real `walkthrough` conversation session, streams each section intro and follow-up from Charlie over the existing SSE route (same prompt and client snapshot as ad-hoc Q&A), and the completion card lists the user's own highest-priority action items. Entitlement denials surface as a single Charlie message.

### B2 · Any signed-in user can self-upgrade — FIXED (migration pending human apply)
- `user_profiles` RLS is `FOR ALL USING (auth.uid() = id)` with no column restriction. Verified on production: `PATCH /rest/v1/user_profiles?id=eq.<me>` with `{"subscription_tier":"mastery"}` returned **200**. `role`, `trial_ends_at`, `is_founding_member`, `academy_access`, and Stripe IDs are equally writable; `role` gates `/admin` and the approval API.
- **Fix:** `supabase/migrations/035_protect_profile_entitlements.sql` adds a `BEFORE INSERT OR UPDATE` trigger that rejects changes to those columns from `anon`/`authenticated` (service role and webhooks unaffected). `create-checkout` now writes `stripe_customer_id` via the service client. **Not applied anywhere** — a human applies to production.

### B3 · Cron endpoints fail open — FIXED
- Six cron routes and the newsletter route compared `authorization === \`Bearer ${process.env.CRON_SECRET}\``. With the env var unset, `Authorization: Bearer undefined` is accepted and triggers nurture/education emails, picks scans, trial lifecycle, and newsletter sends.
- **Fix:** shared `isCronRequest()` / `bearerMatches()` (`src/lib/cron-auth.ts`) — rejects when the secret is empty, constant-time compare. Export tokens use the same helper.

### B4 · Progress Report investment section recommends specific securities — FIXED
- The prompt asked for `core_etf_recommendations` with a portfolio weight and `five_year_return_benchmark`, and the schema required at least one ticker. The UI and PDF said "Recommended Allocation" and "Personalized asset allocation and ETF considerations".
- **Fix:** the prompt now asks for an illustrative asset-class mix and at most three example funds (ticker, name, MER, what the fund holds). No weight, no return figure, no satellite picks, and the account section explains how registered accounts are taxed. `sanitizeInvestmentSection` strips weights, return figures, and satellite picks before save and again when an already-stored report is shown or exported to PDF. Labels are "Illustrative mix" and "Example funds". A report already on file still contains the old prose until it is regenerated; the fund table no longer shows the weight or the return.

---

## 2. Calculation and KPI verification

Every number on the dashboard, net-worth page, cash-flow page, plan page, and the Health Score was traced to its source and recomputed.

| Metric | Shown | Recomputed | Status |
|---|---|---|---|
| Net worth | $336K | $87K investments + $467K fixed − $218K debt = $336K | ✅ |
| Asset split | Inv 11% / Fixed 60% / Debt 28% | donut mixes assets and debt in one 100% (see M7) | ⚠️ misleading |
| Dashboard Health Score ring | **68** (report) | live derived score **51** | ❌ → **fixed (F1)** |
| Score · savings component | 100 (71% rate) | 7.7% stated savings → 50 | ❌ → **fixed (F4)** |
| Score · net-worth component | 40 ("unknown") despite $336K tracked | 75 | ❌ → **fixed (F4)** |
| Score · consistency | 24 (1 wk streak) | 24 | ✅ |
| Guarantee `weeksLogged` | 0 | streak page says 1 | ❌ → **fixed (F3)** |
| Guarantee `scoreDelta` | −17 (report 68 → derived 51) | methodology switch, not a drop | ❌ → **fixed (F3)** |
| Debt payoff (report) | 180 mo / $88K interest; avalanche = snowball | 140 mo / $50,233 on the debts on file | ❌ → **fixed (F5)** |
| Retirement readiness | 44% ($743K of $1.7M), $2K/mo needed | $1.7M target is not derivable from the stated 70% replacement / 4% rule given the inputs; $6,113/mo income sources vs $2K gap inconsistent | ⚠️ documented (M8) |
| Left to spend | $12,799 | real surplus ≈ $1,116/mo | ❌ inflated by statement baseline (H2) |
| Paycheque confirm | counted as **$3,800 flexible spending**, left-to-spend dropped to $8,999 | income, not spend | ❌ → **fixed (F2)** |
| Snapshot date | 2026-10-07 (saved 10:42 pm MT on the 6th) | server `todayIso()` is UTC | ❌ documented (H3) |
| Weekly streak after log | 1, `loggedThisWeek: true` | ✅ | ✅ |
| Achievements | `first_transaction`, `budget_set`, `net_worth_*` unlocked correctly | | ✅ |
| PDF | 200, `application/pdf`, 385 KB in 5.4 s | | ✅ |
| Checkout | `cs_test_` sessions for all 5 paid SKUs; Pulse correctly rejected (400) | | ✅ (test mode — see H1) |

### Fixes in this PR (F-series)
- **F1** `HealthScore` ring re-animates when the `score` prop changes (was frozen at first value), and clamps the rAF timestamp so it can't flash a negative number (observed `-21`).
- **F2** `line_role` is derived from direction in `/api/recurring` confirm and `/api/cash/check` (income is no longer counted as purchases).
- **F3** Guarantee + health-score deltas compare derived scores only (`derivedScoreDelta`); `weeksLogged` uses the same `loggingActivityDates` definition as the streak UI.
- **F4** Savings component uses stated `monthly_savings` when available; net-worth component falls back to live holdings + fixed assets − debt before the first snapshot.
- **F5** `reconcileDebtPlan` overwrites the model's `total_debt`, `payoff_months`, `total_interest_paid` with deterministic amortization of the debts on file (prose, order, and rationale untouched). Applies to new generations only.
- **F6** Mock-data fallback removed (see B1).
- **F7** Migration 035 + service-client write in checkout (see B2).
- **F8** Cron/export auth hardening (see B3).
- **F9** `recordDerivedHealthScore` is awaited in the six mutation routes that recorded it fire-and-forget (`void`), so a serverless freeze after the response can no longer drop the write.
- **F10** Walkthrough wired to real Charlie (see B1).

All covered by unit tests in `tests/unit/{guarantee,reconcile-debt-plan,cron-auth,health-score}.test.ts`.

---

## 3. High

- **H1 · Stripe is in test mode on the live domain.** Every checkout session is `cs_test_…`, portal is `test_…`. Cards can't be charged. Switch keys before marketing (and re-run the checkout smoke).
- **H2 · Statement baseline inflates income / left-to-spend.** Baseline income $18,868/mo comes from July-only lines including two "Error correction" credits of $1,000; left-to-spend shows $12,799 vs a real surplus of ~$1,116. Needs an income-line filter (exclude reversals/transfers) and a minimum-months rule before the figure is shown.
- **H3 · Dates roll over at ~6 pm Mountain / 8 pm Eastern.** `todayIso()` uses server time (UTC on Vercel), so a snapshot saved at 10:42 pm on Oct 6 is dated Oct 7; late-evening spending lands on tomorrow. Pass the client's local date or the profile timezone.
- **H4 · Founding-member cap is not atomic.** `getFoundingStatus().open` is read once at checkout; the webhook sets `is_founding_member = true` without re-checking. Concurrent buyers at 199/200 all get the $8 price for life.
- **H5 · Checkout creates Stripe prices/products at request time** when env price IDs don't match the ladder; `customer.subscription.deleted` can't map them and downgrades the app tier to `pulse` on an Academy cancel.
- **H6 · Dashboard for a user without a report is an empty state.** `planStatus === "none"` renders only "Complete Setup" — no live Health Score, net worth, streaks, or badges, all of which AGENTS.md says are free forever. A Pulse user who skips fact-find (or whose trial lapsed before generating) sees nothing on the home screen.
- **H7 (was) · Walkthrough canned replies** → fixed, see B1.
- **H8 (was) · Score/guarantee/debt defects** → fixed, see §2.
- **H9 (was) · Cron fail-open** → fixed, see B3.

## 4. Medium

- **M1** Soft caps are hard stops with contradictory copy: at 100 messages the route returns "We'll keep the conversation going…" and does not call Claude; Mastery at 100 conversations gets "consider Mastery…" while on Mastery.
- **M2** Progress regeneration cap counts the first report, so a user who generated on the 20th can't regenerate until next month.
- **M3** No webhook idempotency (`event.id` not deduped) → Stripe retries resend confirmation emails and Skool webhooks.
- **M4** "30-day no-questions refund" appears in pricing, FAQ, nurture email, and confirmation email; no code path or stored `first_paid_at`. Document as a manual process or build it.
- **M5** Sentry Session Replay enabled with defaults on a finance app (10% sessions / 100% on error); no `beforeSend` scrubbing of URLs/breadcrumbs. Set `maskAllText`/`blockAllMedia` explicitly or disable for launch.
- **M6** User email posted to a Zapier hook for Skool — a third party outside Canada receiving user data. Privacy decision needed.
- **M7** "Asset & debt composition" donut puts debt in the same 100% as assets (Inv 11% / Fixed 60% / Debt 28%), which reads as debt being 28% of assets. Show assets vs liabilities as two bars, or assets-only.
- **M8** Retirement projections: target $1.7M, trajectory $743K, "$2K/mo needed", but income sources total $6,113/mo and the stated assumptions (70% replacement, 4% rule) don't reproduce $1.7M. Worth a deterministic recompute like F5.
- **M9** Raw `anthropic.messages.create` in `upload/statement` and `upload/spending` bypass the wrapper (no retry/backoff/truncation detection).
- **M10** `recordUsageEvent` is awaited before the final SSE flush in Charlie's route — one DB round-trip of extra latency on the last chunk. Move after `controller.close()`.
- **M11** `/api/transactions?start=…&end=…` returns the full range unpaginated (126 KB for one account); cash-flow page issues 8 fetches and takes ~6 s to settle on production, 17 s on mobile emulation.
- **M12** `/api/market/social` → 500 on the News tab; `/api/market/commentary` → 429 on first open of AI Commentary; six unexplained 400s in the console across plan/walkthrough/meeting pages.
- **M13** `/login` and `/signup` render for an already-authenticated user (11–12 s loads) instead of redirecting to `/dashboard`.

## 5. Low

- **L1** Stub routes under `src/app/(dashboard)/` (`/settings`, `/holdings`, `/fact-find`, `/market-context`, `/risk-profile`, `/plan/[id]`, `/plan/[id]/walkthrough`) render placeholder text, are public, and are not in middleware. Delete the group.
- **L2** Cash-flow keypad doesn't reset after a save (still shows `$6.40`); the new item appears only after ~6 s / reload.
- **L3** Duplicate recurring "Amazon Com Inc" items detected from statements.
- **L4** Subscription card: Progress price renders as "CA$8/" clipped on the founding card at desktop width.
- **L5** Risk quiz option "A guaranteed return of 3% per year" reads as a return claim; "a fixed 3% GIC-style return" is safer.
- **L6** "Professionally reviewed" badge logic (`status: "cim_reviewed"`) still exists in `PlanSection`/`PlanSectionComponent`; nothing sets it now that mock data is gone, but it implies human review and should be removed.
- **L7** Walkthrough footer "Your responses are encrypted and never shared." — messages are sent to Anthropic; reword or drop (compliance call).
- **L8** Every page `<title>` is the marketing title; no per-route titles.
- **L9** Recharts "width(-1)/height(-1)" warnings on every chart page (SSR render before layout).
- **L10** No scheduled monthly regeneration exists (no Batch API usage); Progress's "monthly refresh" is manual today.
- **L11** 12 pre-existing lint errors on `main` (React Compiler rules: impure calls during render, `setState` in effects). None in files touched here.

---

## 6. What works well

Login/logout/redirect, forgot/reset-password pages, 404; keypad logging → transaction → streak → achievement chain; budgets PUT/clear; goals CRUD; 4-step net-worth check-in → snapshot → score recompute; Charlie Q&A (first token 1.1–2.1 s, no banned phrases in replies, disclaimer appended); PDF and draft PDF; gated-page copy for Tax Pack / Academy / Money Club / Priority; mobile nav + More sheet with no horizontal overflow; all public pages 200 with no console errors; `sk_live_` nowhere; `.env*` ignored; PostHog not integrated; Sentry extras are IDs only.

## 7. Side effects left in the founder's account

Created during testing and **left in place** (all reversible): one net-worth snapshot dated 2026-10-07; achievements `budget_set`, `net_worth_50k/100k/250k`; two in-progress conversation sessions ("Initial Consultation", "Financial Q&A"); several `health_score_history` rows (derived). Test transactions, the QA goal, the dining budget, and the confirmed paycheque transaction were deleted and the recurring `next_date` restored.

## 8. Before launch checklist

1. Merge this PR; verify on the Vercel preview (steps in the PR).
2. Review the B4 copy and prompt change (listed in that commit) before the next report regeneration.
3. Apply `035_protect_profile_entitlements.sql` to production; confirm Stripe webhook (service role) still updates tiers.
4. Fix H4/H5 (atomic founding cap; no runtime price creation), then switch Stripe to live keys and re-run the checkout smoke with a test card in live-test mode.
5. Fix H2/H3/H6 — they shape the first impression for every new free user.
6. Resolve M1/M2/M4 copy-vs-behaviour gaps; set Sentry replay masking (M5); decide on Skool/Zapier (M6).
7. Re-run the sweep scripts against the preview; confirm zero 4xx/5xx in console on every dashboard route.
