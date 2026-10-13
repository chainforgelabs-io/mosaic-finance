# Brief for counsel — privacy policy and terms of service for mosaicfinance.ai

*Prepared 2026-10-13 from the codebase, not from memory. Everything in sections 2–6 is a statement of what the software does today, with file references so counsel or an engineer can verify. Section 7 lists where the live pages are already wrong. Section 8 is the ask.*

*DRAFT FOR COUNSEL. NOT FOR PUBLICATION. Agents do not write the final policy text; counsel does. See [launch-legal-checklist.md](./launch-legal-checklist.md).*

---

## 1. The business in one paragraph

Mosaic Finance (mosaicfinance.ai) is a Canadian personal-finance **tracking and education** web app. Users log spending, set budgets, record net worth and holdings, and watch a "Financial Health Score." A paid tier ("Progress") adds an AI guide named Charlie, an AI-generated "Progress Report," and statement/receipt parsing. It is explicitly **not** an advice product: no registrant under NI 31-103, no human advisor reviews any user's data, no recommendations about specific securities or account actions. Operator named on the site today: **ChainForge Labs, Saskatoon, Saskatchewan** (entity to be confirmed by the owner; see checklist §1). Only Canadian residents 18+ may sign up. Pricing is CAD.

Launch mode today is **waitlist**. No one has been charged. The policy must be live and accurate before the first charge.

## 2. Applicable regimes (for counsel to confirm)

- **PIPEDA** — commercial activity, personal information, cross-border processors (US).
- **Quebec Law 25** (Act respecting the protection of personal information in the private sector, as amended) — the signup province picker includes QC. If Quebec users are served: person in charge of PI, privacy policy in plain language, consent rules, confidentiality-incident register, PIA for transfers outside Quebec (s. 17), automated-decision notice (s. 12.1), portability (s. 27), French-language version (Charter of the French Language).
- **Alberta PIPA / BC PIPA** are substantially similar; PIPEDA governs cross-border flows regardless.
- **Consumer protection** for the subscription contract: Ontario CPA (internet agreements, negative-option billing, arbitration/class-action limits), Quebec CPA (distance contracts, s. 11.1 forum/class-action), Saskatchewan *Consumer Protection and Business Practices Act*, and the federal Competition Act (drip pricing; the displayed price must be the full price before tax).
- **CASL** — the app sends waitlist nurture, trial-lifecycle, and biweekly education email. Express consent captured at waitlist/signup; unsubscribe implemented (`src/lib/email/unsubscribe.ts`, `waitlist_signups.unsubscribed_at`, `notification_preferences`). Counsel to confirm the consent language on the forms.
- **Securities** — no NI 31-103 registration; the product avoids tailored recommendations. Terms must state this clearly. House style for the disclaimer is already in code: *"Educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes."*
- **GST/HST** on SaaS to Canadian consumers — accountant question, flagged in the checklist.

## 3. Personal information collected (inventory from the schema)

Source: `supabase/migrations/001`–`036`, `src/lib/schemas/`, `src/lib/claude/prompts/`.

| Category | Fields | Where / how collected | Sensitivity |
|---|---|---|---|
| Account | email, password hash (Supabase Auth) or Google OAuth identity | signup form, `src/lib/actions/auth.ts` | identifying |
| Google sign-in metadata | Google display name, avatar URL, Google `sub` | stored by Supabase Auth in `auth.users.raw_user_meta_data`; the app never reads or displays it | identifying — **contradicts the current "we never collect your legal name" claim** |
| Profile | self-chosen alias, province, **age (integer, not range)**, **sex**, employment type, family structure, annual income, role | `user_profiles`; onboarding and settings | low–medium |
| Household | `household_members`: relationship (spouse/child/parent/sibling/other), age, sex, occupation, annual income, dependant flag, free-text notes | onboarding / fact-find | **medium — personal information about third parties (spouse, children) collected from the user, who may not be able to consent for them** |
| Financial profile | annual income, monthly expenses, monthly savings, emergency-fund months, debts (type, balance, rate), goals, retirement target age | `financial_profiles`, fact-find conversation | **sensitive financial** |
| Risk profile | questionnaire answers and score | `risk_profiles` | medium |
| Holdings and assets | account type (RRSP/TFSA/FHSA/etc.), institution, approximate balances; fixed assets | `investment_holdings`, `fixed_assets` | sensitive financial |
| Tracking | transactions (date, amount, merchant/description, category), recurring items, category budgets, budget plan entries, cash anchors, balance checks, spending baselines | `transactions`, `recurring_items`, `category_budgets`, `budget_plan_entries`, `cash_anchors`, `balance_checks`, `spending_baselines` | sensitive financial; merchant descriptions are free text |
| Net worth | monthly snapshots and labels | `net_worth_snapshots`, `snapshot_labels` | sensitive financial |
| Goals and gamification | goals, achievements, streaks | `goals`, `user_achievements` | low |
| Health Score | computed score history | `health_score_history` | derived |
| Conversations | full transcripts with Charlie and the fact-find interview | `conversation_sessions`, `conversation_messages` | sensitive; free text, may contain anything the user types |
| Reports | AI-generated Progress Report sections and PDF | `financial_plans` | derived, sensitive |
| Uploads | bank/brokerage statements and receipts (PDF/CSV/image) and the parsed rows | Supabase Storage bucket `documents/{spending,statements}/<uid>/`, `document_uploads`, `transactions` | **sensitive; may contain account numbers and legal name as printed by the bank** — the app does not strip them from the stored file |
| Billing | Stripe customer ID, subscription ID, tier, status, period end, founding flag | `user_profiles` (IDs only; card data never touches our servers) | low on our side; Stripe holds the rest |
| Email ops | cached email, send timestamps, notification preferences | `user_profiles`, `waitlist_signups` | low |
| AI metering | per-call token counts, model, kind, session ID — **no content** | `ai_usage_events` | low |
| Market-context features (built, hidden at launch) | watchlists, picks, X OAuth tokens if the user connects X | `user_watchlists`, `user_picks`, `x_oauth_tokens` | medium; not on the launch surface |
| Waitlist | email, province, consent timestamp, unsubscribe/conversion timestamps | `waitlist_signups` | identifying |

