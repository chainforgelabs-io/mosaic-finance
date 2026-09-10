# Mosaic Finance — Growth & Revenue Plan

*Last updated: September 2026*

## 1. The One-Line Strategy

Build a faceless Canadian personal-finance media brand (**The Money Mosaic**) that
feeds a single funnel: content → free guide/waitlist → **Mosaic app** (Pulse, with a
14-day reverse trial of Progress) → **Mastery** (app + Mosaic Money Club) →
**Mosaic Academy**.

One CTA per stage. Every asset shares the same visual DNA (tiles, green/charcoal/gold)
so the media brand pre-sells the app without naming it.

**Free tracks. Paid thinks.** Tracking, budgets, net worth, holdings (manual), goals,
and gamification are free forever. Charlie, the Progress Report, and statement parsing
are paid. The Club is a Mastery benefit — never sold standalone.

---

## 2. Positioning

**Product:** Gamified financial tracking for Canadians — conversational onboarding,
net worth dashboard, AI Progress Reports (Charlie). Education, not advice.

**Wedge:** Canadian-specific money mechanics. Not "budgeting tips" — RRSP vs TFSA vs
FHSA math, CPP timing, provincial tax quirks, worked examples with real dollar figures.

**Audience:** Canadians who find advisors too expensive ($3k–$10k/yr), robo-advisors
too passive, and generic AI too generic.

**Charlie** is described as an "AI money guide/assistant," never an "advisor."
Founder CFP/CIM credentials may appear as company/background credibility, never as
a rendered personal service. No human CFP/CIM review on any tier — it re-imports
advice/title regulation and destroys margin.

---

## 3. Pricing & Offer

All prices CAD. All price points sit on the **GG33 ladder** (digit sum reduces to 8):
usable monthly rungs include $8 / $17 / $26 / $35 / $44 / $53. Future increases
move along this ladder (e.g. Progress $17 → $26), never to arbitrary amounts.

### 3.1 Tiers

| | **Pulse** | **Progress** | **Mastery** |
|---|---|---|---|
| **Monthly** | $0 | **$17** (founding: **$8** locked for life, first 200) | **$44** |
| **Annual** | $0 | **$170** (founding: **$80**) | **$350** |
| **Core promise** | See where you stand — and stay consistent. | Know exactly what to do next. | Don't just know — do it, with people who are doing it too. |
| Tracking, budgets, net worth, holdings (manual), goals | ✅ | ✅ | ✅ |
| Full gamification, live Financial Health Score | ✅ | ✅ | ✅ |
| Canadian calculators, newsletter | ✅ | ✅ | ✅ |
| 14-day reverse trial of Progress | ✅ | — | — |
| Fact-find, 8-section Progress Report + PDF, monthly regen | — | ✅ | ✅ |
| Charlie | — | included (~100 msg/mo soft cap) | unlimited (~100 conv/mo soft cap) |
| Statement / receipt parsing | — | ✅ | ✅ |
| Priority generation, quarterly guided reviews | — | — | ✅ |
| Tax year-end pack | — | — | ✅ |
| Mosaic Money Club | — | — | ✅ |
| Mosaic Academy | — | — | included on **annual** only |

