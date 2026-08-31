# Mosaic Finance — MVP Test Checklist

Aligned with the **6-Week Validation Sprint**. Focus is on demoability, the core loop, and getting the product in front of 5 real beta users. Exhaustive QA and Phase 2 features (Stripe billing, tier-gating, mobile polish, PostHog) are explicitly deferred.

Every test assumes a **fresh Supabase database** (all tables cleared, migrations re-applied).

**Prerequisites before starting:**
- [ ] Supabase database cleared and all migrations re-applied (001 through 016)
- [ ] `npm run dev` running locally (or deployed to Vercel on `mosaicfinance.ai`)
- [ ] `.env.local` has all required keys: Supabase, Anthropic, Resend, Upstash Redis, Sentry
- [ ] `CIM_REVIEWER_EMAIL` env var set to an email you can check
- [ ] Browser dev tools available (Network tab, Console, Application > Cookies)
- [ ] Admin approval queue wired to live API (see Known Issues — this blocks all of Block 1)

---

## Block 0: Sprint Prerequisites

**Goal:** The 5 dev blockers from Validation Sprint Week 1 are resolved and the landing page is live. These must pass before anything else.

### 0A. Dev Blockers — Completed Items

These were on the original launch blockers list and have been shipped. Verify they still work.

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 0.1 | Navigate to `/forgot-password` from the login page | Forgot password page loads with email input | [ ] |
| 0.2 | Submit a valid email on `/forgot-password` | Success message shown, reset email sent | [ ] |
| 0.3 | Click reset link in email, set new password | Password updated, can log in with new password | [ ] |
| 0.4 | Go to `/dashboard/settings`, change alias and province | Form accepts changes | [ ] |
| 0.5 | Click "Save Changes" | Success toast/message shown | [ ] |
| 0.6 | Reload `/dashboard/settings` | Changed alias and province persist (data round-tripped through Supabase) | [ ] |

### 0B. Dev Blockers — Still Needed

These must be built before Block 1 testing. Do not proceed until they pass.

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 0.7 | Verify `admin-store.ts` calls `/api/approval/queue` (not mock data) | Network tab shows real API call, not imported mock | [ ] |
| 0.8 | As adviser, approve a plan — verify plan status updates in `approval_queue` table | Row updated in Supabase (not just removed from client store) | [ ] |
| 0.9 | Navigate to `/onboarding/generating` after submitting holdings | Real "Building your plan..." progress UI shown (not a blank redirect to dashboard) | [ ] |
| 0.10 | Progress UI shows step indicators while plan generates | At least 3 visible steps animating/completing | [ ] |
| 0.11 | Plan generation completes — user auto-redirected to dashboard | Dashboard loads with `pending_review` state | [ ] |

### 0C. Landing Page & Go-Live

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 0.12 | Load `mosaicfinance.ai` in browser | Landing page renders, no errors in console | [ ] |
| 0.13 | Verify waitlist email capture form is present | Email input + province dropdown visible | [ ] |
| 0.14 | Submit a test email + province to waitlist | Success confirmation shown | [ ] |
| 0.15 | Check Supabase: `waitlist` table (or equivalent) | Row created with email, province, timestamp | [ ] |
| 0.16 | Navigate to `/privacy` from footer | Privacy policy page loads with PIPEDA language | [ ] |
| 0.17 | Navigate to `/terms` from footer | Terms of Service page loads with "Professional Review Process" section | [ ] |
| 0.18 | Verify all footer links resolve (no 404s) | Every footer link loads a real page | [ ] |

---

## Block 1: The Core Loop (2 Runs)

**Goal:** One person can go from signup to holding a plan PDF. You are this person. Do this twice — one thorough run with full verification, one abbreviated run to confirm a second province works.

### Run 1: Saskatchewan Resident (Full Verification)

#### 1A. Signup & Profile

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.1 | Go to `/signup` | Signup page loads with alias, province, password fields | [ ] |
| 1.2 | Create account: alias "SK_Tester", province "Saskatchewan", strong password | Success message, redirected to `/onboarding` | [ ] |
| 1.3 | Verify email confirmation (if enabled) or auto-login | Session active, cookie set | [ ] |
| 1.4 | On `/onboarding`, fill profile: Age 32, Employment "Employed", Family "Married" | Form accepts all fields | [ ] |
| 1.5 | Add 1 household member: Spouse, age 30, employed, $55,000 income | Member appears in list | [ ] |
| 1.6 | Submit profile | Redirected to `/onboarding/fact-find` | [ ] |
| 1.7 | Verify: no legal name field, no SIN field anywhere on the profile form | Privacy-first confirmed | [ ] |

