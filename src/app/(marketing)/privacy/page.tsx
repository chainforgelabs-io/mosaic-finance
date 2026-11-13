import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Mosaic Finance",
  description:
    "How Mosaic Finance handles your information. We do not ask for your SIN, bank login, or government ID.",
};

export default function PrivacyPage() {
  return (
    <main>
      <Nav hideAuth />

      <section className="bg-slate-950 px-6 pb-16 pt-32">
        <div className="mx-auto max-w-[760px]">
          <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.1em] text-emerald">
            Privacy Policy
          </p>
          <h1 className="font-display text-[32px] font-bold leading-tight text-text-inverse sm:text-[42px]">
            Your data stays yours.
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed text-text-inverse/60">
            Effective November 10, 2026 &middot; Last updated November 10, 2026
          </p>
          <p className="mt-3">
            <a
              href="/privacy/fr"
              className="font-body text-sm text-emerald underline underline-offset-2 hover:text-emerald-dark"
            >
              Français
            </a>
          </p>
        </div>
      </section>

      <section className="bg-warm-50 px-6 py-16">
        <div className="mx-auto max-w-[760px] space-y-12">
          <Block title="Our Core Commitment">
            <p>
              Mosaic Finance is built on a privacy-first principle: we collect
              only the minimum information required to generate a meaningful
              Progress Report for you. We do not sell, rent, or share your
              personal data with third parties for marketing or advertising
              purposes — ever.
            </p>
          </Block>

          <Block title="What We Never Collect">
            <p>
              We have intentionally designed Mosaic Finance so that the
              following sensitive information is never requested, collected, or
              stored:
            </p>
            <ul>
              <li>
                A legal name typed into Mosaic. If you sign in with Google,
                Google may send a display name and photo to the login system.
                We use that only to sign you in, and we do not put it on your
                Progress Report.
              </li>
              <li>Government-issued identification</li>
              <li>Social Insurance Number (SIN)</li>
              <li>Bank account numbers, login credentials, or access tokens</li>
              <li>Credit card numbers (payments are processed securely by Stripe — we never see or store your card details)</li>
              <li>Exact home address</li>
              <li>Employer name or workplace details</li>
            </ul>
            <p>
              You interact with Mosaic Finance using a self-chosen alias. We
              do not require — or want — your real name.
            </p>
          </Block>

          <Block title="What We Do Collect">
            <p>
              To generate a personalized Progress Report, we collect the
              following through our conversational onboarding:
            </p>
            <ul>
              <li>
                <strong>Profile information:</strong> your chosen alias,
                province of residence, age range, employment type, and family
                structure
              </li>
              <li>
                <strong>Financial information:</strong> income ranges, expense
                categories, savings goals, debt categories, investment holdings
                (account types and approximate values), and risk tolerance
              </li>
              <li>
                <strong>Conversation transcripts:</strong> your interactions
                with our AI education guide, used solely to build your Progress Report
              </li>
              <li>
                <strong>Account credentials:</strong> email address and
                password, or Google sign-in, for authentication
              </li>
              <li>
                <strong>What you track:</strong> transactions, budgets, goals,
                net-worth snapshots, holdings, and uploaded statements or
                receipts if you choose to upload them
              </li>
              <li>
                <strong>The Score:</strong> your Financial Health Score and its
                history, calculated from the information on file
              </li>
            </ul>
          </Block>

          <Block title="How We Use Your Data">
            <p>Your data is used exclusively to:</p>
            <ul>
              <li>Generate your Progress Report using AI</li>
              <li>Provide you with market context and educational insights relevant to your profile</li>
              <li>Send you notifications you have opted into (Progress Report ready, weekly market updates)</li>
              <li>Improve the quality of our tracking and education tools</li>
            </ul>
            <p>
              We do not use your financial data to target advertising, build
              marketing profiles, or sell insights to third parties.
            </p>
          </Block>

          <Block title="Data Storage &amp; Security">
            <ul>
              <li>
                Account records are stored in Canada (Supabase in{" "}
                <code>ca-central-1</code>, Montreal) and the app is served from
                Canada (Vercel, Montreal)
              </li>
              <li>Data is encrypted in transit (TLS) and at rest</li>
              <li>
                Database access is controlled through row-level security
                policies — you can only access your own data
              </li>
              <li>
                We never receive or store your payment card number. Stripe does.
              </li>
            </ul>
            <p>
              Some service providers process information outside Canada. That
              includes the contents of a Charlie conversation and the figures
              needed to write a Progress Report, which are sent to Anthropic.
              The companies and what they receive are listed below.
            </p>
          </Block>

          <Block title="Third-Party Services">
            <p>
              We use the following third-party services to operate Mosaic
              Finance. Each processes only the minimum data necessary for its
              function:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — authentication, database, and file
                storage in Canada (AWS ca-central-1)
              </li>
              <li>
                <strong>Vercel</strong> — application hosting in Montreal
              </li>
              <li>
                <strong>Anthropic (Claude)</strong> — in the United States.
                Conversations and the financial figures needed for a Progress
                Report or a Charlie reply are sent for processing. We do not
                permit that content to be used to train Anthropic&rsquo;s
                models.
              </li>
              <li>
                <strong>Stripe</strong> — in the United States. Payment
                processing and invoices. We never handle the card number.
              </li>
              <li>
                <strong>Resend</strong> — in the United States. Email we send
                you, including the address it goes to.
              </li>
              <li>
                <strong>Sentry</strong> — in the United States. Error reports,
                and a sample of session replays used to diagnose failures. Page
                text is masked. We do not intentionally send dollar amounts,
                account numbers, or chat content.
              </li>
              <li>
                <strong>Upstash</strong> — rate-limit counters. Not your
                financial profile or chat.
              </li>
              <li>
                <strong>PostHog</strong> — in the United States. Product events
                such as signup and a weekly log, with a user id and counts
                only. We do not send dollar amounts, names, email addresses, or
                what you typed.
              </li>
            </ul>
            <p>
              We do not use any advertising networks, tracking pixels, or
              data brokers.
            </p>
          </Block>

          <Block title="Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>
                <strong>Access and export</strong> — download a JSON file from
                Settings with your profile, tracked finances, Financial Health
                Score history, achievements, conversations, and Progress
                Reports. For a copy of an uploaded statement file, email us.
              </li>
              <li>
                <strong>Correction</strong> — edit what you entered, or email us
                and we will correct it
              </li>
              <li>
                <strong>Delete</strong> — delete the account from Settings. That
                removes the Mosaic account, the records listed in the export,
                and uploaded files we store for you. An active paid subscription
                is canceled when the account is deleted. Stripe keeps invoices
                as the payment record.
              </li>
              <li>
                <strong>Withdraw consent</strong> — stop using the service and
                ask us to delete the account
              </li>
              <li>
                <strong>Marketing email</strong> — separate from receipts and
                service email. Unsubscribe in the message or in settings.
              </li>
              <li>
                <strong>A complaint</strong> — write to us first. You may also
                contact the Office of the Privacy Commissioner of Canada. If
                you live in Quebec, you may contact the Commission
                d&rsquo;accès à l&rsquo;information du Québec.
              </li>
            </ul>
          </Block>

          <Block title="Automated results">
            <p>
              The Financial Health Score and the Progress Report are produced
              automatically from information you provide and from what you
              track. They are educational. They do not approve or deny credit,
              insurance, coverage, or an account. To ask about a result, email{" "}
              <a
                href="mailto:hello@mosaicfinance.ai"
                className="text-emerald underline underline-offset-2 hover:text-emerald-dark"
              >
                hello@mosaicfinance.ai
              </a>
              .
            </p>
          </Block>

          <Block title="How long we keep information">
            <ul>
              <li>Account information: until you delete the account, or until we delete it at your request</li>
              <li>Waitlist email: until you unsubscribe or ask us to delete it</li>
              <li>Payment invoices: kept by Stripe as the billing record</li>
              <li>Charlie usage counts (tokens and message counts, not the text): deleted with the account</li>
            </ul>
          </Block>

          <Block title="If something goes wrong">
            <p>
              If a breach creates a real risk of significant harm, we will
              notify the people affected and the Office of the Privacy
              Commissioner of Canada, and the Quebec commission when Quebec law
              requires it. We keep a record of confidentiality incidents.
            </p>
          </Block>

          <Block title="Cookies &amp; Analytics">
            <p>
              Mosaic Finance uses only essential cookies required for
              authentication and session management. We do not use third-party
              advertising cookies or cross-site tracking.
            </p>
          </Block>

          <Block title="Children&rsquo;s Privacy">
            <p>
              Mosaic Finance is for adults 18 and over. We do not knowingly
              collect information from anyone under 18. A parent who believes
              a child has created an account can email us and we will delete it.
            </p>
          </Block>

          <Block title="Changes to This Policy">
            <p>
              We may update this policy from time to time. Material changes will
              be communicated via email to registered users. The effective date
              at the top of this page will always reflect the latest revision.
            </p>
          </Block>

          <Block title="Contact">
            <p>
              If you have questions about this privacy policy or your data,
              contact us at{" "}
              <a
                href="mailto:hello@mosaicfinance.ai"
                className="text-emerald underline underline-offset-2 hover:text-emerald-dark"
              >
                hello@mosaicfinance.ai
              </a>
              .
            </p>
            <p className="mt-3">
              The person in charge of the protection of personal information
              is the operator of Mosaic Finance, at the same address.
            </p>
            <p className="mt-2 text-text-muted">
              ChainForge Labs &middot; Saskatoon, Saskatchewan, Canada
            </p>
          </Block>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold text-text-primary">
        {title}
      </h2>
      <div className="space-y-3 font-body text-[15px] leading-relaxed text-text-secondary [&_code]:rounded [&_code]:bg-warm-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_strong]:font-semibold [&_strong]:text-text-primary [&_ul]:list-none [&_ul]:space-y-2 [&_ul]:pl-0 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[10px] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-emerald">
        {children}
      </div>
    </div>
  );
}