**Not collected, by design:** SIN, government ID, bank login credentials, card numbers, exact street address, employer name (the claims already on `/privacy` are true for form fields; the caveats are Google metadata and whatever is printed on uploaded statements).

## 4. Processors / third parties and where data goes

| Processor | What it receives | Region | Notes |
|---|---|---|---|
| **Supabase** (Postgres, Auth, Storage) | everything in §3 | AWS `ca-central-1` (Montreal) | RLS on every table; service role used only in server jobs |
| **Vercel** | request handling, server-side rendering, logs | functions pinned to `yul1` (Montreal); edge network is global | Vercel Analytics is loaded (page views, no PII) |
| **Anthropic** (Claude API) | fact-find and Charlie messages, financial figures needed for the report, uploaded statement text for parsing | US | API terms: not used for training by default; zero-data-retention is a contract option counsel may want. All prompts carry the education-not-advice system framing. |
| **Stripe** | email, billing name as the user enters it at checkout, card, subscription state | US (data stored globally) | Stripe is the system of record for invoices and receipts |
| **Resend** | email address, email body (transactional: report ready, trial reminders; opted-in: biweekly education, weekly market) | US | emails contain **no dollar amounts** by project rule |
| **Sentry** | error events, stack traces, session replay at 10% sample + 100% on error | US | `sentry.client.config.ts`: `sendDefaultPii` not enabled; Replay uses the SDK default `maskAllText`/`blockAllMedia`. Project rule: user IDs only, never amounts or names. Counsel may want replay disabled or explicitly confirmed masked. |
| **PostHog** | planned for Phase 1C; event names, user IDs, counts | US (or EU host, configurable) | not yet in `src/`; disclose when it ships |
| **Upstash Redis** | cache keys, rate-limit counters | US | no personal data by design |
| **Google** | OAuth identity if the user picks Google sign-in | US | optional path |
| **xAI, Finnhub, FMP, Alpha Vantage** | ticker symbols for market data | US | no user data; the market-context surface is hidden at launch |

Cross-border: Anthropic, Stripe, Resend, Sentry, Upstash, PostHog are US-based. PIPEDA requires transparency about foreign processing; Law 25 s. 17 requires a PIA before communicating PI outside Quebec and a contractual-protection assessment.

## 5. Purposes

1. Provide the tracking features the user asked for (free tier, forever).
2. Compute the Financial Health Score and keep its history.
3. Generate the Progress Report and answer Charlie questions (paid; AI processing by Anthropic).
4. Parse uploaded statements/receipts into transactions (paid; AI processing).
5. Bill and manage subscriptions (Stripe).
6. Send transactional email, and marketing/education email only with consent, with unsubscribe.
7. Operate, secure, debug, and meter the service (Sentry, AI usage metering, rate limits).
8. Honour the Consistency Guarantee (eligibility computed from weekly logs, monthly snapshots, and Score delta over 90 days — `src/lib/health-score/guarantee.ts`).

No sale, no advertising use, no profiling for third parties, no data brokers. No credit decisions.

## 6. Retention, deletion, access — current reality

- **Retention:** no retention schedule and no purge job exists. All data is kept until manually deleted by an administrator.
- **Deletion:** the settings page shows a "Delete All My Data" button with a typed-confirmation modal, but the handler is a stub (`alert(...)`) — `src/app/dashboard/settings/page.tsx`. No API route exists. Only 1 of 23 foreign keys to `user_profiles(id)` has `ON DELETE CASCADE` (`household_members`), and `user_profiles.id → auth.users(id)` does not cascade, so a naive auth-user delete would fail. **Deletion must be requested by email today and performed by hand.**
- **Export:** "Export My Data" is likewise a stub. No route exists.
- **Access / correction:** profile, province, employment, family structure, and notification preferences are editable in settings. Transactions, goals, holdings, snapshots are editable/deletable individually in the app.
- **Unsubscribe:** implemented for marketing/education email; transactional email continues while the account exists.
- **Stripe records:** invoices and receipts live in Stripe; CRA record-keeping (6 years) is met there.