**Pulse** is a lead magnet, not a lite product. It solves one narrow problem
completely (see and track your money) and reveals the next problem only paid solves
(*I can see my numbers, but I don't know what they mean*). Tracking features are
DB reads with near-zero cost — they are the habit and switching-cost engine. Do
not strip them from free.

**Progress** is the volume tier. Display annual by default. Sell "Charlie included"
— never "up to N conversations." Enforce the ~100 messages/month soft cap behind
the scenes; only surface it to the tiny fraction who hit it.

**Mastery** is the anchor. The Club is what makes it a different *thing*, not more
chats. $350/yr (vs $44 × 12 = $528) is a deeper annual discount than two months
free, on purpose: communities need committed members.

### 3.2 Adjacent product — Mosaic Academy (standalone)

For people who want the education without the tracking app (e.g. entering the
financial sector). Sold on mosaicfinance.ai via Stripe in CAD.

| | Launch | Once the course library has depth |
|---|---|---|
| Monthly | **$26** | **$44** |
| Annual | **$260** | **$440** |

Academy standalone members land in the same Skool group, so they get Club access
as a side effect. Zero marginal cost — every dollar is margin.

**Not "Mosaic University"** — "university" is provincially restricted in Ontario,
BC, and elsewhere; "The Mosaic Institute" is an existing Toronto charity.

### 3.3 Why these numbers

- **$17** sits beside YNAB / Monarch (~$15 USD/mo, ~$18–20 CAD-equivalent) but
  Mosaic lacks bank sync. Pricing *above* synced competitors for a manual tool
  would price us out. **$17 stays standard.** $26 is the *next* rung, unlocked
  only after per-category budgets or bank sync ship — then grandfather everyone
  at $17 and run the "price goes up" mechanic a second time.
- **Founding Progress at $8** (with $17 struck through) gives the lock real teeth.
  "First 200 lock $17 forever" is toothless if $17 stays the list price. Cap of
  200 + a hard deadline (launch week / 14 days, whichever first) + a live counter.
  Max forgone revenue ≈ $1,800/mo across 200 people who become evangelists and
  never churn on price. Founding scarcity on Progress is the price lock; founding
  scarcity on Mastery is "first 200 Mastery members are the founding Club cohort."
- **$44 / $350** on Mastery holds full value — do not discount the anchor as a
  founding rate. The Club + Academy (annual) is the value stack: app ($17) +
  community + quarterly reviews + year-end pack + Academy, framed as far more
  than $44 of value.
- **Margins:** blended AI cost-to-serve is modeled at ~$1.20/active paying
  user/month with prompt caching on chat and Batch API on *scheduled* report
  regen (Sonnet 5 at $2/$10 per MTok; cache reads $0.20). Unoptimized ~$1.75–$2.
  A heavy power user runs ~$3.50–$7. At $17–$44, gross margin stays above ~85%.
  "Unlimited Charlie" is financially safe only on Mastery, and only with the
  fair-use soft cap. These figures are modeled, not measured — instrument real
  per-user token counts in week one.
- **GG33:** $0 / $8 / $17 / $26 / $44 / $80 / $170 / $260 / $350 / $440 all
  reduce to 8 (or are $0).

### 3.4 The offer around the tiers

**14-day reverse trial (card-free).** Every Pulse signup gets 14 days of full
Progress — fact-find, 8-section report, Charlie, parsing. Card required only at
subscribe. After 14 days they drop to Pulse unless they pay. Prompt the paywall
at the win moment (report delivered), not at signup. Reverse-trial conversion
benchmarks are ~4–6% good / 8–12% great (ChartMogul 2026) — treat **8%** as
on-track and **below ~4%** as a time-to-first-value problem, not a price problem.
Do not use the unsupported "~24% median" figure in funnel math.

**The Consistency Guarantee (loud).** "Log your spending weekly and complete your
monthly net-worth snapshot for 90 days. If your Financial Health Score hasn't
improved, full refund." Tied to *their* tracking behaviour and *our* internal
Score — never to investment returns or dollars saved. Measurable in-app. Do
**not** use "follow your action steps" (unverifiable; drifts toward advice).

**30-day no-questions refund** on any first payment, in addition to the guarantee.

**Bonuses (name them):**

1. The Canadian Money Mechanics Toolkit — FHSA, RRSP-vs-TFSA, CPP-at-60-vs-65
   calculators (also the SEO engine).
2. Life-Event Playbooks — new job, new baby, first home, inheritance, separation.
3. Tax Year-End Pack (Mastery).
4. Mosaic Money Club (Mastery).
5. Founding Member badge + locked $8 Progress price + roadmap input (founding
   Progress cohort); founding Club badge (first 200 Mastery).

**Launch headline:** *The 90-Day Canadian Money Reset* — the offer; Progress /
Mastery are the vehicles.

### 3.5 What is gated vs what is not

| Gate this | Do not gate this |
|---|---|
| Charlie, Progress Report generation, monthly regen | Tracking, budgets, net worth, **manual holdings**, goals |
| Statement / receipt parsing (Claude vision) | Live Financial Health Score (derived from tracked data — cheap) |
| Priority generation, quarterly reviews, tax year-end | Score *history* (required for the guarantee) |
| Club (Mastery), Academy (annual Mastery or standalone) | Gamification (all 17 achievements + streaks) — it *is* the retention engine |

Holdings feed net worth. A net worth dashboard without holdings is not a net
worth dashboard. Gate the *parse*, not the data. Meter report regeneration, not
the Score — a 6-month score refresh would make the 90-day guarantee impossible.

### 3.6 Compliance on copy

**Safe:** Pulse / Progress / Mastery; "AI-powered financial guidance / education /
analysis"; "Charlie, your AI money guide"; Score-based guarantee.

**Do not use:** "AI financial advisor," "financial planner/advisor," "personalized
asset allocation," "which account to prioritize," "we recommend you buy/sell."
CSA rules are technology-neutral — tailored recommendations about specific
securities or account actions cross the NI 31-103 line. Keep Charlie on the
education/analysis side.

---

## 4. Phase 1 — Polish the App (before scaling content)

The app must be "confidently chargeable" before traffic arrives. Finance audiences
don't give second chances.

- [ ] Audit onboarding → first Progress Report flow end-to-end; kill friction.
      **Day 0 is the conversion window** (RevenueCat: 55% of trial cancellations
      happen on Day 0). Front-load the win: Score + report inside the first session.
- [ ] **Verify the QA queue does not gate user delivery.** Generation currently
      inserts a 7-day deadline. A reverse-trial user whose report lands on day 8
      is a cancelled trial. First reports are **real-time, always**.
- [ ] Real entitlement gating: Pulse vs Progress vs Mastery (Charlie soft caps,
      report generation, parsing). Today most gating is copy only.
- [ ] Persist **Health Score history** so the Consistency Guarantee is measurable
      on the dashboard.
- [ ] Per-category budgets (the one feature gap that makes "budgeting tool" true
      and gives Pulse a daily reason to open).
- [ ] Tax year-end pack — build it, or pull it from Mastery copy.
- [ ] Stripe checkout, portal, and webhooks on Pulse / Progress / Mastery +
      Academy standalone (CAD).
- [ ] Prompt caching on Charlie (fact-find re-sends full history every turn;
      caching cuts that cost ~two-thirds). Batch API **only** for scheduled
      monthly regenerations — never for first reports or trial reports.
- [ ] Instrument per-user token counts in week one. Change the plan if blended
      cost-to-serve exceeds **~$4/user/month** or the Mastery tail exceeds
      **~$10/user/month**.
- [ ] Legal: business entity, PIPEDA-compliant privacy policy, real ToS,
      Quebec Law 25 review.
- [ ] Referral loop: "give a month, get a month," **triggered on the referred
      user's paid conversion** (not signup). Surface the prompt at a win moment
      (score improves / report generated). Launch once ~100+ paying users exist.
- [ ] Email nurture (Resend already integrated): 5–7 message sequence —
      PDF delivery → Canadian money mistakes → how Mosaic works → founding-member
      offer / reverse-trial reminder.

**Exit criteria:** a stranger can go from waitlist email → reverse trial → first
report in-session → paid subscriber with zero manual intervention, and margin
per user is a measured number.

---

## 5. Phase 2 — The Money Mosaic (media brand)

### Brand

- **Name:** The Money Mosaic — independent-feeling, but the "mosaic" bridge to the
  app is frictionless when revealed.
- **Logo:** derived from the app emblem, not identical. Keep tile motif and
  green/charcoal/gold palette; new tile arrangement + lowercase wordmark. Flat vector
  version for social avatars (must read at ~36px). Tile-assembly animation as video intro.
- **App emblem stays exclusive to the app.**
- Before locking in: check handle availability (TikTok/IG/YouTube/X) and CIPO trademark.

### Content system (faceless — hard constraint)

Trust substitutes for a face, in priority order:

1. **Real human voiceover** — my voice or one hired VO artist, never pure TTS.
   TTS is what triggers the "AI slop" penalty from both algorithms and viewers.
2. **Signature visual system** — one Canva/CapCut template family (brand colors,
   icon style, chart style). Recognizable in the first half-second without the handle.
3. **Specificity over motivation** — worked examples with real numbers.
   "The FHSA + RRSP stack that saves an Ontario first-time buyer $11,300," not
   "5 budgeting tips."

**Pipeline:** research engine + generator produce *drafts*; every script gets a human
pass on hooks and phrasing before recording (~10 min/video). Never post generator
output verbatim.

**Compliance checklist for every post:** education framing, no security-specific
recommendations, no performance promises, standard disclaimer. Provincial securities
regulators watch finfluencer content.

### Owned traffic (parallel, compounding)

- **SEO calculators** on mosaicfinance.ai: FHSA contribution, RRSP vs TFSA,
  CPP at 60 vs 65. High-intent Canadian searches, weak competition, each ends in
  the PDF/waitlist CTA. Recharts already in the stack.
- **Newsletter** (already built on Resend) as the retention channel for waitlist.
- **Affiliate revenue** on the media arm (EQ Bank, Wealthsimple, brokerage referrals)
  to make content self-funding before the app converts.

---

## 6. Phase 3 — Funnel & Mosaic Money Club

### The funnel (one CTA per stage)

```
Money Mosaic content
        ↓  (single CTA: free guide)
Free RRSP/TFSA/FHSA PDF + waitlist
        ↓  (email nurture)
Mosaic app — Pulse + 14-day reverse trial of Progress
        ↓  (paywall at report delivery / trial end)
Progress ($17, or $8 founding)
        ↓  (in-app Club teaser)
Mastery ($44 / $350) → Club provisioned
        ↓  (Club has daily activity)
Academy launches — included on Mastery annual; also $26/$260 standalone
```

### One Skool group, two levels

**One group — Mosaic Money Club — on Skool Pro (~$99 USD / ~$135 CAD/mo).**
Two access levels inside it. Do **not** create a second group. Do **not** sell
the Club standalone (that was the old cheap-then-reprice path; it is retired).

**Level 1 — The Club (community).** Feed, weekly net-worth check-in threads,
streak challenges tied to Mosaic gamification, 90-Day Canadian Money Reset
cohorts. Access **only through Mastery** (monthly or annual).

**Level 2 — The Academy (courses).** Locked classroom: expanded versions of
top-performing social content; advanced products and frameworks. Unlocked by
Mastery **annual** or by Academy standalone purchase.

Why the Club is a Mastery benefit, not a cheap paid community:

- Nothing to reprice later — the old plan's "cheap tier goes free" would have
  burned early payers.
- Makes the $44 anchor a different product, not a feature ladder.
- Seeds the room with already-committed, already-tracking users (no ghost town).
- One feed: Academy members model advanced behaviour next to Club members.

### Access map

```
Pulse ($0)              →  no community access
Progress ($17 / $8)     →  no community access  (this is the upgrade pressure)
Mastery monthly ($44)   →  Club
Mastery annual ($350)   →  Club + Academy unlocked
Academy standalone      →  Academy + Club (same group)
```

In-app: "Open the Money Club" on the Mastery dashboard; a **locked teaser** on
Progress is the upgrade prompt.

### Billing: Stripe, not Skool checkout

Skool bills members in USD and cannot sit cleanly on the CAD / GG33 ladder.
Use Skool as a **delivery surface** only.

- Set the group to **private / free** with a membership question
  ("What email is your Mosaic account under?").
- Sell Mastery and Academy on mosaicfinance.ai through existing Stripe in CAD.
- Provision via Zapier (Pro-only): Mastery active → **Invite Member**;
  Mastery annual or Academy purchase → **Unlock Course**.
- One Mosaic line on the customer's statement; one place for refunds and the
  90-day guarantee. You give up Skool directory/discovery — negligible for a
  Canadian niche.

**Offboarding:** Zapier cannot remove members. Weekly cron compares active
Mastery/Academy list against a Skool member export and flags removals for a
short manual pass. **7-day grace** after cancel so it never feels punitive.

**Launch gate:** do not open the group until **30–50 Mastery members** exist.
Three Mastery subscribers cover Skool Pro; an empty gamified community is
worse than none. Founding Club story: first 200 Mastery members.

---

## 7. Numbers & Decision Points

| Metric | Target / rule |
|---|---|
| Waitlist before app launch | 1,000 emails |
| Content → waitlist conversion | measure, then set floor |
| Reverse trial → paid | 8% on-track; **<4%** = fix time-to-first-value, not price |
| Waitlist / Pulse → paid (blended) | measure; do not plan on 24% reverse-trial conversion |
| Founding Progress locks | first 200 **or** 14-day deadline, whichever first |
| Club launch | 30–50 Mastery members before opening Skool |
| Academy launch | Club has daily activity without prompting |
| Referral program | after ~100 paying users; reward on *paid* conversion |
| Gross margin per Progress user | measured, >85% target |
| Blended AI cost | ~$1.20 modeled; alarm at **~$4/user/mo** |
| Mastery power-user tail | alarm at **~$10/user/mo** — tighten fair-use |

**Kill/scale rule:** if after 90 days of consistent posting there are fewer than
[X] waitlist signups, change format/platform — don't drift.

**Next price rung:** Progress $17 → $26 only after per-category budgets or bank
sync ship; grandfather all existing Progress (and founding $8) subscribers.

**North Star:** paying app subscribers (not followers, not waitlist size).

---

## 8. Sequencing Summary

| Order | Milestone | Gate to next step |
|---|---|---|
| 1 | App polish + entitlements + Score history + caching + legal + email nurture | Stranger → reverse trial → first report in-session → paid |
| 2 | Money Mosaic brand + templates + first 30 days of content | Consistent posting cadence held |
| 3 | Calculators + PDF funnel driving waitlist | Waitlist growing weekly |
| 4 | App launch: Pulse + reverse trial + founding $8 Progress (200 / 14 days) | First paying cohort; founding cap or deadline hit |
| 5 | Mastery live; Club closed until 30–50 Mastery members | Club opens with a full room |
| 6 | Mosaic Money Club daily activity | — |
| 7 | Academy launches ($26/$260 standalone; included on Mastery annual) | — |
| 8 | Referral loop (paid-conversion triggered) | ~100 paying users |

---

## 9. Risks & Mitigations

- **Faceless trust gap** → real voiceover, signature visuals, specific math; hire an
  on-camera face when budget allows (highest-leverage future hire).
- **AI content penalty** → generator drafts only; human pass on every script.
- **Regulatory drift in content or Charlie** → per-post checklist; education framing;
  no tailored buy/sell or account-priority language.
- **Toothless founding offer** → founding Progress is $8, not a lock on the $17
  list price. Mastery founding is a Club-cohort badge, not a discounted anchor.
- **Ghost-town community** → Club is Mastery-only; do not open Skool before 30–50
  Mastery members; founder present daily.
- **Empty or late first report kills the trial** → real-time first reports; confirm
  QA queue does not gate delivery.
- **Guarantee unmeasurable** → persist Score history; condition is weekly log +
  monthly snapshot, not "action steps."
- **AI cost per user erodes margin** → caching on chat; batch only on scheduled
  regen; soft caps; instrument tokens week one.
- **Pricing above the market before feature parity** → hold Progress at $17 until
  budgets or bank sync exist; $26 is earned, not assumed.
- **Skool USD / dual billing** → all charges through Stripe CAD; Skool is private/free delivery only.
