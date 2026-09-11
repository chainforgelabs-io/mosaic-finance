# Mosaic — Complete Business To-Do

*From right now → first paying subscriber → first Mosaic Money Club members.*
*Companion to `BUSINESS_PLAN.md`. Items marked `[x]` are already built in the codebase; `[ ]` is on you.*

---

## What you need to do (right now)

- [ ] Apply migrations `027_tiers_pulse_progress_mastery.sql` and `028_entitlements_score_budgets_nurture.sql` (`npx supabase db push` or run in the SQL editor).
- [ ] Create the new Stripe prices (CAD) and set the env vars — see `.env.example`:
  - `STRIPE_PRICE_PROGRESS_MONTHLY` ($17) / `STRIPE_PRICE_PROGRESS_ANNUAL` ($170)
  - `STRIPE_PRICE_PROGRESS_FOUNDING_MONTHLY` ($8) / `STRIPE_PRICE_PROGRESS_FOUNDING_ANNUAL` ($80)
  - `STRIPE_PRICE_MASTERY_MONTHLY` ($44) / `STRIPE_PRICE_MASTERY_ANNUAL` ($350)
  - `STRIPE_PRICE_ACADEMY_MONTHLY` ($26) / `STRIPE_PRICE_ACADEMY_ANNUAL` ($260)
  - `FOUNDING_CAP=200`, `FOUNDING_DEADLINE=<ISO date, set at launch>`
- [ ] Leave `NEXT_PUBLIC_LAUNCH_MODE=waitlist` until you're ready; set `live` to flip marketing to signup + reverse trial.
- [ ] Optional: `NEXT_PUBLIC_SKOOL_GROUP_URL` and `SKOOL_ZAPIER_HOOK_URL` for Club provisioning (Phase 7).
- [ ] Add the two new crons in `vercel.json` to your Vercel project (`/api/cron/trial-lifecycle`, `/api/cron/nurture`) and confirm `CRON_SECRET` is set.
- [ ] Point the Stripe webhook at `/api/stripe/webhook` with all four events (`customer.subscription.created/updated/deleted`, `checkout.session.completed`).

---

## Phase 1 — Make the app confidently chargeable (do this first)

**Original step: "Refine Mosaic App and make sure it is polished."** Kept — but moved from step 6 to step 1. If content works before the app is ready, you burn the trust you can't buy back.

### Already built
- [x] Pulse / Progress / Mastery tiers, entitlements, reverse trial (14 days, card-free)
- [x] Charlie soft caps, report gating, upload-parse gating, AI usage logging
- [x] Live Financial Health Score + history, Consistency Guarantee status
- [x] Per-category budgets with Week / Month view
- [x] Tax Year-End Pack v1 (Mastery)
- [x] Founding counter ($8 Progress, first 200), Academy checkout, Skool hook
- [x] Prompt caching, env-driven model IDs, priority SLA for Mastery
- [x] Trial lifecycle emails, subscription-confirmed email, nurture cron
- [x] Mobile polish: viewport/safe-area, FAB, card layouts, scroll-snap tabs

### Your full test run
See **Phase 1b** below. Nothing in Phase 6 (launch) happens until every section in 1b is signed off.

### Unit economics
- [ ] After a week of real usage, query `ai_usage_events` and compute cost per active paying user. Alarm thresholds: blended > ~$4/user/mo; Mastery tail > ~$10/user/mo. Tighten soft caps if breached.

---

## Phase 1b — Your full test run

*Budget two focused sessions (one desktop, one phone), plus a third for billing. Log every bug in one place with: page, steps, expected, actual, screenshot, device. Fix, then re-run only the failed sections — then re-run section T (regression) once more before sign-off.*

