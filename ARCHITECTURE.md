# Finova AI — Architecture & Decision Log

Version 1.0 | ChainForge Labs | February 2026

---

## Core Architecture

### Why Next.js (App Router)

Server Components reduce client-side JS bundle size significantly. Built-in API routes eliminate a separate Express server. Vercel deployment is frictionless. The App Router's layout system maps cleanly to Finova's auth/dashboard/admin route separation.

### Why Supabase (not PlanetScale, Neon, or Railway Postgres)

Three reasons specific to Finova:

1. **Row-Level Security (RLS)** — Native Postgres RLS is the compliance backbone. Every table is locked to the authenticated user at the database level. This is not achievable as cleanly with any other managed Postgres provider.
2. **Auth + Storage in one platform** — Keeps the security boundary consistent. Files (blacked-out statements, generated PDFs) are tied to Supabase user sessions via RLS policies, not just application-level checks.
3. **Canadian data residency** — Supabase project is provisioned in `ca-central-1` (AWS Montreal). PIPEDA compliance requires Canadian user data to remain in Canada or under equivalent protection.

### Why Supabase Direct Queries (not Prisma)

Prisma requires the Supabase service role key to function, which bypasses RLS entirely. For a compliance-critical fintech application, every query must respect RLS. The Supabase JS client enforces this automatically using the user's JWT. This is not a performance tradeoff — it is a compliance requirement.

### Why Custom API Routes (not tRPC or Server Actions)

The CIM approval audit trail must be forensically defensible. Every approval action (who reviewed, what they changed, when, what the final output was) is logged server-side with explicit handlers. tRPC's abstraction layer makes this harder to audit and harder to explain to a regulator. Explicit API routes also make rate limiting, request logging (via Sentry), and input validation (via Zod) straightforward to enforce consistently.

### Why Anthropic Claude (Opus for plan generation, Sonnet for conversation)

1. **Superior long-context structured reasoning** — Financial planning requires holding many variables simultaneously across a long conversation. Claude consistently outperforms on this task type.
2. **Instruction-following reliability** — The advisor persona must hold across a 30+ turn conversation without breaking character. Claude's Constitutional AI training makes this more reliable than alternatives.
3. **Lower hallucination rate on factual claims** — In a financial context, a wrong number has real consequences. Claude is more conservative about fabricating specific figures.
4. **Market validation** — The viral X thread that validated this product concept was built on Claude specifically. There is existing user trust in Claude as a financial reasoning engine.
5. **Tiered model usage** — Opus (`claude-opus-4-5-20250301`) for plan generation and walkthrough where reasoning quality directly affects output. Sonnet (`claude-sonnet-4-5-20250929`) for fact-find conversation and market context where speed matters more than depth. This optimizes cost without sacrificing quality on the highest-value outputs.

### Why Vercel `yul1` Region (Montreal)

Canadian data residency. User financial data (even pseudonymized) must not transit through US data centres without explicit user consent under PIPEDA. Montreal region keeps all serverless function execution in Canada.

### Why Human-in-the-Loop (not fully automated delivery)

Legal architecture, not product constraint. All AI-generated recommendations are routed through a CIM-designated reviewer before delivery. This keeps the advice chain anchored to a registered individual, not an unregistered AI system — which is the defensible position under Canadian securities law at MVP stage. This is also a product differentiator: users know a real professional has reviewed their plan.

---

## Database Schema

### Tables

| Table | Purpose |
|---|---|
| `user_profiles` | Extends Supabase `auth.users` — alias, province, subscription tier, role |
| `financial_profiles` | Financial snapshot from onboarding (income, expenses, debts, goals) |
| `conversation_sessions` | Stateful multi-session conversations (fact-find, risk-profile, walkthrough) |
| `conversation_messages` | Individual messages per session (avoids JSONB race conditions) |
| `investment_holdings` | User holdings by account type (RRSP, TFSA, FHSA, etc.) |
| `risk_profiles` | Risk assessment results + conversational insights |
| `financial_plans` | Generated plans with 8-section JSON data, review status, PDF URL |
| `approval_queue` | CIM reviewer queue with SLA deadlines and audit trail |
| `market_context_reports` | Cached market data with TTL (7-day validity) |
| `document_uploads` | Blacked-out statement uploads with parse status |