#### 1B. Fact-Find Conversation

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.8 | On `/onboarding/fact-find`, see educational notice card | Card shows Mosaic is a tracking and education tool, not a licensed advisor, and to speak with a licensed financial advisor before implementing changes | [ ] |
| 1.9 | Click "I understand, let's start" | Compliance card dismissed, conversation begins | [ ] |
| 1.10 | AI sends first message | Warm, professional greeting. Asks an opening question | [ ] |
| 1.11 | Respond with SK-specific info: employed at $85,000, mention RRSP, TFSA, mortgage | AI acknowledges, asks follow-up. Topic sidebar updates | [ ] |
| 1.12 | Cover all major topics through natural conversation: income ($85K), expenses ($4,200/mo), mortgage ($220K at 4.9%), car loan ($18K), RRSP ($42K), TFSA ($28K), emergency fund ($8K), goals (retirement at 60, kids education), life insurance ($250K through employer) | AI tracks topics, sidebar reflects progress | [ ] |
| 1.13 | When AI completes all topics, it produces `<FACT_FIND_COMPLETE>` | Summary card appears with extracted data | [ ] |
| 1.14 | Review the summary card | All key numbers visible: income, expenses, debts, accounts, goals, insurance | [ ] |
| 1.15 | Click "Looks right — continue" | Redirected to next step | [ ] |
| 1.16 | **VERIFY extracted JSON** (check browser Network tab for the response) | JSON has fields: income, expenses, debts, goals, accounts, insurance, flags | [ ] |

**Friction points to note:**
- [ ] How long did the conversation take? _____ minutes
- [ ] Any moments where the AI asked redundant questions?
- [ ] Any moments where the AI missed something you mentioned?
- [ ] Did topic sidebar track accurately?

#### 1C. Risk Profile

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.17 | On `/onboarding/risk-profile`, see 8-question questionnaire | First question appears with 5 answer options | [ ] |
| 1.18 | Answer all 8 questions (aim for a "Balanced" profile — pick middle options) | Progress indicator advances, each answer recorded | [ ] |
| 1.19 | After question 8, AI follow-up conversation begins | AI asks behavioral scenario questions (e.g., "Imagine your TFSA dropped 20%...") | [ ] |
| 1.20 | Complete 3-5 follow-up messages | AI emits `<RISK_PROFILE_COMPLETE>` | [ ] |
| 1.21 | See risk profile result | Label shown (e.g., "Balanced"), summary, equity range | [ ] |
| 1.22 | User can see their label and confirm | "Confirm & Continue" button available | [ ] |
| 1.23 | Click confirm | Redirected to holdings page | [ ] |
| 1.24 | **VERIFY JSON** (Network tab) | Has: scores, equity_range, flags, conversational_summary | [ ] |

#### 1D. Holdings Entry

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.25 | On `/onboarding/holdings` | Holdings entry page loads | [ ] |
| 1.26 | Check if accounts mentioned in fact-find are pre-populated | RRSP and TFSA should appear (from fact-find mentions) | [ ] |
| 1.27 | Add holdings to RRSP: XEQT $25,000 (200 units), XBB $17,000 (180 units) | Holdings appear in account card with totals | [ ] |
| 1.28 | Add holdings to TFSA: VFV $28,000 (150 units) | Holdings appear correctly | [ ] |
| 1.29 | Add a new FHSA account with $8,000 in CASH.TO | Account type dropdown has all 7 types (RRSP, TFSA, FHSA, Non-Reg, Pension, LIRA, RESP) | [ ] |
| 1.30 | Click "Generate Plan" or equivalent | Redirected to generating page with progress UI | [ ] |