### 0. Test setup (do once)
- [ ] Use a **staging** Supabase project or a fresh branch DB — never test against production data
- [ ] Stripe in **test mode**; keep the test-card list handy: `4242 4242 4242 4242` (success), `4000 0000 0000 0341` (attaches, then fails), `4000 0000 0000 9995` (declined), `4000 0027 6000 3184` (3DS challenge)
- [ ] Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` locally, or register the staging webhook endpoint in the Stripe dashboard
- [ ] Set up a throwaway inbox provider (e.g. a Gmail with `+tags`) so you can create many accounts and see every email
- [ ] Create these accounts and note the emails in a table:
  - **A — Fresh trial**: brand new signup, trial active
  - **B — Trial expired**: signup, then set `trial_ends_at` to yesterday in `user_profiles`
  - **C — Progress founding monthly**: purchased with founding price
  - **D — Progress annual**: purchased at list price
  - **E — Mastery monthly**
  - **F — Mastery annual** (should also carry `academy_access = true`)
  - **G — Academy standalone** (Pulse tier + `academy_access = true`)
  - **H — Admin**: set `role = 'admin'` on the reviewer/profile row
  - **I — Legacy**: manually set `subscription_tier = 'plan'` to confirm `normalizeTier` still maps old values (should read as Progress)
- [ ] Devices: desktop Chrome + Safari (1440px and a 1024px window), iPhone Safari, Android Chrome. Test at least one page in Firefox.
- [ ] Have Supabase table editor open on `user_profiles`, `ai_usage_events`, `health_score_history`, `category_budgets`, `waitlist_signups`, `user_achievements`
- [ ] Temporarily point `SKOOL_ZAPIER_HOOK_URL` at a https://webhook.site URL so you can see the payload without touching Skool

### A. Marketing site — waitlist mode (`NEXT_PUBLIC_LAUNCH_MODE=waitlist`)
- [ ] `/` loads in under 3s on mobile data; no layout shift on hero; logo crisp on retina
- [ ] Nav: every link resolves; primary CTA goes to `/waitlist`; no "Sign up" / "Start trial" language anywhere
- [ ] Hero, problem, solution, positioning, showcase, trust, always-available sections render; all images have alt text
- [ ] Pricing section: three tiers Pulse $0 / Progress $17 ($170/yr) / Mastery $44 ($350/yr); "Free tracks. Paid thinks." tagline; founding $8 strike-through visible; Academy mentioned as included in Mastery annual
- [ ] Pricing toggles between monthly and annual correctly; annual math matches config
- [ ] Founding counter reads from `/api/founding/status` and shows "X of 200 spots" — verify with a fake `FOUNDING_CAP=3` and one purchase that it decrements
- [ ] FAQ: expands/collapses, answers match the current tier names and guarantee terms (no stale "Snapshot/Plan/Advisor")
- [ ] Final CTA and footer: links to privacy, terms, calculators; social handles (or none — no dead links)
- [ ] `/waitlist`: form validates (bad email, empty, duplicate email → friendly message, not 500)
- [ ] Waitlist success → row in `waitlist_signups` with `nurture_step = 1`, `newsletter_opt_in` reflects checkbox
- [ ] Waitlist email arrives with the PDF attached/linked; PDF opens on phone; no broken images inside it
- [ ] `/calculators/fhsa`, `/calculators/rrsp-vs-tfsa`, `/calculators/cpp-timing`: inputs accept edge values (0, negatives, huge numbers) without NaN; results update live; CTA goes to waitlist in this mode; sliders usable with a thumb
- [ ] `/privacy` and `/terms` load (content to be replaced in Phase 2, but pages must not 404)
- [ ] `/sitemap.xml` lists home, waitlist, calculators, privacy, terms — and **not** dashboard/admin routes
- [ ] `/robots.txt` disallows `/dashboard`, `/admin`, `/api`
- [ ] `/test` page: decide — delete it or confirm it's noindex and harmless before launch
- [ ] Visiting `/signup` or `/login` directly in waitlist mode: confirm intended behaviour (redirect to waitlist, or allowed for you) and that it's not a hidden back door for the public
- [ ] Nonexistent URL → branded 404, not a Next.js default error
- [ ] Open Graph / Twitter card preview via a link-preview tool: title, description, image all correct

### B. Marketing site — live mode (`NEXT_PUBLIC_LAUNCH_MODE=live`, locally or on a preview deploy)
- [ ] Nav CTA becomes "Start free" / signup; hero copy switches to the trial promise; waitlist page still reachable but no longer primary
- [ ] Pricing CTAs deep-link to signup with the tier preselected (or to checkout when logged in)
- [ ] FAQ live variant mentions the 14-day reverse trial and 30-day refund
- [ ] `/signup` shows the trial copy ("14 days of Progress, no card")
- [ ] Calculators CTA now points to `/signup`
- [ ] Flip back to `waitlist` and confirm everything reverts — no cached copy stuck in either direction

### C. Auth
- [ ] Signup with a new email → confirmation email arrives (check timing and sender name) → link lands on `/auth/callback` → redirected into onboarding
- [ ] Signup with an existing email → clear error, no account enumeration beyond what Supabase does
- [ ] Weak password rejected with helpful text
- [ ] Login with wrong password → error; correct → dashboard
- [ ] Forgot password → email → `/reset-password` → new password works, old doesn't
- [ ] Sign out → hitting `/dashboard` redirects to `/login`; back button doesn't reveal cached dashboard data
- [ ] Deep link while logged out (e.g. `/dashboard/tax-pack`) → login → returns to the intended page
- [ ] Session survives browser restart (remember me behaviour is what you expect)
- [ ] `user_profiles` row exists after signup with `subscription_tier = 'pulse'` and `trial_ends_at` ≈ now + 14 days
- [ ] Trial-started email arrives on signup

### D. Onboarding & first report (the most important flow in the app)
- [ ] `/onboarding` intro → fact-find → goals → holdings → risk profile → generating: progress indicator is accurate on each step
- [ ] Fact-find validation: required fields, numeric fields reject letters, province dropdown includes all 13; Quebec selected changes anything it should
- [ ] Leave mid-onboarding, log back in → resumes at the right step, data retained
- [ ] Goals step: add / edit / delete a goal, target date in the past rejected
- [ ] Holdings step: add an account and a holding; skip step allowed
- [ ] Risk profile: all questions answerable; result matches expected bucket for an obviously conservative and obviously aggressive set of answers
- [ ] Generating page: report arrives **in this session** for a trial user; the wait feels alive (progress messaging), not a dead spinner
- [ ] Time it: note fact-find-complete → report-visible seconds. If > 90s, this is the first thing to optimize
- [ ] Report content is Canadian-correct (RRSP/TFSA/FHSA figures for the current year, provincial rates) and contains no advice language ("you should buy…")
- [ ] `ai_usage_events` gets a row with model, tokens, and `cache_read` tokens > 0 on a second generation
- [ ] `health_score_history` gets a `report` row after generation
- [ ] Refresh mid-generation → does not create a duplicate report
- [ ] Pulse user with expired trial (Account B) running onboarding → hits the gate gracefully, sees upgrade copy, can still finish tracking-only setup

### E. Dashboard home
- [ ] Health Score ring shows a number, 90-day delta reads "+X since …" or "New" for a brand-new user — never `NaN` or `undefined`
- [ ] Score recomputes after: logging a transaction, saving a snapshot, funding a goal (check `health_score_history` rows appear with source `derived`)
- [ ] Financial cards show correct totals vs what you entered; currency formatting is CAD with proper thousands separators
- [ ] Household card behaves for single and couple profiles
- [ ] TierBadge shows: "Progress trial" (A), "Pulse" (B), "Progress · Founding" (C), "Progress" (D), "Mastery" (E, F)
- [ ] ClubCard: locked teaser for A–D with upgrade CTA; unlocked "Open the Club" for E/F (link goes to `NEXT_PUBLIC_SKOOL_GROUP_URL`, or a sensible placeholder if unset)
- [ ] ReviewReminder: appears only for Mastery when the quarterly window is due; dismiss persists
- [ ] Plan stale banner appears when profile data changed after the last report; disappears after regeneration
- [ ] Pending review / approval banners only appear when a report is actually in that state
- [ ] Empty states for a brand-new user are helpful (tell them what to do first), not blank boxes
- [ ] Sidebar: all nav items resolve; Tax Year-End Pack visible for all but only fully unlocked for Mastery; upgrade CTA hidden for Mastery; active state highlights correctly
- [ ] Meeting history lists past check-ins with correct dates

### F. Cash flow & budgets
- [ ] Log a transaction (income and expense), every category; edit amount; delete; totals update immediately
- [ ] Future-dated and very old transactions are handled (rejected or bucketed sensibly)
- [ ] Week / Month toggle: numbers change and match a manual sum; week boundaries are correct (Mon–Sun or Sun–Sat, pick and verify)
- [ ] Set budgets sheet: set 3 budgets, edit one, clear one; saved rows in `category_budgets` (unique per user+category — try saving the same category twice)
- [ ] Budget bars: under budget green, near limit warning, over budget red; percentages correct
- [ ] `budget_set` achievement unlocks the first time budgets are saved (toast appears once, not on every visit)
- [ ] `first_transaction`, `log_streak_4` achievements unlock at the right time (fake by backdating transactions)
- [ ] Upload spending CSV (Progress/Mastery): sample bank CSV parses, duplicates detected, categories suggested
- [ ] Upload spending as Pulse-expired (B): 402 with `UPGRADE_REQUIRED`, UI shows upgrade copy, no partial import
- [ ] Malformed file (a .png renamed .csv, a 50MB file, an empty file) → friendly error, no 500
- [ ] Mobile: FAB visible above the safe area and keyboard, doesn't cover the last row; transaction form usable one-handed

### G. Net worth / assets
- [ ] Add account, add holding (`/api/holdings`), add fixed asset (property, vehicle), add liability; net worth total is correct
- [ ] Save a snapshot → row in `net_worth_snapshots`; `first_snapshot` achievement; Health Score updates
- [ ] Two snapshots a month apart (backdate one) → trend chart draws, `snapshot_streak_3` logic testable by backdating three
- [ ] Reduce a debt balance → `debt_reduced` achievement
- [ ] Cross a net-worth threshold ($10k, $50k) → milestone achievement, only once
- [ ] Mobile: table collapses into cards; every value still visible; edit/delete reachable
- [ ] Upload statement (Progress/Mastery): sample brokerage PDF/CSV parses; Pulse-expired gets 402

### H. Goals
- [ ] Create goal with target amount/date; progress bar math correct; edit; delete
- [ ] Mark goal achieved → `goal_achieved` achievement; emergency-fund goal fully funded → `emergency_fund_funded`
- [ ] Goals feed the Health Score (funding a goal moves the number)
- [ ] Empty state and 10+ goals both render fine

### I. Progress Report (plan)
- [ ] `/dashboard/plan` lists reports newest-first; opening one shows all sections; scroll-snap tab chips work with a thumb on mobile and don't trap scroll on desktop
- [ ] Walkthrough mode steps through sections, back/next work, exit returns to the report
- [ ] Download PDF: renders all sections, page breaks sane, Canadian $ formatting, disclaimer footer present, file name sensible
- [ ] Draft PDF (admin) vs final PDF: correct watermark/state
- [ ] Regenerate as Progress (C/D): works once; second attempt in the same month → cap message (1/mo); confirm `reportRegenCap` copy is friendly
- [ ] Regenerate as Mastery (E): no cap; SLA/priority path is used (check logs)
- [ ] Regenerate as Pulse-expired (B): 402, upgrade copy, no generation started, no `ai_usage_events` row
- [ ] Staleness endpoint flags correctly after changing income in the fact-find
- [ ] Report for a Quebec resident uses Quebec tax framing; for Alberta, no provincial sales-tax weirdness in copy

### J. Charlie / Check-in (`/dashboard/meeting`)
- [ ] Start conversation as trial (A): session created, first Charlie message appears, tone matches "AI money guide," never "advisor"
- [ ] Send 5 messages: responses coherent, reference your actual data (income, goals), streaming or loading state visible
- [ ] Apply changes flow: Charlie proposes an update → apply-changes page shows a diff → confirm → profile updated → stale banner appears on the report
- [ ] Reject changes → nothing written
- [ ] Soft cap: temporarily set the limit to 3 in `entitlements.ts` locally, hit it → friendly cap message, no crash; reset the limit
- [ ] Pulse-expired (B): start → 402 with `ENTITLEMENT_COPY.charlie`; UI shows upgrade card, not an error toast
- [ ] Mastery (E): conversation counter (not message counter) increments in `ai_usage_events`
- [ ] Pending annual review prompt appears when due, and not otherwise
- [ ] Error boundary: kill your network mid-message → recoverable error UI, conversation history preserved on reload
- [ ] Very long message (2,000 chars) and empty message: handled
- [ ] Mobile: input stays above keyboard, bubbles readable, no horizontal scroll

### K. Market context
- [ ] `/dashboard/market-context` and `/guide` load; quotes, movers, sectors, news populate (or show a clear "unavailable" if an API key is missing)
- [ ] Search a ticker (e.g. `SHOP.TO`), add to watchlist, remove
- [ ] Company page for a symbol renders; historical chart draws at mobile width
- [ ] Commentary reads as education, not a recommendation; disclaimer present
- [ ] Confirm which tiers see this page and that gating matches what `BUSINESS_PLAN.md` says

### L. Tax Year-End Pack
- [ ] Mastery (E/F): full pack — RRSP/TFSA/FHSA room estimates match what you'd compute by hand for the fixture, slips checklist, deadlines for the current tax year (RRSP deadline = 60 days into next year), PDF export downloads
- [ ] Test with Ontario, Quebec, Alberta, BC profiles — provincial notes differ where they should
- [ ] Edge cases: no RRSP contributions, FHSA never opened, over-contribution → warning language, not silence
- [ ] Progress (C/D) and trial (A): teaser view with upgrade CTA; no real numbers leak
- [ ] Sidebar link visible for all tiers, page behaves per tier

### M. Settings
- [ ] Profile edits save (name, province, household); email change flow if supported
- [ ] Tier card shows correct label and price for A–G; trial shows days remaining; founding shows "Founding member"; Mastery annual shows "Academy included"
- [ ] TIER_FEATURES list matches the marketing pricing section exactly (same source — visually confirm)
- [ ] Consistency Guarantee card: score/progress from `/api/guarantee/status`; brand-new user reads 0/90 days, not an error
- [ ] Academy card: for G shows "Active"; for F shows "Included"; for others shows "Get Mosaic Academy" → checkout
- [ ] Upgrade buttons: Progress monthly/annual, Mastery monthly/annual, Academy — each opens the right Stripe Checkout with the right price and CAD
- [ ] Manage billing → Stripe portal opens for a paying user; hidden or disabled for a never-paid user
- [ ] Sign out works from settings
- [ ] Data export / account deletion: confirm whatever you promise in the privacy policy actually exists here

### N. Billing — Stripe (test mode, run with the webhook forwarder on)
- [ ] Progress founding monthly ($8): checkout → `checkout.session.completed` → `subscription_tier = progress`, `is_founding_member = true`, `subscription_interval = month`, `current_period_end` set, `trial_ends_at` cleared/ignored; subscription-confirmed email arrives
- [ ] Progress annual ($170): `subscription_interval = year`
- [ ] Mastery monthly ($44): tier = mastery, `academy_access = false`
- [ ] Mastery annual ($350): tier = mastery, `academy_access = true`; Skool webhook fires with `level` indicating Club + Academy (see webhook.site)
- [ ] Academy standalone ($26 / $260): tier unchanged, `academy_access = true`; Skool webhook fires with academy level
- [ ] Mastery monthly → Skool webhook fires with Club level
- [ ] Founding cap: set `FOUNDING_CAP=1`, buy once, then `/api/founding/status` shows closed and checkout with `founding: true` falls back to list price (or refuses) — pricing section reflects sold out
- [ ] Founding deadline: set `FOUNDING_DEADLINE` to yesterday → same closed behaviour
- [ ] Upgrade Progress → Mastery via portal or new checkout → tier flips, no double subscription
- [ ] Downgrade Mastery → Progress → `academy_access` revoked if it came from Mastery annual; Skool payload indicates removal (or you handle manually — decide and document)
- [ ] Cancel at period end in portal → `subscription_status = canceling/active` until `current_period_end`, then Pulse after `customer.subscription.deleted`; all data intact; Charlie gated; tracking works
- [ ] Immediate cancel → Pulse immediately
- [ ] Failed payment (`4000 0000 0000 0341`) → `past_due` handled: what does the user see? Confirm no hard lockout on day one and a clear "update card" prompt
- [ ] 3DS card (`4000 0027 6000 3184`) completes checkout
- [ ] Refund a payment in the Stripe dashboard → confirm you know the manual steps for the 30-day guarantee (tier downgrade, note)
- [ ] Webhook replay: resend the same event from the Stripe dashboard → idempotent, no duplicate emails
- [ ] Webhook with bad signature → 400
- [ ] Checkout as a logged-out user → redirected to login, then back to checkout
- [ ] Stripe Checkout shows CAD, correct product names, and your business name
- [ ] Coupon/promo field: present or intentionally hidden
- [ ] Legacy price IDs (`STRIPE_PRICE_PLAN_*`) still map to Progress via `tierFromPriceId` for any existing test subscribers

### O. Trial lifecycle
- [ ] Fresh signup (A): `trial_ends_at` ≈ +14 days; `resolveEntitlements` → `effectiveTier = progress`, `trialActive = true`
- [ ] Set `trial_ends_at` = now + 3 days → run `/api/cron/trial-lifecycle` with `Authorization: Bearer $CRON_SECRET` → response `reminded: 1`; day-10 email arrives with a working upgrade link
- [ ] Set `trial_ends_at` = 6 hours ago → run cron → `expired: 1`; expired email arrives
- [ ] Set `trial_ends_at` = 3 days ago → run cron → not counted again (window is 24h)
- [ ] After expiry: Charlie, report generation, uploads gated; Cash Flow, Net Worth, Goals, Health Score all still work; dashboard shows a non-nagging upgrade path
- [ ] Paying user with a stale `trial_ends_at` in the past is **not** treated as expired (stored tier wins)
- [ ] Cron without bearer → 401

### P. Emails (send every one to yourself, open on phone + desktop + Gmail web)
- [ ] Waitlist welcome + PDF
- [ ] Nurture steps 1–5: run `/api/cron/nurture` five times with `last_nurture_at` backdated each time; `nurture_step` increments to 5 and then stops; content order correct; links work; founding email shows $8
- [ ] Trial started, trial day 10, trial expired, subscription confirmed
- [ ] Report ready / approval emails if enabled
- [ ] Weekly newsletter (`/api/newsletter/generate`) — content reads as education, disclaimer present
- [ ] Every email: sender name and domain correct, SPF/DKIM pass (check "show original" in Gmail), not in spam, unsubscribe link present and functional, no `{{placeholder}}` or `undefined`
- [ ] Dark mode rendering in Apple Mail

### Q. Crons & background jobs
- [ ] Each cron in `vercel.json` returns 200 with the bearer secret and 401 without: `trial-lifecycle`, `nurture`, `newsletter/generate`, `picks-scan`, `picks-congress`, `picks-label`
- [ ] Confirm Vercel project shows all 7 crons after deploy; check the execution log the next day
- [ ] Function durations: report generation completes inside the 60s limit for a full fact-find; commentary/newsletter inside 120s

### R. Gamification
- [ ] Every achievement key can be triggered and shows the UnlockToast once: `first_transaction`, `log_streak_4/12/26`, `first_snapshot`, `snapshot_streak_3/6/12`, `debt_reduced`, `net_worth_10k…1m`, `emergency_fund_funded`, `goal_achieved`, `budget_set`, `under_budget_month_1/3`
- [ ] `/api/gamification/summary` totals match `user_achievements` rows
- [ ] Toast respects the mobile safe area and auto-dismisses; multiple unlocks queue rather than overlap
- [ ] Streak logic across a week boundary and a month boundary (backdate rows to test)
- [ ] Consistency Guarantee score matches: 12 weekly logs + 3 snapshots → what percentage? Write down the expected number and confirm

### S. Admin approval queue
- [ ] Admin (H) sees `/admin/approval-queue`, can open a report, approve/reject, add notes; user sees status change
- [ ] Non-admin hitting `/admin/*` or `/api/approval/*` → 403/redirect, not data
- [ ] Draft PDF renders for admin review
- [ ] Confirm QA queue does **not** delay trial-user report delivery

### T. Security & data isolation (run once, re-run before launch)
- [ ] With Account A logged in, call each API route with Account B's IDs (plan, session, goal, transaction, snapshot) → 403/404, never data. RLS is your last line — test it, don't assume it
- [ ] Every `/api/*` route unauthenticated → 401 (script it: loop the route list with `curl`)
- [ ] `/api/export/*` routes: gated to admin or removed
- [ ] Search the production client bundle for secrets: `SUPABASE_SERVICE_ROLE`, `STRIPE_SECRET`, `ANTHROPIC`, `RESEND` must not appear (`rg` inside `.next/static`)
- [ ] `.env.local` not committed; `.env.example` has no real values
- [ ] Upload endpoints reject > size limit and non-CSV/PDF MIME types
- [ ] Rate limiting or at least a sanity cap on `/api/conversation/message` and `/api/waitlist` (try 50 rapid requests)
- [ ] Supabase Auth: email confirmation required; password min length; redirect URLs whitelist only your domains
- [ ] HTTPS everywhere, HSTS header present on the production domain
- [ ] Twitter/X OAuth callback (`/api/picks/twitter/callback`) — if not used, disable it

### U. Mobile-specific pass (real devices, not just DevTools)
- [ ] Add to Home Screen on iOS → icon, name, splash look right; status bar colour matches theme
- [ ] Notch/safe area: sidebar bottom nav, FAB, toasts, sheets all clear the home indicator
- [ ] Keyboard: no input hidden behind keyboard on fact-find, transaction form, Charlie, budgets sheet
- [ ] Tap targets ≥ 44px on nav, chips, table row actions
- [ ] Landscape on phone: nothing unusable
- [ ] Pull-to-refresh doesn't fire accidentally inside scroll containers
- [ ] Charts have min-heights and are legible at 360px wide; tooltips work with touch
- [ ] Bottom sheets (budgets) dismiss by swipe and by backdrop tap
- [ ] Low-power / slow 3G throttle: loading states appear, no blank white screens > 1s

### V. Performance & accessibility
- [ ] Lighthouse on `/`, `/waitlist`, a calculator, `/dashboard`: Performance ≥ 85 mobile, Accessibility ≥ 95, SEO ≥ 95
- [ ] Keyboard-only navigation through signup → onboarding → dashboard: focus visible, no traps
- [ ] Screen reader spot-check (VoiceOver): Health Score ring announces the number; tier badge and buttons have labels
- [ ] Colour contrast on budget bars and tier badges passes AA
- [ ] Reduced-motion preference respected on animations/toasts
- [ ] Images optimized (next/image), no 1MB+ assets in the bundle

### W. Compliance copy sweep
- [ ] `rg -i "advisor|adviser|financial planner|we recommend|guaranteed return|you should buy|you should sell" src/` — every hit is either intentional (your credentials on the trust section) or removed
- [ ] Charlie system prompts reviewed against the compliance checklist; ask Charlie "Should I buy XEQT or VFV?" and "Which is better, RRSP or TFSA for me?" — it must educate and defer, not recommend
- [ ] Every report PDF, tax pack PDF, and email has the disclaimer
- [ ] "Mosaic University" appears nowhere; "Mosaic Academy" everywhere
- [ ] No "portfolio demo" or placeholder copy on any public page

### X. Automated & deploy
- [ ] `npm run test` — all unit tests green (233 at last run)
- [ ] `npx tsc --noEmit` — exit 0
- [ ] `npm run lint` — clean
- [ ] Playwright smoke (`tests/integration/pricing-smoke.test.ts`, `user-journey.test.ts`) against a preview deploy
- [ ] `npm run build` succeeds with production env; check the build output for unexpectedly large routes
- [ ] Preview deploy on Vercel with staging env → repeat sections A, C, D, N on the deployed URL (not localhost)
- [ ] Error monitoring (Sentry or Vercel logs) receiving events; trigger a deliberate error and find it

### Sign-off criteria (all must be true before Phase 6)
- [ ] Zero P0 bugs (data loss, wrong charge, wrong tier, security)
- [ ] Zero P1 bugs in: signup, onboarding, first report, checkout, cancel, Charlie gating
- [ ] Fact-find → first report under 90 seconds for a trial user
- [ ] Every account A–I behaves exactly per the tier table in `BUSINESS_PLAN.md` §3
- [ ] All emails land in inbox on Gmail, iCloud, and Outlook
- [ ] You personally used the app daily for 7 days on your phone as a Pulse user and didn't hit a wall

---

## Phase 2 — Legal & compliance foundation (parallel with Phase 1)

*The original plan skipped this entirely. It is a launch blocker, not a nice-to-have.*

- [ ] Incorporate or register a business entity; open a business bank account tied to Stripe
- [ ] Replace the placeholder `/privacy` and `/terms` with real PIPEDA-compliant policy and ToS (review Quebec Law 25 if serving Quebec)
- [ ] Remove "portfolio demo" language from `README.md` and any public surface before charging real users
- [ ] Write a one-page **content compliance checklist** (used on every post, every Charlie prompt change):
  - education framing, no security-specific recommendations, no performance promises, standard disclaimer
  - never "advisor / planner / we recommend you buy/sell / which account to prioritize"
  - Charlie is "your AI money guide," never "advisor"
- [ ] Confirm your own CFP/CIM credentials appear only as company credibility, never as a rendered service
- [ ] Confirm the name **Mosaic Academy** (not "University" — restricted in ON/BC; "Mosaic Institute" is an existing Toronto charity)
- [ ] CIPO trademark search for "Mosaic Finance" and "The Money Mosaic"; file if clear

---

## Phase 3 — Brand & media arm setup (The Money Mosaic)

**Original step: "Create socials for social media arm — separate from the main brand."** Kept, reframed: *adjacent, not disconnected.* A fully separate brand loses 90%+ of the audience at the bridge; "The Money Mosaic" makes the reveal frictionless.

- [ ] Check handle availability simultaneously: TikTok, Instagram, YouTube, X — `themoneymosaic` (fallbacks: Net Worth North, Loonie Logic, The Loonie Ledger)
- [ ] Register all handles the same day, even ones you won't use yet
- [ ] Logo: derive from the app emblem — keep tile motif + green/charcoal/gold, new tile arrangement + lowercase wordmark. Commission a **flat vector** version (must read at ~36px)
- [ ] Build one Canva template family (cover, mid-roll chart card, CTA end card) in the brand palette. Never deviate.
- [ ] Record a 3-second tile-assembly intro sting in CapCut
- [ ] Decide the voice: your own voiceover (recommended — far less identifiable than your face) or one hired VO artist. **Never pure TTS.**
- [ ] Write the bio for every platform with one CTA only: the free RRSP/TFSA/FHSA guide link
- [ ] Set up a link-in-bio page that points to `/waitlist` (later `/signup`)

---

## Phase 4 — Content system

**Original steps: "Create content research engine" and "Create content generator."** Kept, demoted to *drafting tools.* The human layer to protect is the script voice.

- [ ] Research engine: a weekly sweep of CRA updates, Canadian fintech news, r/PersonalFinanceCanada threads, and your own Charlie question logs → ranked list of 10 hooks
- [ ] Generator: produces draft scripts + on-screen numbers from a hook. Output is never posted verbatim.
- [ ] Define the niche explicitly in writing: **Canadian money mechanics with worked examples and real dollar figures.** Not "budgeting tips."
- [ ] Build a 30-day content bank before posting anything (so a bad week doesn't break cadence)
- [ ] Content pillars (rotate): RRSP/TFSA/FHSA math · CPP/OAS timing · provincial tax quirks · debt payoff math · "what your Health Score is telling you" (soft app tie-in)
- [ ] Every script gets a 10-minute human pass on hook + phrasing, then the compliance checklist
- [ ] Production rhythm: batch-record voiceover weekly, edit in CapCut, schedule 5 posts/week
- [ ] Repurpose: each short → a Money Mosaic newsletter blurb → an Academy lesson outline (this is where "expanded content posted on our socials" comes from later)

---

## Phase 5 — Owned traffic & nurture

**Original step: "Offer something free — already have the PDF."** Kept and expanded. The free layer is now: PDF + calculators + Pulse (free forever) + 14-day reverse trial.

### Already built
- [x] Free RRSP/TFSA/FHSA PDF delivered on waitlist signup
- [x] 5-step nurture sequence (`/api/cron/nurture`) — PDF → Canadian money mistakes → how Mosaic works → founding $8 → trial reminder
- [x] Calculators: `/calculators/fhsa`, `/calculators/rrsp-vs-tfsa`, `/calculators/cpp-timing`
- [x] `sitemap.xml` and `robots.txt`
- [x] Newsletter opt-in filter, waitlist included

### Your side
- [ ] Verify Resend domain (SPF/DKIM) so nurture and trial emails land in inbox, not spam
- [ ] Read each nurture email once and tweak the voice to sound like you
- [ ] Submit the sitemap to Google Search Console; watch the three calculator pages for impressions
- [ ] Add a calculator link to every relevant social post caption
- [ ] Keep the weekly market newsletter running — it is your retention channel for the waitlist

---

## Phase 6 — Launch: first paying subscriber

**Original step: "Start generating content through social media pages and get people to join waitlist for app."** Kept, sequenced *after* Phases 1–5 are green.

- [ ] Gate check: Phase 1b test run signed off (all sections A–X + sign-off criteria), Phase 2 legal live, 30-day content bank ready
- [ ] Set `FOUNDING_DEADLINE` (launch day + 14 days) and flip `NEXT_PUBLIC_LAUNCH_MODE=live`
- [ ] Send the "doors open" email to the entire waitlist: founding Progress $8/mo, first 200, 14-day deadline, reverse trial, 30-day refund, Consistency Guarantee
- [ ] Post the launch-week story on socials: **The 90-Day Canadian Money Reset**
- [ ] Manually onboard the first 10 subscribers — reply personally, ask what confused them, fix it that week
- [ ] Track daily: signups, trial starts, first reports delivered, trial → paid, founding spots claimed
- [ ] Day 0 obsession: if trial users aren't getting a report in their first session, stop everything and fix that

**First subscriber milestone: one person on founding Progress with a delivered report.**

---

## Phase 7 — Mastery → Mosaic Money Club (first Skool members)

**Original step: "Start with beginner Skool community that drives people to stay consistent with Mosaic."** Kept, restructured. The Club is a **Mastery benefit — never sold standalone.** That kills the cheap-then-reprice problem and seeds the room with committed, already-tracking users.

- [ ] Open the Skool group on **Pro** ($99 USD/mo — needed for Zapier). Name: **Mosaic Money Club**. Set to private/free with the membership question "What email is your Mosaic account under?"
- [ ] Build the Zapier flow: webhook → Invite Member; annual/Academy → Unlock Course. Paste the hook URL into `SKOOL_ZAPIER_HOOK_URL`; paste the group URL into `NEXT_PUBLIC_SKOOL_GROUP_URL`
- [ ] Prepare the room before anyone enters: welcome post, weekly net-worth check-in thread template, streak challenge rules, first 90-Day Reset cohort calendar
- [ ] **Do not open the Club until 30–50 Mastery subscribers exist.** An empty gamified community is worse than none.
- [ ] Until then: the dashboard shows the locked Club teaser on Progress (already built) — that teaser *is* the upgrade prompt
- [ ] When you open: invite all Mastery members the same day so the room is full on day one. The first 200 Mastery members are the founding Club cohort (badge, not discount)
- [ ] Founder present daily for the first 90 days — this is a non-negotiable time cost
- [ ] Weekly: export Skool members, compare against active Mastery/Academy in Stripe, remove lapsed members after a 7-day grace period

**First Club members milestone: 30–50 Mastery subscribers invited on the same day, first weekly check-in thread has replies.**

---

## Phase 8 — Mosaic Academy

**Original step: "Add a second community at higher cost… call it Mosaic University."** Kept as **Mosaic Academy** (legal rename), placed *last*, and delivered as locked courses **inside the same Skool group** — not a second community.

- [ ] Gate check: Club has daily activity without you prompting it
- [ ] Turn the top-performing social content into course modules (your repurposing pipeline from Phase 4 feeds this directly)
- [ ] Build the first 6–8 lessons: products & frameworks — registered accounts deep-dive, tax brackets, insurance basics, debt math, investing frameworks, career-in-finance primer
- [ ] Lock them in the Skool classroom; Zapier "Unlock Course" opens them for Mastery annual and Academy buyers
- [ ] Sell standalone at $26/mo or $260/yr via Settings (already built) and a marketing page when ready; raise to $44/$440 once the library has depth
- [ ] Announce to Progress and Mastery monthly members: "included on Mastery annual" is the upgrade lever

---

## Phase 9 — Growth loops (after ~100 paying users)

- [ ] Referral: "give a month, get a month," reward triggered on the referred user's *paid* conversion, prompted at a win moment (score improves / report delivered)
- [ ] Affiliate revenue on the media arm: EQ Bank, Wealthsimple, brokerage referrals — makes content self-funding
- [ ] Consider the on-camera hire: the highest-leverage future spend once revenue supports it
- [ ] Next price rung: Progress $17 → $26 only after per-category budgets have proven sticky or bank sync ships; grandfather everyone at $17

---

## Metrics & decision points

| Metric | Target / rule |
|---|---|
| Waitlist before flipping live | 1,000 emails |
| Reverse trial → paid | 8% on-track; **<4%** = fix time-to-first-value, not price |
| Founding Progress | 200 spots or 14 days, whichever first |
| Club opens | 30–50 Mastery subscribers |
| Academy launches | Club has daily activity without prompting |
| Referral program | ~100 paying users |
| Blended AI cost | alarm at ~$4/user/mo; Mastery tail alarm at ~$10 |
| Gross margin per Progress user | >85%, measured not modeled |

**Kill/scale rule (write the number now):** if after 90 days of consistent posting there are fewer than **[X]** waitlist signups, change format or platform. Don't drift.

**North Star:** paying app subscribers. Not followers, not waitlist size.

---

## Evaluation of the original steps

| Original step | Verdict | Where it landed |
|---|---|---|
| Create content research engine | Keep, as a drafting tool | Phase 4 |
| Create socials, separate from main brand | Keep, reframed to *adjacent* (The Money Mosaic) | Phase 3 |
| Create content generator | Keep, drafts only — human pass mandatory | Phase 4 |
| Refine Mosaic App | Keep — **moved to first** | Phase 1 |
| Generate content → waitlist | Keep, after app + legal are green | Phase 6 |
| Offer something free (PDF) | Keep, expanded: PDF + calculators + Pulse + trial | Phase 5 |
| Drive people to app and Skool | Keep, one CTA per stage | Phases 5–7 |
| Beginner Skool community | Keep, restructured: Mastery benefit, never sold standalone | Phase 7 |
| "Mosaic University" second community | Keep, renamed **Mosaic Academy**, same group, locked courses, last | Phase 8 |
| *(missing)* Legal & compliance | Added — launch blocker | Phase 2 |
| *(missing)* Email nurture, calculators, SEO | Added — already built | Phase 5 |
| *(missing)* Founding urgency with teeth | Added — $8 founding vs $17 list, built | Phase 6 |
| *(missing)* Referral, affiliates, kill rule | Added | Phase 9 / Metrics |
