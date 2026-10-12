# Mosaic — Complete Business To-Do

> **Archived 11 October 2026.** Superseded by [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/hormozi-playbook.md](docs/hormozi-playbook.md). The launch test checklist moved to [docs/qa/full-test-run.md](docs/qa/full-test-run.md). Keep this file for history. Do not treat it as current.
>
> Stale facts: trial is **7 days** (not 14); Mastery is hidden on the public site; auth lands on `/dashboard`. Open "right now" items were folded into roadmap Phase 0.

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
See [docs/qa/full-test-run.md](docs/qa/full-test-run.md). Nothing in launch happens until that checklist is signed off.

### Unit economics
- [ ] After a week of real usage, query `ai_usage_events` and compute cost per active paying user. Alarm thresholds: blended > ~$4/user/mo; Mastery tail > ~$10/user/mo. Tighten soft caps if breached.

---

## Phase 1b — Your full test run

Moved to [docs/qa/full-test-run.md](docs/qa/full-test-run.md). Do not maintain a second copy here.

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