#### 1E. Plan Generation & Dashboard States

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.31 | Generating page shows "Building your plan..." progress UI | Step indicators visible and animating | [ ] |
| 1.32 | Wait for generation to complete (2-5 minutes) | Status transitions to "pending_review". User auto-redirected to dashboard | [ ] |
| 1.33 | Dashboard now shows "pending_review" state | Approval status banner, draft plan link, KPI strip with Financial Health Score | [ ] |
| 1.34 | Financial Health Score is visible | Score between 1-100, displayed as gauge/number | [ ] |
| 1.35 | KPI strip shows: Net Worth, Monthly Cash Flow, Total Assets, Total Debt, Emergency Fund | All values populated with real numbers from your data | [ ] |
| 1.36 | Click "View Draft Plan" link | Draft plan opens with watermarked sections | [ ] |
| 1.37 | Download draft PDF | PDF downloads. Has "DRAFT" watermark, red header/footer | [ ] |

#### 1F. Plan Content Verification (SK-Specific)

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.38 | Open draft plan, check Section 1: Financial Health Diagnostic | Net worth, cash flow, savings rate, emergency fund — all populated with YOUR numbers | [ ] |
| 1.39 | Check Section 2: Retirement Readiness | SK-specific: mentions Saskatchewan pension, CPP/OAS timing, retirement number calculated | [ ] |
| 1.40 | Check Section 3: Investment Portfolio Blueprint | ETF recommendations are real Canadian-listed ETFs. MERs are accurate. Cross-check at least 3 ETFs against actual data | [ ] |
| 1.41 | Check Section 4: Tax Efficiency Review | SK-specific tax rates/brackets. RRSP room calculation. TFSA strategy. FHSA eligibility check | [ ] |
| 1.42 | Check Section 5: Debt Elimination Plan | Mortgage and car loan mentioned. Avalanche vs snowball comparison. Interest savings calculated | [ ] |
| 1.43 | Check Section 6: Insurance Coverage Audit | Employer life insurance ($250K) acknowledged. Gap analysis present | [ ] |
| 1.44 | Check Section 7: Market Context Report | Current market data referenced (not stale). Portfolio-specific context | [ ] |
| 1.45 | Check Section 8: Lifetime Financial Roadmap | Decade-by-decade priorities. Retirement milestone. Legacy considerations | [ ] |
| 1.46 | **Language audit:** Search for "I recommend" or directive language | ZERO instances. All framed as "the plan suggests", "based on your numbers", "considerations" | [ ] |
| 1.47 | **Uncertain values:** Look for `[REQUIRES ADVISOR VERIFICATION]` tags | Present where data was ambiguous or couldn't be calculated with confidence | [ ] |

**ETF verification (list every recommended ETF and check):**

| ETF Ticker | Listed on TSX? | MER Accurate? | Notes |
|------------|---------------|---------------|-------|
| | | | |
| | | | |
| | | | |
| | | | |

#### 1G. Adviser Approval Flow

> **PREREQUISITE:** The admin approval queue must be wired to the real API before testing this section. `src/stores/admin-store.ts` must call `/api/approval/queue` — not import from `admin-mock-data.ts`. If mock data is still in use, approve/reject will have no backend effect and every test below will be invalid. See Known Issue #1.

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.48 | In Supabase dashboard: update your test user's role to `adviser` (or use a separate adviser account) | Role updated to `adviser` | [ ] |
| 1.49 | Log in as adviser (check "Adviser login" on login page) | Redirected to `/admin/approval-queue` | [ ] |
| 1.50 | Approval queue shows the pending plan | Stats: 1 Pending. Plan visible in table with user alias, risk score, SLA timer | [ ] |
| 1.51 | Click on the plan to review | Review page: plan sections on left, user card + actions on right | [ ] |
| 1.52 | Review all 8 sections | Content matches what was seen in draft | [ ] |
| 1.53 | Add reviewer notes: "SK plan looks good. ETFs appropriate for balanced profile." | Notes saved in textarea | [ ] |
| 1.54 | Click "Approve & Deliver" | Confirmation modal appears | [ ] |
| 1.55 | Confirm approval | Plan status changes to `delivered`. PDF generates and uploads to storage | [ ] |
| 1.56 | Check email inbox (CIM_REVIEWER_EMAIL) | Received "New plan pending review" notification email | [ ] |
| 1.57 | Check user email | Received "Your Financial Plan is Ready" delivery email with link | [ ] |

