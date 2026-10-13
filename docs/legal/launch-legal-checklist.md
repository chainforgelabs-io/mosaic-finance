# Launch legal checklist — "can we legally take money from Canadians under this name"

*Owner-facing. Status as of 2026-10-13. This is a working checklist, not legal advice. Items marked **owner** cannot be done by an agent. Items marked **counsel** need a lawyer or Canadian privacy specialist to write or bless the text.*

Companion: [privacy-terms-counsel-brief.md](./privacy-terms-counsel-brief.md) — the factual brief to hand to counsel.

Roadmap line: [docs/ROADMAP.md → Phase 0 → Parallel launch blockers (legal)](../ROADMAP.md#parallel-launch-blockers-legal).

---

## Gate summary

| Can do now | Must wait |
|---|---|
| Phase 1B code, waitlist, test-mode billing QA | Flip `NEXT_PUBLIC_LAUNCH_MODE=live` |
| CIPO search (**done**, see §4) | Charge a real card |
| Counsel on privacy / terms in parallel | Ship counsel copy via a later PR, then launch |
| Remove "portfolio demo" language (**done**, see §3) | |
| Wire account deletion + data export (see §2.3) | |

Nothing in the right column happens until every item in §1 and §2 is checked.

---

## 1. Entity + bank tied to Stripe — **owner**

The site, the ToS, the privacy page, the PDF disclaimer, and the footer all name **ChainForge Labs, Saskatoon, Saskatchewan** as the operator. Confirm that is still the legal entity you want on invoices, or decide the new one. Everything below keys off that name.

- [ ] **Decide the operator entity.** Options: (a) federal corporation (CBCA, Corporations Canada), (b) Saskatchewan corporation or sole proprietorship under *The Business Names Registration Act* (ISC), (c) an existing ChainForge Labs entity if one is already registered. Record the exact legal name, business number, and registered address here once decided:
  - Legal name: `____________________`
  - Business number (BN): `____________________`
  - Registered office: `____________________`
  - Trade name on invoices / statement descriptor: `MOSAIC FINANCE` (Stripe statement descriptor max 22 chars; confirm it reads clearly on a card statement)
- [ ] **GST/HST registration.** Mandatory once worldwide taxable revenue exceeds $30,000 in any four consecutive quarters; optional (and usually sensible for ITC recovery) before that. SaaS to Canadian consumers is taxable; place-of-supply rules mean you charge the rate of the subscriber's province. Stripe Tax can do this if enabled. Decision: register now / register at threshold.
- [ ] **Business bank account** in the entity's exact legal name.
- [ ] **Stripe live account → Settings:**
  - Business details: legal entity name, BN, address, support email `hello@mosaicfinance.ai`, support URL.
  - Public details: statement descriptor `MOSAIC FINANCE`, shortened descriptor, support phone (Stripe requires one for card networks; a VoIP number is fine).
  - Bank accounts and payouts: the business account above. **Not a personal account.**
  - Tax: enable Stripe Tax for CA if you register for GST/HST.
  - Customer emails: enable receipts for successful payments and refunds.
- [ ] **Stripe is already configured with live prices and a live webhook** (roadmap, 2026-10-12/13). The catalog alone is not sufficient; payouts and legal name must point at the business entity before `NEXT_PUBLIC_LAUNCH_MODE=live`.
- [ ] Update the operator name in code **only if it changes** from "ChainForge Labs." Files that carry it today: `src/app/(marketing)/terms/page.tsx`, `src/app/(marketing)/privacy/page.tsx`, `src/components/marketing/footer.tsx`, `src/lib/pdf/report-generator.ts` (PDF disclaimer), `package.json` (`author`), `README.md` (Built by). That is a one-line-per-file follow-up PR.

**Until this section is done:** keep waitlist. Do not flip live.

---

## 2. Real `/privacy` and `/terms` — **counsel**

Current pages exist and read like a product draft (effective April 1 2026, "ChainForge Labs", education-not-advice framing). They are not signed-off PIPEDA / Quebec Law 25 copy, and they promise two things the product does not yet do (§2.3).

**Agents must not invent this copy.** When counsel returns text, a later PR swaps the page bodies in `src/app/(marketing)/privacy/page.tsx` and `src/app/(marketing)/terms/page.tsx`. The full factual brief for counsel is in [privacy-terms-counsel-brief.md](./privacy-terms-counsel-brief.md).

### 2.1 Privacy policy — what counsel must cover

- [ ] Who the controller is (the entity from §1) and who the designated privacy officer is (PIPEDA s. 4.1 / Law 25 "person in charge of the protection of personal information" — by default the CEO; name or title must be published).
- [ ] What is collected: alias, email, province, age range, employment type, family structure, household members, income/expense/debt/holdings figures, goals, risk profile, conversation transcripts with Charlie, uploaded statements and receipts (files and parsed rows), net-worth snapshots, Health Score history, notification preferences. No SIN, no bank credentials, no card numbers. **Note:** Google sign-in delivers the Google display name and avatar to Supabase Auth metadata even though the app never reads them; the current "we never collect your legal name" claim needs qualifying.
- [ ] Where it lives and who processes it: Supabase (Postgres + Storage, AWS `ca-central-1`), Vercel (hosting, `yul1`), Anthropic (AI; conversation and financial figures are sent for processing), Stripe (billing identity and payments), Resend (transactional and opted-in email), Sentry (errors and session replay, IDs only, text masked), PostHog (planned, IDs and counts only), Upstash Redis (caches and rate limits, no personal data). Anthropic, Stripe, Resend, Sentry, and PostHog are US-based: cross-border transfer disclosure required under PIPEDA guidance and Law 25 s. 17 (privacy impact assessment for transfers outside Quebec).
- [ ] Purposes and consent (express for sensitive financial data; separate, unbundled consent for marketing email vs. transactional).
- [ ] Retention schedule and the actual deletion behaviour (§2.3).
- [ ] Rights: access, correction, withdrawal, deletion, portability (Law 25 s. 27 data portability in force since 2024-09-22), complaint route (OPC; CAI for Quebec).
- [ ] Automated decision-making notice (Law 25 s. 12.1): the Financial Health Score and Progress Report are produced automatically from user inputs. Disclose, and offer a way to ask questions / have a human review.
- [ ] Cookies / tracking: essential cookies only today; if PostHog ships, disclose it.
- [ ] Minors: 18+. Confirm no under-14 handling needed (Law 25 requires parental consent under 14).
- [ ] Breach notification commitment (PIPEDA s. 10.1 real risk of significant harm; Law 25 confidentiality incident register).
- [ ] Quebec: a French version is required for users in Quebec (Charter of the French Language, s. 52). Decide whether to serve Quebec at launch. The province picker currently includes QC.

### 2.2 Terms of service — what counsel must cover

- [ ] Operator entity, governing law (currently Saskatchewan), dispute resolution. Note: Quebec consumer contracts cannot force Quebec consumers to litigate outside Quebec or waive class actions (CPA s. 11.1); Ontario's CPA restricts arbitration clauses similarly.
- [ ] Not advice: education and analysis only; no NI 31-103 registrant; no human CFP/CIM review of reports or chats. Keep the existing "educational information, not financial advice" disclaimer language.
- [ ] Tiers and prices (CAD): Pulse $0; Progress $17/mo or $170/yr; founding Progress $8/mo or $80/yr for the first 200, locked for life. Mastery and Academy exist in code but are not sold at launch; do not list them.
- [ ] **7-day card-free reverse trial** of Progress on signup (`TRIAL_DURATION_DAYS = 7`). Current ToS does not mention the trial.
- [ ] **30-day refund** of the first payment, no questions (`REFUND_WINDOW_COPY`). Current ToS does not mention it.
- [ ] **Consistency Guarantee**, worded exactly as `src/lib/config/offer.ts` `GUARANTEE_LONG`: *"Log your spending each week and complete your monthly net-worth snapshot for 90 days. If your Financial Health Score hasn't improved by the end, we refund your first payment. The Score measures tracking consistency, not investment returns."* The refund is the **first payment** only (one month on monthly, the full year on annual). Eligibility is computed in `src/lib/health-score/guarantee.ts` and exposed at `/api/guarantee/status`. Never condition on returns, savings, or "following action steps."
- [ ] Billing: monthly **and annual** (current ToS says "billed monthly" only). Auto-renew, cancel anytime with access through period end, 30 days' notice of price changes (existing founding members are price-locked).
- [ ] Soft caps: Charlie ~100 messages/month on Progress. Disclose as fair-use rather than as a hard entitlement.
- [ ] AI-generated content: may be wrong; user responsible for decisions; Anthropic named as processor.
- [ ] Account deletion and data export as actual features (§2.3), not just promises.
- [ ] Negative-option billing rules: Ontario CPA and the federal Competition Act require clear disclosure before auto-renewal; a reminder before an annual renewal is good practice.

### 2.3 Deletion, export, retention — what the policy promises vs. what the code does — **code, owner decision first**

The live privacy policy says: *"Delete your data — permanently delete your account and all associated data at any time from your settings page"* and *"Export your data — request a full copy of all data we hold about you."* The ToS repeats the deletion promise in §4 and §11.

What the code does today (`src/app/dashboard/settings/page.tsx`, data section):

- **Export My Data** → `alert("Data export would trigger here. Wire to GET /api/user/export for real data export.")` No route exists.
- **Delete All My Data** → `alert("All data would be deleted. Wire to DELETE /api/user/data for Supabase cascade deletion.")` No route exists.
- `user_profiles.id → auth.users(id)` does not cascade, and 22 of the 23 foreign keys to `user_profiles(id)` lack `ON DELETE CASCADE` (only `household_members` has it); deleting the auth user would fail on FK violations.
- No retention or purge job exists. Conversations, uploads, snapshots, and `ai_usage_events` are kept indefinitely.

This is a launch blocker on its own: the policy promises a self-serve deletion that does not exist. It must be fixed in code (separate PR, `agent/account-deletion-export`) **after the owner answers these questions**:

1. **Deletion mechanics.** (a) Migration adding `ON DELETE CASCADE` to every `user_profiles(id)` FK plus `user_profiles.id → auth.users(id)`, then `auth.admin.deleteUser(id)`; or (b) a `SECURITY DEFINER` function that deletes table-by-table in dependency order. (a) is simpler and matches the policy; it is a schema change to existing constraints, so a human applies it to production.
2. **Stripe on delete.** Cancel any active subscription immediately (`stripe.subscriptions.cancel`) before deleting the user, or the card keeps being charged. Keep or delete the Stripe Customer? Recommended: cancel subscription, leave the Customer and invoices in Stripe (CRA requires 6-year retention of financial records; Stripe is the system of record), and store nothing about the user in Supabase afterward.
3. **Storage.** Delete `documents/spending/<uid>/*` and `documents/statements/<uid>/*` from the Supabase bucket in the same operation.
4. **Grace period.** Immediate hard delete, or a 30-day soft delete with a cancel link? Immediate is simpler and matches the current copy.
5. **Export format.** JSON of every user-owned table (profile, transactions, budgets, goals, snapshots, holdings, conversations, reports, score history, achievements) plus signed URLs for uploaded files. Law 25 portability wants a "structured, commonly used technological format"; JSON (optionally CSV per table) satisfies that.
6. **Retention schedule** to publish: e.g. account data until deletion; waitlist email until unsubscribe or conversion + 12 months; Stripe records 7 years; `ai_usage_events` 24 months then aggregate. Counsel should confirm numbers.

Until the code ships, the honest interim is: counsel's draft says deletion and export are **available on request to `hello@mosaicfinance.ai` within 30 days**, and the settings buttons are rewired to open that mailto. That interim copy change is also owner-approved copy, not agent-invented.

### 2.4 Hand-off

- [ ] Send [privacy-terms-counsel-brief.md](./privacy-terms-counsel-brief.md) to counsel with the entity decision from §1.
- [ ] Counsel returns: privacy policy (EN, FR if serving QC), ToS (EN, FR if serving QC), retention schedule, privacy officer designation, Law 25 PIA note for cross-border processors.
- [ ] Later PR swaps page bodies, updates effective dates, and lists every string under **Copy changes for compliance review**.
- [ ] Full test run row: *"Data export / account deletion: confirm whatever you promise in the privacy policy actually exists here"* ([qa/full-test-run.md](../qa/full-test-run.md)) must pass against the shipped code, not the promise.

---

## 3. README / public "portfolio demo" — **done 2026-10-13**

- [x] `README.md`: removed "portfolio demo. Not an operated consumer advice product," the "Intentionally out of scope for this demo" framing, and the "Portfolio note" section. Replaced with a plain product description and a compliance note that keeps the education-not-advice framing.
- [x] `package.json` `description`: removed "Chain Forge Labs portfolio demo."
- [x] Public site sweep (`rg -i "portfolio demo|not an operated|placeholder" src/`): no hits in any route, component, email template, or PDF.
- [x] Guard added: `tests/unit/brand-compliance.test.ts` fails if "portfolio demo" / "not an operated" reappear in `src/`, `README.md`, or `package.json`.
- [ ] **owner:** re-check the "Built by" line and `package.json` `author` once the entity in §1 is final.

---

## 4. CIPO search — **done 2026-10-13** (search only; filing is an owner decision)

Source: Canadian Trademarks Database, [ised-isde.canada.ca/cipo/trademark-search](https://ised-isde.canada.ca/cipo/trademark-search/srch?lang=eng). Field searched: **Trademark** contains `mosaic` (190 records, national + international), plus **All fields** `mosaic finance` (29 records). Classes of interest: 9 (software), 36 (financial services), 41 (education), 42 (SaaS). This is a knock-out search by a non-lawyer, not a clearance opinion. A trademark agent should run a full search (including common-law use, NUANS, domain and social handles, and phonetic/visual variants) before filing.

### 4.1 Exact and near-exact marks

| Query | Result |
|---|---|
| `MOSAIC FINANCE` | **No application or registration.** |
| `THE MONEY MOSAIC` / `MONEY MOSAIC` | **No application or registration.** |
| `MOSAIC ACADEMY` | **No application or registration.** |
| `MOSAIC MONEY` | No application or registration. |

### 4.2 Live marks containing MOSAIC in classes 9 / 36 / 41 / 42 (the ones counsel will care about)

| App. no. | Mark | Status | Classes | Owner / services | Relevance |
|---|---|---|---|---|---|
| 2252103 | MOSAIC INVESTMENT MANAGEMENT | Registered (TMA1410879), expiry 2036-05-15 | 36 | Mosaic Investment Management AG (Switzerland). Asset management, financial planning and investment advisory services. | **Highest.** Same class, overlapping "financial" field. Mosaic is a tracking/education tool, not advisory, and the dominant word "MOSAIC" is shared. Counsel should assess confusion risk (s. 6(5)). |
| 1887662 | MOSAIC LIFE | Registered (TMA1083763), expiry 2030-10-06 | 35, 36 | First Canadian Insurance Corporation. Insurance and benefit-plan administration. | Medium. Class 36 but insurance administration, different channel. |
| 1719971 / 1719974 / 1719972 / 1719973 | MOSAIC, MOSAIC Design, MOSAIC HOMES, MOSAIC AVENUE | Registered | 6, 9, 16, 19, 35, 36, 37… | BC real-estate developer. Class 36 is real-estate services; class 9 is brochures/newsletters. | Low–medium. Different field, but a bare MOSAIC registration touching 9 and 36. |
| 2463822 | MOSAIC LIVING | Formalized (awaiting examination) | 9, 16, 35, 36, 37… | Same real-estate family. | Low–medium. |
| 1528530 | Terme MOSAIC avec un curseur (design) | Registered (TMA844822) | 9, 36, 42 | Quebec public-infrastructure grant database. | Low. Government financial-aid software, design mark. |
| 2303594 | MOSAIC | Registered | 9, 42 | Space-domain / spacecraft software. | Low. Unrelated field. |
| 2168759 | MOSAIC | Registered | 9 | Telecom network hardware. | Low. |
| 2471111 | MOSAIC | Formalized | 9 | GPU/CPU interconnect software. | Low. |
| 2491080 / 2491083 | MOSAIC / MOSAIC LOGO | Formalized | 42 | Clinical-data AI software. | Low. |
| 2505879 | MOSAIC BY MARSH RE | Formalized | 42 | Marsh (insurance/reinsurance analytics dashboards). | Low–medium. "Financial dashboards" in 42. |
| 0414583 | MOSAIC | Registered | 41 | Multicultural festival. | Low. |
| 2274749 | Mosaic Design | Registered | 41 | — | Low. |

### 4.3 Dead marks worth knowing about

| App. no. | Mark | Status | Why it matters |
|---|---|---|---|
| **1143700** | **THE WEALTH MOSAIC** | **Refused** by the Trademarks Opposition Board, 2007-12-20 | Applied for *"educating and guiding individuals in financial planning and financial management"* (classes 9, 41, 42). **Opposed by Bank of Montreal** and refused. This is the closest precedent to "The Money Mosaic" as a financial-education brand, and it lost. Counsel should pull the TMOB decision to see which BMO marks were cited. |
| 0862189 | NESBITT BURNS MUTUAL FUND MOSAIC | Cancelled by owner | BMO's own MOSAIC financial mark (16, 35, 36, 41). Likely the basis of the 2007 opposition. Now dead, which weakens that ground today. |
| 1417276, 2215571, 2215574, 2263334 | MOSAIC INSURANCE (+ designs) | Abandoned | Class 36. Dead. |
| 1965335 | MOSAIC GROUP | Abandoned | 35, 36, 42. Dead. |
| 1406652 / 1406658 | MOSAIC BLUE | Abandoned | 36. Dead. |
| 2001799 | MOSAIC | Abandoned | 9, 41, 42, 45. Dead. |
| 2340654 | MOSAIC GOVERNANCE ADVISORS | Abandoned | 35. Dead. |

### 4.4 Read-out

- No live mark for **MOSAIC FINANCE**, **THE MONEY MOSAIC**, or **MOSAIC ACADEMY**.
- "MOSAIC" is crowded across classes; the specific risk is **MOSAIC INVESTMENT MANAGEMENT (class 36, registered 2026)** and the **THE WEALTH MOSAIC** refusal precedent for financial education under a MOSAIC-formative mark.
- Decision for the owner: (a) file **MOSAIC FINANCE** word mark in classes 9, 36 (financial information / tracking, not advisory), 41 (education), 42 (SaaS) with carefully drafted services that avoid "investment advisory"; (b) file **THE MONEY MOSAIC** in 41 (educational content, podcasts, videos) and 9 (downloadable educational content); (c) do nothing and rely on common-law use. CIPO filing fee is per class; current fee schedule at [cipo fees](https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/fees). A trademark agent's opinion on (a) vs the 2252103 registration is the sensible next spend. **Search is no longer the blocker; filing can follow launch.**
- Not done and not code: NUANS / provincial business-name search for the entity name in §1; domain and social-handle checks (`themoneymosaic`, see `BUSINESS_TODO.md` Phase 3).

---

## 5. "Mosaic Academy", never "University" — **done 2026-10-13**

- [x] `rg -i "university|institute"` across `src/`, docs, and marketing: the only hit in `src/` is `src/lib/tracking/categories.ts` (`university: "education"`, a transaction-category keyword for the user's own spending, not a brand). Docs mention the rule itself. No "Mosaic University" or "Mosaic Institute" anywhere in the repo.
- [x] CIPO: no "MOSAIC ACADEMY" mark on file (§4.1).
- [x] Guard added: `tests/unit/brand-compliance.test.ts` fails the build if "Mosaic University" or "Mosaic Institute" appear in `src/`, `README.md`, or `package.json`.
- [ ] **owner:** confirm Skool group name and any off-repo marketing (Canva, socials, email signatures) say **Mosaic Academy**. Do not register or brand "Mosaic University" (restricted term in ON under the *Post-secondary Education Choice and Excellence Act* and in BC under the *Degree Authorization Act*) or "Mosaic Institute" (existing Toronto charity).

---

## What is still open, in one place

| # | Item | Who | Blocks |
|---|---|---|---|
| 1 | Entity decision, bank account, Stripe business details + payouts | owner | live flip |
| 2 | GST/HST decision | owner (+ accountant) | first charge |
| 3 | Counsel drafts privacy + ToS (EN, FR if QC) | counsel | live flip |
| 4 | Account deletion + data export actually implemented (owner answers §2.3 questions, then `agent/account-deletion-export`) | owner → agent | live flip |
| 5 | Swap page bodies with counsel text, list strings for compliance review | agent (later PR) | live flip |
| 6 | Trademark filing decision (optional) | owner | nothing; can follow launch |
| 7 | Skool / off-repo naming check for "Mosaic Academy" | owner | nothing |