### Row-Level Security Model

Every user-facing table has RLS enabled. Policies enforce:
- Users can only read/write their own data
- Plans are only visible to users when `status = 'delivered'`
- CIM reviewers (identified by `role = 'cim_reviewer'` on `user_profiles`) can read all plans and manage the approval queue
- Market context reports have no user-level restriction (shared global data)

### Performance Indexes

Critical indexes on:
- `approval_queue(status, sla_deadline)` — queue sorting by urgency
- `conversation_messages(session_id, created_at)` — message history retrieval
- `financial_plans(user_id, status)` — plan lookup by user + delivery status
- All foreign key `user_id` columns across tables

---

## Compliance Model

### Plan Lifecycle (Non-Negotiable)

```
User completes fact-find
→ User inputs holdings + risk profile
→ Claude generates plan (status: pending_review)
→ Plan enters approval_queue
→ CIM reviewer: approve / edit / reject
→ PDF generated server-side (post-approval only)
→ Plan status set to: delivered
→ User notified + PDF available for download
```

A plan with any status other than `delivered` is NEVER accessible to the user. This is enforced at both RLS level and API route level.

### Data Privacy Model (MVP)

- No SIN numbers, no account numbers, no institutional login credentials — ever
- No full legal names — alias or initials only
- Investment holdings entered manually or via blacked-out document upload
- All data encrypted at rest (Supabase default AES-256) and in transit (TLS 1.3)
- No user data sold or shared with third parties
- Supabase Storage files are scoped to user sessions via RLS, not just application logic

---

## Security Layers

### Input Sanitization
All user input passes through `sanitizeUserInput()` before reaching any Claude prompt. This strips XML/HTML tags, role-prefix injection attempts, and control characters. Defense-in-depth for prompt injection prevention.

### Rate Limiting
Upstash Redis-backed rate limiting on all Claude-calling API routes:
- Conversation: 10 messages/minute per user
- Plan generation: 2 plans/hour per user
- PDF download: 5 downloads/hour per user

### Authentication
Supabase Auth with email/password + magic link. Server-side session validation on every API route. Middleware enforces auth on all `/dashboard` and `/admin` routes.

---

## Key Tradeoffs Made

| Decision | What We Chose | What We Rejected | Why |
|---|---|---|---|
| ORM | Supabase direct client | Prisma | Prisma bypasses RLS |
| API style | Custom Next.js routes | tRPC | Audit trail clarity |
| File uploads | Supabase Storage | UploadThing | RLS + single ecosystem |
| LLM | Claude Opus 4.5 + Sonnet 4.5 | GPT-4, Gemini | See above |
| PDF | Puppeteer + Chromium | React-PDF | Institutional output quality |
| Region | yul1 (Montreal) | iad1 (Virginia) | Canadian data residency |

---

## What Needs to Change for Series A Scale

- Add Prisma once RLS policies are mature and service role usage is audited
- Migrate to dedicated Postgres cluster (off Supabase shared) at ~5,000 active users
- Migrate Upstash Redis rate limiting to dedicated Redis cluster at scale
- Separate approval queue into its own service with dedicated SLA monitoring
- Move PDF generation to a dedicated service (Railway/Fly.io) for better memory control and no cold-start delays
- Formal SOC 2 Type II audit (Supabase infrastructure is already compliant — Finova application layer needs independent audit)
- Evaluate Opus-only plan generation cost vs. quality tradeoff at volume

---

*ChainForge Labs | February 2026 | CONFIDENTIAL*