#### 1H. Final PDF & Plan View

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.58 | Log back in as the regular user | Redirected to dashboard | [ ] |
| 1.59 | Dashboard shows "delivered" state | Full KPI strip, chart grid, plan sections all visible | [ ] |
| 1.60 | Navigate to `/dashboard/plan` | Full plan view with status timeline (all steps "complete") | [ ] |
| 1.61 | Check sidebar: "Verified" badge visible | Green badge says "Verified" (not "CIM Reviewed") | [ ] |
| 1.62 | Click "Download PDF" | Final PDF downloads (no DRAFT watermark) | [ ] |
| 1.63 | **PDF visual quality check:** | | |
| | — Typography clean and readable? | [ ] | |
| | — Emerald accent colors present? | [ ] | |
| | — Clean section breaks between all 8 sections? | [ ] | |
| | — Charts/gauges render correctly? | [ ] | |
| | — Financial Health Score on first page with visual gauge? | [ ] | |
| | — Educational disclaimer footer on every page? | [ ] | |
| | — "Educational information — not financial advice" on cover? | [ ] | |
| | — Disclaimer block at end? | [ ] | |
| | — Page numbering (Page X of Y)? | [ ] | |
| 1.64 | **Screenshot-worthy?** Show the Financial Health Score page to someone. Would you hand this to a dealer COO? | [ ] |

#### 1I. Plan Walkthrough

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 1.65 | Click "AI Walkthrough" from plan page | Split view: plan content left (40%), conversation right (60%) | [ ] |
| 1.66 | AI introduces Section 1 (Financial Health Diagnostic) | Uses YOUR specific numbers ("Your net worth of $X...", "Your savings rate of X%...") | [ ] |
| 1.67 | Ask: "Why did you suggest XEQT over VFV?" | AI references your risk profile and specific allocation | [ ] |
| 1.68 | Ask: "What if I retire at 55 instead of 60?" | AI references your specific retirement numbers and recalculates implications | [ ] |
| 1.69 | Navigate to Section 3 (Investment Portfolio) | Section content updates on left, new conversation for this section | [ ] |
| 1.70 | Navigate through all 8 sections | Each loads with intro and section-specific content | [ ] |
| 1.71 | Complete the walkthrough | Completion screen with summary of action items | [ ] |

---

### Run 2: Ontario Resident (Abbreviated)

Repeat steps 1.1–1.71 with this profile. Focus on confirming the flow completes end-to-end and that province-specific content changes. Skip deep JSON verification and detailed PDF audit — those were covered in Run 1.

- **Alias:** ON_Tester
- **Province:** Ontario
- **Age:** 45
- **Employment:** Self-Employed
- **Family:** Single Parent, 2 children (ages 12, 8)
- **Income:** $120,000
- **Holdings:** Non-Reg account with $85K in VFV/XIU, RRSP $62K, no TFSA
- **Debts:** Mortgage $380K (3.9%), Line of credit $22K (8.5%)
- **Goals:** Retirement at 62, children's education (RESP), buy cottage
- **Special flag:** Self-employed (should trigger business structures knowledge module)

**Ontario-specific checks:**
- [ ] Ontario tax brackets/rates correct in Tax Efficiency section
- [ ] Self-employment deductions addressed
- [ ] ON-specific provincial tax credits mentioned

| # | Item | Pass |
|---|------|------|
| 2.1 | Full onboarding complete (signup through plan generation) | [ ] |
| 2.2 | All 8 sections generated with ON-specific content | [ ] |
| 2.3 | ETFs are real and MERs accurate | [ ] |
| 2.4 | Plan approved via adviser queue | [ ] |
| 2.5 | Final PDF quality acceptable | [ ] |
| 2.6 | Walkthrough references this user's specific numbers | [ ] |
| 2.7 | Time to complete entire flow: _____ minutes | [ ] |

---

## Block 2: Security & Compliance

**Goal:** The compliance backbone is sound and the product cannot leak data.

### 2A. Row-Level Security (Adversarial Testing)