The owner has a code task queued to implement real deletion (cancel Stripe subscription → delete storage objects → cascade-delete rows → delete auth user) and JSON export. Until that ships, the policy must not promise self-serve deletion. Proposed interim wording for counsel to approve: *deletion and export available on request to hello@mosaicfinance.ai, fulfilled within 30 days.*

## 7. Where the live pages are already inaccurate (as of 2026-10-13)

`src/app/(marketing)/privacy/page.tsx`:

1. "We never collect your legal name" — Google sign-in stores it in auth metadata; uploaded statements may contain it.
2. "age range" — the schema stores an integer age.
3. "Conversation transcripts … used solely to build your Progress Report" — also used for Charlie chat and retained indefinitely.
4. Third-party list omits Upstash, Google (OAuth), Vercel Analytics, and the planned PostHog; it does not say the processors are in the US.
5. "Delete your data … from your settings page" and "Export your data" — not implemented (§6).
6. No privacy officer, no retention periods, no complaint route (OPC/CAI), no breach commitment, no automated-decision notice, no cross-border statement, no French version.
7. Effective date April 1 2026 predates the current product (tiers, trial, guarantee, uploads all shipped later).

`src/app/(marketing)/terms/page.tsx`:

1. §7 "billed monthly" — annual billing exists and is the default on the pricing page.
2. No mention of the 7-day card-free reverse trial, the 30-day first-payment refund, or the Consistency Guarantee and its exact conditions.
3. No prices, no founding-member price lock, no soft-cap / fair-use language for Charlie.
4. §4 and §11 promise self-serve account deletion (not implemented).
5. §12 Saskatchewan courts for all disputes — check Quebec/Ontario consumer-contract limits.
6. No statement that no human advisor reviews reports/chats (the project's compliance rules forbid implying one does; stating the opposite is useful).

## 8. The ask

Please draft, or rewrite the existing pages into:

1. **Privacy policy** (EN; FR if we serve Quebec at launch) covering §3–§6 above, naming the entity from the checklist, a privacy officer title, retention periods you are comfortable with given §6, the cross-border processors in §4, Law 25 items if applicable, and rights/complaint routes.
2. **Terms of service** (EN; FR if QC) covering: operator; eligibility (18+, Canadian resident); not-advice and no-registrant statement; AI content disclaimer; tiers and CAD prices (Pulse $0; Progress $17/mo or $170/yr; founding $8/mo or $80/yr for the first 200, locked for life); 7-day card-free trial; monthly and annual auto-renew with cancel-anytime; 30-day no-questions refund of the first payment; the **Consistency Guarantee** using this exact text — *"Log your spending each week and complete your monthly net-worth snapshot for 90 days. If your Financial Health Score hasn't improved by the end, we refund your first payment. The Score measures tracking consistency, not investment returns."* — with the refund limited to the first payment; fair-use caps; acceptable use; IP; liability cap; termination; governing law and consumer-law carve-outs; changes with notice.
3. **A short retention schedule** we can publish and implement in code.
4. **Consent language** for the waitlist form, the signup form (including a separate marketing-email checkbox if you want unbundled consent), and the statement-upload screen (user uploads a document that may contain third-party or extra personal data).
5. Confirmation of whether **Sentry Session Replay** should stay on (masked) or be removed, and whether to request Anthropic zero-data-retention.

What we will do with it: a single pull request swaps the two page bodies, updates the effective dates, wires the settings buttons to whatever the policy says (mailto interim or real endpoints), and lists every changed string for compliance review. Nothing goes live before that PR and the checklist §1 entity/Stripe items are complete.

## 9. Files counsel or an engineer may want to open

- Privacy page: `src/app/(marketing)/privacy/page.tsx`
- Terms page: `src/app/(marketing)/terms/page.tsx`
- Offer and guarantee copy (canonical): `src/lib/config/offer.ts`; prices: `src/lib/config/pricing.ts`; trial length and public tiers: `src/lib/config/launch-surface.ts`
- Guarantee eligibility logic: `src/lib/health-score/guarantee.ts`, `src/app/api/guarantee/status/route.ts`
- Settings data section (stubs): `src/app/dashboard/settings/page.tsx`
- Schema: `supabase/migrations/`
- Email templates: `src/lib/resend/client.ts`, `src/lib/email/`
- Sentry: `sentry.client.config.ts`, `sentry.server.config.ts`
- Project compliance rules all agents follow: `AGENTS.md`
