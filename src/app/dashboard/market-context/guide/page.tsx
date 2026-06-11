import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Bookmark,
  Rss,
  RefreshCw,
  Radar,
  Flame,
  TrendingUp,
  Landmark,
  Newspaper,
  MessageCircle,
  Sparkles,
  Gauge,
  UserPlus,
  Star,
  Twitter,
} from "lucide-react";

export const metadata = {
  title: "Stock Picker Guide",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Compass;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--warm-200)] bg-white p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--emerald)]" />
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
      </div>
      <div className="font-[family-name:var(--font-body)] space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="font-[family-name:var(--font-display)] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)] text-[11px] font-bold text-white">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function StockPickerGuidePage() {
  return (
    <div className="w-full">
      <Link
        href="/dashboard/market-context"
        className="font-[family-name:var(--font-body)] mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--emerald)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Market Context
      </Link>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)] sm:text-[28px]">
          How to use the Stock Picker
        </h1>
        <p className="font-[family-name:var(--font-body)] mt-1 text-sm text-[var(--text-muted)]">
          Four data streams, one scored watchboard. Here is how to read it,
          run it, and tune it.
        </p>
      </div>

      <div className="space-y-4">
        <Section icon={Gauge} title="The big picture">
          <p>
            The Stock Picker continuously collects stock mentions from four
            streams and rolls them into a single 0&ndash;100 score per ticker:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <span>
                <strong>Tracked alpha accounts (25%)</strong> &mdash; the X
                accounts in your Sources list. A mention from a high-weight
                account moves the score far more than general chatter.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <span>
                <strong>Broad X trends (15%)</strong> &mdash; in Heavy mode,
                all of X is swept for tickers with unusually spiking
                discussion vs. their own 7-day baseline.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <span>
                <strong>Congress trades (15%)</strong> &mdash; STOCK Act
                filings ingested daily. Net buys raise the score, net sells
                lower it. Filings can lag the actual trade by up to 45 days,
                so treat them as conviction signals, not timing signals.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <span>
                <strong>News + price action (25%)</strong> &mdash; headline
                flow mapped to tickers, plus 1-day price moves and unusual
                volume.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <span>
                <strong>AI investor consensus (5%)</strong> &mdash; the net
                bullish/bearish stance across cached AI persona takes.
              </span>
            </li>
          </ul>
          <p className="text-[var(--text-muted)]">
            (Sentiment quality makes up the remaining 15%.) Raw signals are
            stored append-only, so scores are always recomputable from
            history.
          </p>
        </Section>

        <Section icon={Compass} title="Reading the Discover tab">
          <p>Each row shows, left to right:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Star className="mr-1 inline h-3.5 w-3.5 text-amber-400" />
              <strong>Star</strong> &mdash; add/remove the ticker from My
              Picks.
            </li>
            <li>
              <strong>Ticker + badges</strong> &mdash;{" "}
              <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-600">
                Mover
              </span>{" "}
              means a &gt;5% price move or 3&times; normal volume.{" "}
              <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
                Radar
              </span>{" "}
              means a score above 60 with <em>low</em> broad-X buzz &mdash;
              quality sources are on it before the crowd. This is the
              highest-value flag.
            </li>
            <li>
              <strong>Score bar</strong> &mdash; the 0&ndash;100 composite.
              Green at 65+, amber in the 40s&ndash;60s.
            </li>
            <li>
              <strong>Mention stats</strong> &mdash; &ldquo;14 mentions 24h
              &middot; 5 alpha &middot; congress 2B/0S&rdquo; reads as: 14
              total mentions, 5 from your tracked accounts, 2 congress buys
              and 0 sells in 30 days.
            </li>
          </ul>
          <p>
            Click the chevron on any row to expand it: you will see the
            actual tweets, filings, and headlines driving the signal, plus
            any cached AI takes.
          </p>
          <p>The three filters:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Top signals</strong> &mdash; everything, ranked by
              score.
            </li>
            <li>
              <strong>Big movers</strong> <TrendingUp className="inline h-3.5 w-3.5" /> &mdash;
              only tickers with outsized price/volume action today.
            </li>
            <li>
              <strong>Under the radar</strong> <Radar className="inline h-3.5 w-3.5" /> &mdash;
              only the sleeper list. Check this one daily.
            </li>
          </ul>
        </Section>

        <Section icon={RefreshCw} title="Running scans & Light vs Heavy mode">
          <p>
            Scans run automatically every 30 minutes during US market hours,
            with a deeper nightly pass that also refreshes AI takes for the
            top tickers, and a daily congress ingest each morning.
          </p>
          <p>
            Want fresh data right now? Hit <strong>Run scan</strong> on the
            Discover tab (limited to 3 scans per 10 minutes). The summary
            line tells you how many posts and signals came in.
          </p>
          <p>The mode toggle at the top of the Picks tab controls cost vs. coverage:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Light</strong> (default) &mdash; hourly scans of
              tracked accounts + news only, AI takes for the top 5 tickers
              nightly. Minimal API spend. Use when you are not actively
              hunting.
            </li>
            <li>
              <strong>Heavy</strong> &mdash; every-30-minute scans, plus the
              broad-X trend sweep, plus top-10 nightly AI enrichment. Flip it
              on when you are aggressively looking for opportunities, flip
              back when done.
            </li>
          </ul>
        </Section>

        <Section icon={Bookmark} title="My Picks & AI assessments">
          <ul className="space-y-2">
            <Step n={1}>
              Star tickers from Discover, or type a ticker directly into the
              &ldquo;Add ticker&rdquo; box on the My Picks tab.
            </Step>
            <Step n={2}>
              Each pick shows live price, score, and any cached AI takes.
            </Step>
            <Step n={3}>
              Hit <strong>AI assessment</strong> on any pick to generate
              fresh takes (~30&ndash;60s) from four investor minds: Warren
              Buffett (value/moats), Ray Dalio (macro), Cathie Wood
              (innovation), and Jesse Livermore (price action).
            </Step>
          </ul>
          <p>
            The disagreement is the point: if Livermore is bullish on
            momentum while Buffett calls it overpriced, you are looking at a
            trade, not an investment. Takes cache for 24 hours &mdash;
            reassess after that for an updated view.
          </p>
        </Section>

        <Section icon={UserPlus} title="Manually adding X accounts to track">
          <p>
            This is the main lever for signal quality. Any public X account
            that posts good stock calls can feed your scanner &mdash; no X
            login or API connection required:
          </p>
          <ul className="space-y-2">
            <Step n={1}>
              Go to the <strong>Sources</strong> tab inside Picks.
            </Step>
            <Step n={2}>
              In the <strong>Tracked X accounts</strong> card, type the
              handle into the <strong>@handle</strong> box &mdash; with or
              without the @ (e.g. <code>unusual_whales</code> or{" "}
              <code>@unusual_whales</code>). Spelling must match the real X
              handle exactly.
            </Step>
            <Step n={3}>
              Click <strong>Track</strong>. The account is active
              immediately and will be included in the next scan (manual or
              scheduled).
            </Step>
            <Step n={4}>
              Use the <strong>Active/Paused</strong> pill to temporarily
              silence an account without losing it, or the trash icon to
              remove it entirely.
            </Step>
          </ul>
          <p>
            New accounts start at weight 0.70 (out of 1.0). Weight controls
            how much that account&rsquo;s mentions move scores &mdash; raise
            it for proven callers, lower it for noisy ones. Editing weights
            is currently done in the Supabase table editor
            (<code>tracked_x_accounts.weight</code>).
          </p>
          <p className="text-[var(--text-muted)]">
            Prune ruthlessly. Ten great accounts beat fifty mediocre ones
            &mdash; every noisy account dilutes the &ldquo;alpha
            mentions&rdquo; portion of the score.
          </p>
        </Section>

        <Section icon={Twitter} title="Linking your X account (optional)">
          <p>
            If X OAuth is configured, the <strong>Your X account</strong>{" "}
            card on the Sources tab lets you connect your own X login, browse
            everyone you follow, and promote accounts into the tracked list
            with one click &mdash; useful for bulk-importing your existing
            FinTwit follows.
          </p>
          <ul className="space-y-2">
            <Step n={1}>
              Click <strong>Connect X</strong> and approve the read-only
              authorization.
            </Step>
            <Step n={2}>
              Back on Sources, click <strong>Load who you follow</strong>.
            </Step>
            <Step n={3}>
              Hit <strong>Track</strong> next to any account that posts
              stock alpha.
            </Step>
          </ul>
          <p className="text-[var(--text-muted)]">
            This feature needs X developer credentials on the server. If the
            card says &ldquo;not configured&rdquo;, manual adding (above)
            covers the same ground.
          </p>
        </Section>

        <Section icon={Landmark} title="Congress members">
          <p>
            Members appear in the Sources tab automatically after the first
            congress ingest &mdash; everyone with a recent filing gets a row.
            Pause any member whose trades you do not want influencing scores
            (e.g. keep only the consistently good traders). Paused members
            are excluded from future ingests.
          </p>
        </Section>

        <Section icon={Rss} title="Tips for the first week">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              The first scan looks sparse &mdash; it only sees ~24h of
              activity. Baselines (7-day buzz, 30-day congress) fill in over
              the first few days and scores get sharper.
            </li>
            <li>
              Check <strong>Under the radar</strong> daily; it is the filter
              the whole pipeline exists for.
            </li>
            <li>
              Star liberally, prune weekly. My Picks is cheap to maintain
              and the AI assessments are most useful on names you are
              actually deciding on.
            </li>
            <li>
              If a source keeps producing junk tickers, pause it &mdash;
              score quality follows source quality.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