Requires 2 user accounts from Block 1 (SK_Tester and ON_Tester).

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 4.1 | Log in as SK_Tester. Note their `user_id` from Supabase | User ID recorded | [ ] |
| 4.2 | Log in as ON_Tester in a separate browser/incognito | Both sessions active simultaneously | [ ] |
| 4.3 | As ON_Tester, try to access SK_Tester's plan via direct API: `GET /api/plan/latest` (should only return ON_Tester's plan) | Only ON_Tester's plan returned | [ ] |
| 4.4 | As ON_Tester, try to access SK_Tester's conversation: `GET /api/conversation/session/{SK_session_id}/messages` | 403 or empty result | [ ] |
| 4.5 | In Supabase SQL editor: as ON_Tester's JWT, query `SELECT * FROM financial_plans WHERE user_id = '{SK_user_id}'` | No rows returned (RLS blocks it) | [ ] |
| 4.6 | As ON_Tester, try to access SK_Tester's risk profile via API | 403 or empty result | [ ] |
| 4.7 | Verify plans with `status != 'delivered'` are not accessible to users via API | Only delivered plans returned | [ ] |

### 2B. Account Deletion Cascade (PIPEDA)

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 4.8 | Create a new test account specifically for deletion testing | Account created with full onboarding data | [ ] |
| 4.9 | Complete onboarding through plan generation (or at least fact-find + holdings) | Data exists in: user_profiles, financial_profiles, conversation_sessions, conversation_messages, investment_holdings, risk_profiles | [ ] |
| 4.10 | Go to Settings > Privacy > "Delete All My Data" | Confirmation modal appears | [ ] |
| 4.11 | Type "DELETE" exactly (case-sensitive) and confirm | Account deletion process begins | [ ] |
| 4.12 | Verify redirect to home page after deletion | Redirected to `/` | [ ] |
| 4.13 | Try to log in with deleted credentials | Login fails — account no longer exists | [ ] |
| 4.14 | In Supabase: check `user_profiles` for the deleted user | No row found | [ ] |
| 4.15 | In Supabase: check all child tables: `financial_profiles`, `conversation_sessions`, `conversation_messages`, `investment_holdings`, `risk_profiles`, `financial_plans`, `approval_queue`, `document_uploads`, `fixed_assets`, `household_members` | All rows deleted via CASCADE | [ ] |
| 4.16 | Check Supabase Auth: `auth.users` | Auth user deleted | [ ] |
| 4.17 | Check Supabase Storage: `documents` and `reports` buckets | Files removed | [ ] |

### 2C. Session Timeout Mid-Fact-Find

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 4.18 | Start a fact-find conversation, answer 3-4 questions | Conversation in progress, topics partially complete | [ ] |
| 4.19 | Clear cookies or wait for session to expire (or manually delete session cookie) | Session invalidated | [ ] |
| 4.20 | Refresh the page | Re-auth prompt appears (redirect to login with `redirectTo` param) | [ ] |
| 4.21 | Log back in | Redirected back to fact-find | [ ] |
| 4.22 | Check: is conversation data intact? | Previous messages should still be stored server-side | [ ] |

### 2D. Education-and-Analysis Language Audit

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 4.23 | Open both generated plans from Block 1 | Both plans accessible | [ ] |
| 4.24 | Search each plan for directive language: "I recommend", "you should", "you must", "I advise" | ZERO instances of directive language | [ ] |
| 4.25 | Verify all actionable items have implementation referral notes (e.g., "discuss with a registered advisor") | Referral language present | [ ] |
| 4.26 | Check walkthrough transcripts for directive language | AI uses "the Progress Report shows", "based on your numbers", "considerations" | [ ] |

### 2E. Disclaimer Insertion Points

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 4.27 | Check `/terms` page | Terms of Service present with educational disclaimer (not advice; consult a licensed advisor) | [ ] |
| 4.28 | Check `/privacy` page | Privacy policy present with PIPEDA language | [ ] |
| 4.29 | Check fact-find educational notice | Tracking/education tool language; speak with a licensed financial advisor | [ ] |
| 4.30 | Check PDF headers/footers (final mode) | "Educational information — not financial advice" on cover. Disclaimer footer on each page | [ ] |
| 4.31 | Check PDF headers/footers (draft mode) | "DRAFT" watermark. Educational disclaimer footer | [ ] |
| 4.32 | Check ComplianceFooter on dashboard/onboarding pages | Educational disclaimer text present | [ ] |
| 4.33 | Check marketing footer | Educational disclaimer text present | [ ] |
| 4.34 | Check meeting room disclaimer | Educational information, not financial advice; speak with a licensed advisor | [ ] |

---

## Block 3: Polish & Error Handling

**Goal:** The product looks professional and handles edge cases gracefully during demos and beta sessions.

### 3A. Design Consistency Audit

| # | Check | Expected | Pass |
|---|-------|----------|------|
| 5.1 | Emerald accent color (#10B981) used consistently | Buttons, badges, accents, charts all use emerald | [ ] |
| 5.2 | Typography: Plus Jakarta Sans for headings, DM Sans for body | Fonts load and render correctly | [ ] |
| 5.3 | Warm white background throughout | No jarring white/gray mismatches | [ ] |
| 5.4 | "mosaic finance" wordmark is lowercase where used | Marketing pages use lowercase | [ ] |
| 5.5 | No broken images or missing icons | All visual elements render | [ ] |
| 5.6 | Consistent border radius, spacing, card styles across pages | Visual harmony | [ ] |

### 3B. Loading & Error States

| # | Test | Expected | Pass |
|---|------|----------|------|
| 5.7 | Slow network: throttle to Slow 3G, load dashboard | Skeleton loaders appear (not blank white page) | [ ] |
| 5.8 | Kill the API (stop dev server mid-load) | Error message shown (not blank page or unhandled JS error) | [ ] |
| 5.9 | Plan PDF generation with slow connection | Loading spinner on button, "Generating..." text | [ ] |
| 5.10 | Fact-find with API error | Error boundary catches, retry option shown | [ ] |
| 5.11 | Navigate to a non-existent route (e.g., `/dashboard/nonexistent`) | 404 page or graceful redirect (not blank) | [ ] |

---

## Block 4: Demo & Beta Readiness

**Goal:** You have a real, polished plan you can show to anyone — Co.learn, beta users, investors. This is the most important block for the validation sprint.

### 4A. Demo Plan Creation

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 6.1 | Create a new account with realistic financial data (your own or a detailed proxy) | Account created | [ ] |
| 6.2 | Complete the full onboarding with care — this is the demo | All steps complete | [ ] |
| 6.3 | Approve the plan via adviser queue | Plan delivered | [ ] |
| 6.4 | Download the final PDF | PDF in hand | [ ] |
| 6.5 | **Print the PDF.** Is this something you would hand to the dealer COO? | [ ] |
| 6.6 | Walk through the entire experience as if showing a beta user for the first time | Note every moment where you'd have to explain something the UI should make obvious | [ ] |

### 4B. Demo Experience Check

| # | Question | Answer |
|---|----------|--------|
| 6.7 | Does the signup feel professional and trustworthy? | |
| 6.8 | Does the fact-find feel like talking to a real advisor? | |
| 6.9 | Is the Financial Health Score impressive when first revealed? | |
| 6.10 | Does the PDF look institutional-quality? | |
| 6.11 | Does the walkthrough add value beyond reading the plan? | |
| 6.12 | Are there any moments where you'd lose a demo audience? | |
| 6.13 | Total time from signup to PDF in hand: _____ minutes | |

### 4C. Screen Recording & Beta Prep

| # | Step | Pass |
|---|------|------|
| 6.14 | Record a 60-second screen recording of the core flow (signup → fact-find → plan → PDF) for Co.learn and remote beta sessions | [ ] |
| 6.15 | Verify you can manually create a beta user account (no Stripe gate needed for beta) | [ ] |
| 6.16 | Confirm you can act as the sole plan reviewer for 5 beta users within SLA | [ ] |

---

## Rejection Flow (Test Once)

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| 7.1 | Generate a plan (or use an existing pending plan) | Plan in approval queue | [ ] |
| 7.2 | As adviser, click "Reject — Request More Info" | Rejection textarea appears | [ ] |
| 7.3 | Enter reason: "Need more detail on self-employment income sources" | Notes saved | [ ] |
| 7.4 | Confirm rejection | Plan status changes to `rejected` | [ ] |
| 7.5 | Check user email | Rejection email received with reviewer notes and link to `/dashboard/fact-find` | [ ] |
| 7.6 | Click the link in the email | Opens fact-find page to provide additional information | [ ] |

---

## Summary Tracker

| Block | Total Tests | Passed | Failed | Notes |
|-------|------------|--------|--------|-------|
| Block 0: Sprint Prerequisites | 18 | | | |
| Block 1: Core Loop (Run 1 — SK) | 71 | | | |
| Block 1: Core Loop (Run 2 — ON) | 7 | | | |
| Block 2: Security & Compliance | 34 | | | |
| Block 3: Polish & Error Handling | 11 | | | |
| Block 4: Demo & Beta Readiness | 16 | | | |
| Rejection Flow | 6 | | | |
| **TOTAL** | **163** | | | |

---

## Known Issues to Fix Before Testing

These must be resolved before Block 1 testing begins. Items marked ~~strikethrough~~ have been shipped.

1. **CRITICAL — Approval queue `processAction` doesn't call API** — `src/stores/admin-store.ts` `processAction` only removes the item from the store; it never POSTs to `/api/approval/[reportId]`. Approve/reject have no backend effect. The real API exists at `/api/approval/queue/route.ts` but is never called. **This is the #1 sprint blocker — the product cannot deliver a reviewed plan without it.**

2. **Plan generation progress UI is a blank redirect** — `src/app/(onboarding)/onboarding/generating/page.tsx` just calls `router.replace("/dashboard")` and renders nothing. Users see a flash of blank page. Needs a real "Building your plan..." screen with step indicators.

3. **Fact-find multi-session: UI doesn't restore messages** — Backend resumes sessions within 48h, but the fact-find page always starts with an empty message array. Users returning to a resumed session see no history.

4. **Onboarding resumption skips risk-profile** — `getOnboardingProgress` redirects from fact-find directly to holdings, skipping the risk-profile step.

5. **Fact-find guardrails missing from prompt** — No explicit instructions for handling off-topic requests, trade execution asks, or prompt injection in the fact-find system prompt.

6. ~~**OAuth callback schema mismatch**~~ — Fixed: `app/auth/callback/route.ts` inserts only valid `user_profiles` columns (`subscription_tier: "snapshot"`) and uses `getOnboardingProgress()` for redirect.

7. **Walkthrough mock data fallback** — Walkthrough falls back to `loadMockData("delivered")` when plan is missing, masking real issues.

---

## Completed from Original Launch Blockers

These items from the pre-sprint launch blockers list have been shipped and are verified in Block 0:

- [x] **Build `/forgot-password` route** — Implemented at `src/app/(auth)/forgot-password/page.tsx`
- [x] **Settings page persists changes to DB** — `PATCH /api/user/profile` writes to Supabase
- [x] **Stripe billing portal** — `src/app/api/stripe/portal/route.ts` exists (not needed for validation sprint)
- [x] **Pricing tiers aligned** — Marketing and config use Snapshot / Plan ($17/mo or $188/yr) / Advisor ($44/mo or $440/yr); see `src/lib/config/pricing.ts`

---

## Phase 2 — Deferred (Post-Validation Sprint)

These are explicitly out of scope for the 6-week validation sprint. Only revisit if the core value proposition validates.

### Mobile Responsiveness

| # | Screen | What to Check | Pass |
|---|--------|--------------|------|
| P2.1 | `/signup` | Form usable, fields not cut off | [ ] |
| P2.2 | `/login` | All auth options accessible | [ ] |
| P2.3 | `/onboarding` | Profile form scrollable, household member entry works | [ ] |
| P2.4 | `/onboarding/fact-find` | Chat interface usable. Messages readable. Input bar accessible. Topic sidebar hidden gracefully | [ ] |
| P2.5 | `/onboarding/risk-profile` | Questions readable, answer options tappable | [ ] |
| P2.6 | `/onboarding/holdings` | Account cards, holdings entry, submit button all accessible | [ ] |
| P2.7 | `/dashboard` | KPI cards stack properly. Charts readable. Plan sections expandable | [ ] |
| P2.8 | `/dashboard/plan` | Timeline visible. Sections navigable. PDF download works | [ ] |
| P2.9 | Plan walkthrough | Conversation view works on mobile (plan panel hidden, that's OK) | [ ] |
| P2.10 | `/dashboard/settings` | All tabs accessible. Delete account flow works | [ ] |
| P2.11 | PDF download on mobile | PDF opens/downloads successfully | [ ] |

### Sentry Error Monitoring

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| P2.12 | Trigger a deliberate client-side error | Sentry captures the error | [ ] |
| P2.13 | Trigger a deliberate API error | Sentry captures server-side error | [ ] |
| P2.14 | Check Sentry dashboard for captured errors | Errors appear with stack traces | [ ] |
| P2.15 | Verify no PII in Sentry events | No emails, aliases, or financial data in error payloads | [ ] |

### Rate Limiting

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| P2.16 | Send 11 messages to `/api/conversation/message` within 1 minute | 11th request returns 429 (rate limited) | [ ] |
| P2.17 | Wait 1 minute, send another message | Request succeeds | [ ] |
| P2.18 | Hit `/api/plan/generate` 6 times in 1 hour | 6th request returns 429 | [ ] |

### Phase 2 — Advisor Conversations & Tier Gating

Test after conversation credits and gating are implemented (not part of validation sprint MVP).

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| P2.19 | Snapshot user: start only one score-focused check-in with Charlie per calendar month | Additional check-ins blocked or upgrade prompt | [ ] |
| P2.20 | Plan user: start up to 5 advisor conversations (`ad-hoc` / meeting) per month | 6th conversation blocked with upgrade to Advisor | [ ] |
| P2.21 | Advisor user: unlimited advisor conversations | No monthly cap | [ ] |
| P2.22 | `/dashboard/meeting` "Ask a Question" — assistant references user data from Supabase (holdings, profile) | Answers contextual to stored data | [ ] |
| P2.23 | Life event conversation (inheritance, major purchase, etc.) persists updates to financial profile or session metadata | DB reflects new facts after conversation | [ ] |
| P2.24 | Conversation usage counter resets on billing period or calendar month (per product spec) | Count resets predictably | [ ] |
| P2.25 | Annual review due banner (`ReviewReminder`) and quarterly full review for Advisor tier fire on schedule | Alerts match tier rules | [ ] |
| P2.26 | Plan tier: automated 6-month score refresh (lighter than full annual review) | User notified; score updates | [ ] |

### Phase 2 — CFP Knowledge Base Integration

Test after CFP course textbooks and documentation are uploaded and wired into prompts.

| # | Step | Expected Result | Pass |
|---|------|----------------|------|
| P2.27 | Knowledge chunks load for `ad-hoc` and `annual-review` session types (and any advisor flows) | Relevant excerpts in system context | [ ] |
| P2.28 | Charlie uses CFP-aligned planning process language (gather data, analyze, education-and-analysis recommendations) | No directive "you must buy" language | [ ] |
| P2.29 | Life event guidance (e.g. debt vs. invest) cites framework: after-tax cost of debt, return expectations, risk tolerance, emergency fund | Structured reasoning | [ ] |
| P2.30 | Deeper knowledge does not weaken compliance — still education-and-analysis, referrals to professionals where required | Audit sample conversations | [ ] |

### Phase 2 — Founding Members Program

Future implementation (not part of validation sprint MVP):

- **$98** one-time lifetime Plan access (9+8=17, 1+7=8 numerology alignment)
- Capped at **28** members (GG33 wealth number)
- Requires: invite code flow, one-time Stripe checkout (not subscription), counter/cap enforcement server-side
- Landing page or dedicated `/founding` route with remaining spots counter
- Consider timing launch on a **28th** for numerological alignment

### Other Deferred Work

- [ ] Founding Members program ($98 lifetime, 28-member cap)
- [ ] Instrument PostHog analytics across key flows
- [ ] Conversation credit tracking and monthly reset (see Advisor Conversations tests above)
- [ ] Monthly check-in conversation for Snapshot tier (score-focused)
- [ ] Annual billing toggle on marketing pricing and Stripe price IDs in production
- [ ] CFP knowledge base upload and prompt integration (see CFP tests above)
- [ ] Clean up dead route stubs in `src/app/(dashboard)/`
- [ ] Build beta invite flow with invite codes
- [ ] Statement upload / Claude Vision parsing
- [ ] Meeting / annual review scheduling feature
- [ ] Newsletter system

---

*Mosaic Finance · ChainForge Labs · April 2026 · Confidential*
