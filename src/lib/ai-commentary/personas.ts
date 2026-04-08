import type { PersonaSlug } from "@/lib/market-data/types";
import type { ClaudeModel } from "@/lib/claude/client";

export interface Persona {
  slug: PersonaSlug;
  name: string;
  title: string;
  /** One-line tagline under the name */
  philosophySummary: string;
  /** Fund, family office, or firm most associated with this investor */
  fundOrCompany: string;
  /** Longer strategy description shown before the user generates commentary */
  strategySummary: string;
  avatarInitials: string;
  accentColor: string;
}

export const PERSONAS: Persona[] = [
  {
    slug: "benjamin_graham",
    name: "Benjamin Graham",
    title: "Father of Security Analysis",
    philosophySummary: "Intrinsic value, margin of safety, and defensive investing.",
    fundOrCompany: "Graham-Newman Corporation",
    strategySummary:
      "Graham pioneered systematic value investing: buy below liquidation or earnings-based intrinsic value, diversify across net-net stocks where appropriate, and insist on a margin of safety so mistakes do not wipe out capital. His framework treats the market as a voting machine short-term and a weighing machine long-term.",
    avatarInitials: "BG",
    accentColor: "#78716C",
  },
  {
    slug: "warren_buffett",
    name: "Warren Buffett",
    title: "Value Investing Oracle",
    philosophySummary: "Durable moats, margin of safety, and long-term compounding.",
    fundOrCompany: "Berkshire Hathaway",
    strategySummary:
      "Buffett evolved Graham’s discipline into quality-at-fair-price investing: wonderful businesses with widening moats, owner-oriented management, and decades-long holding periods. He ignores quarterly noise and focuses on owner earnings, reinvestment runway, and rational capital allocation.",
    avatarInitials: "WB",
    accentColor: "#8B5CF6",
  },
  {
    slug: "charlie_munger",
    name: "Charlie Munger",
    title: "Mental Models & Quality Investing",
    philosophySummary: "Inversion, multidisciplinary thinking, and concentrated quality.",
    fundOrCompany: "Berkshire Hathaway · Daily Journal Corp",
    strategySummary:
      "Munger emphasizes latticework mental models from multiple disciplines, inversion (avoiding stupidity), and owning a few great businesses for decades rather than many mediocre ones. Partner to Buffett, he pushed the shift from cheap cigars to exceptional franchises.",
    avatarInitials: "CM",
    accentColor: "#A855F7",
  },
  {
    slug: "michael_burry",
    name: "Michael Burry",
    title: "Contrarian Deep Value",
    philosophySummary: "Asymmetric bets, forensic accounting, and patience for the fat pitch.",
    fundOrCompany: "Scion Asset Management",
    strategySummary:
      "Burry digs into balance sheets and sub-industry dynamics to find mispriced securities and macro asymmetries—often opposite the crowd. He is willing to endure years of underperformance when conviction and catalysts align, as with housing CDS in 2007–08.",
    avatarInitials: "MB",
    accentColor: "#6366F1",
  },
  {
    slug: "john_templeton",
    name: "John Templeton",
    title: "Global Contrarian Bargain Hunter",
    philosophySummary: "Buy at maximum pessimism; search worldwide for value.",
    fundOrCompany: "Templeton Growth Fund",
    strategySummary:
      "Templeton bought what others feared—often at market bottoms—and diversified globally before it was mainstream. He looked for the best companies in the cheapest markets, emphasizing patience, optimism through cycles, and avoiding herd psychology.",
    avatarInitials: "JT",
    accentColor: "#0EA5E9",
  },
  {
    slug: "ray_dalio",
    name: "Ray Dalio",
    title: "All-Weather Macro Strategist",
    philosophySummary: "Risk parity, macro debt cycles, and all-weather portfolio construction.",
    fundOrCompany: "Bridgewater Associates",
    strategySummary:
      "Dalio models economies as machines driven by credit and productivity. He balances risk across asset classes (risk parity), studies long- and short-term debt cycles, and stresses radical transparency and diversified return streams that perform across inflation and growth regimes.",
    avatarInitials: "RD",
    accentColor: "#3B82F6",
  },
  {
    slug: "george_soros",
    name: "George Soros",
    title: "Reflexivity & Macro",
    philosophySummary: "Reflexivity, boom-bust dynamics, and bold macro positioning.",
    fundOrCompany: "Soros Fund Management · Quantum Fund",
    strategySummary:
      "Soros views markets as reflexive: participants’ beliefs change fundamentals, creating self-reinforcing booms and busts. He combines philosophy of fallibility with large, thesis-driven currency and macro trades when risk-reward is asymmetric.",
    avatarInitials: "GS",
    accentColor: "#F97316",
  },
  {
    slug: "jim_simons",
    name: "Jim Simons",
    title: "Quantitative Systems",
    philosophySummary: "Pattern recognition, statistical edge, and systematic execution.",
    fundOrCompany: "Renaissance Technologies (Medallion Fund)",
    strategySummary:
      "Simons built teams of mathematicians and scientists to find subtle, short-horizon statistical edges across thousands of instruments. The approach is model-driven, data-hungry, and ruthlessly focused on process and capacity—not narrative.",
    avatarInitials: "JS",
    accentColor: "#14B8A6",
  },
  {
    slug: "jesse_livermore",
    name: "Jesse Livermore",
    title: "Tape Reading & Trends",
    philosophySummary: "Trend following, market psychology, and cutting losses fast.",
    fundOrCompany: "Independent trader (historical)",
    strategySummary:
      "Livermore traded price action and crowd psychology: ride the trend, pyramid only when winning, and never argue with the tape. His rules—patience for the setup, discipline on stops, and fear of overtrading—still frame discretionary technical trading.",
    avatarInitials: "JL",
    accentColor: "#D97706",
  },
  {
    slug: "howard_marks",
    name: "Howard Marks",
    title: "Risk & Cycles Analyst",
    philosophySummary: "Market cycles, second-level thinking, and risk-reward asymmetry.",
    fundOrCompany: "Oaktree Capital Management",
    strategySummary:
      "Marks focuses on where we are in the cycle, what’s priced in, and the gap between fundamentals and psychology. Second-level thinking means asking what others miss; successful investing is more about controlling risk and buying at the right price than being brilliant at picking growth names.",
    avatarInitials: "HM",
    accentColor: "#F59E0B",
  },
  {
    slug: "cathie_wood",
    name: "Cathie Wood",
    title: "Disruptive Innovation Advocate",
    philosophySummary: "Exponential growth, S-curve adoption, and technology convergence.",
    fundOrCompany: "ARK Invest",
    strategySummary:
      "Wood builds thematic portfolios around platforms she believes will transform economies—AI, genomics, fintech, energy storage. She accepts volatility for long-duration exposure to innovation leaders and shares open research to stress-test theses.",
    avatarInitials: "CW",
    accentColor: "#EC4899",
  },
  {
    slug: "peter_lynch",
    name: "Peter Lynch",
    title: "Growth at a Reasonable Price",
    philosophySummary: "GARP investing, tenbaggers, and investing in what you know.",
    fundOrCompany: "Fidelity Magellan Fund (former)",
    strategySummary:
      "Lynch combined boots-on-the-ground observation with fundamentals: find understandable businesses early in growth phases, watch inventory and same-store trends, and avoid hot stories without earnings. He favored “tenbaggers” in boring industries others ignored.",
    avatarInitials: "PL",
    accentColor: "#10B981",
  },
  {
    slug: "jack_bogle",
    name: "Jack Bogle",
    title: "Indexing & Investor Advocacy",
    philosophySummary: "Own the market, minimize costs, stay the course.",
    fundOrCompany: "The Vanguard Group",
    strategySummary:
      "Bogle argued most active managers underperform after fees and taxes. His legacy is the low-cost index fund as the default rational choice for long-term wealth: broad diversification, minimal turnover, and investor behavior that ignores noise.",
    avatarInitials: "JB",
    accentColor: "#06B6D4",
  },
  {
    slug: "david_dudding",
    name: "David Dudding",
    title: "Quality Global Growth",
    philosophySummary: "Compounders, global franchises, and durable earnings.",
    fundOrCompany: "Columbia Threadneedle (Global Focus / similar mandates)",
    strategySummary:
      "Dudding emphasizes high-quality companies with pricing power, recurring revenue, and long runways outside the index’s largest weights. The style blends growth and quality with a global lens—favoring businesses that can reinvest at attractive returns for years.",
    avatarInitials: "DD",
    accentColor: "#64748B",
  },
  {
    slug: "mark_schmehl",
    name: "Mark Schmehl",
    title: "Canadian Growth & Momentum",
    philosophySummary: "Concentrated growth, momentum, and special situations.",
    fundOrCompany: "Fidelity Canadian Asset Allocation / growth mandates",
    strategySummary:
      "Schmehl is known in Canada for aggressive growth and momentum within a disciplined process—high conviction, willingness to rotate with earnings revisions, and focus on names where Canadian investors often have an information edge versus global generalists.",
    avatarInitials: "MS",
    accentColor: "#84CC16",
  },
  {
    slug: "canadian_perspective",
    name: "Canadian Strategist",
    title: "TSX & Registered Account Focus",
    philosophySummary: "TSX sectors, RRSP/TFSA optimization, and CAD/USD dynamics.",
    fundOrCompany: "Canadian market lens (composite)",
    strategySummary:
      "This lens stresses Canadian-specific rules: dividend tax credits, RRSP/TFSA/FHSA trade-offs, provincial tax, resource and financials-heavy indices, and currency hedging decisions for US holdings. It frames global moves through a domestic household balance sheet.",
    avatarInitials: "CA",
    accentColor: "#EF4444",
  },
];

/** Group labels for the Market Context commentary grid (every slug appears once). */
export const PERSONA_GROUPS: { label: string; slugs: PersonaSlug[] }[] = [
  {
    label: "Value and Fundamentals",
    slugs: [
      "benjamin_graham",
      "warren_buffett",
      "charlie_munger",
      "michael_burry",
      "john_templeton",
    ],
  },
  {
    label: "Macro, Risk & Quantitative",
    slugs: ["ray_dalio", "george_soros", "jim_simons", "jesse_livermore", "howard_marks"],
  },
  {
    label: "Growth & Indexing",
    slugs: ["cathie_wood", "peter_lynch", "jack_bogle", "david_dudding", "mark_schmehl"],
  },
  {
    label: "Regional perspective",
    slugs: ["canadian_perspective"],
  },
];

export const ALL_PERSONA_SLUGS: PersonaSlug[] = PERSONAS.map((p) => p.slug);

export function getPersona(slug: PersonaSlug): Persona | undefined {
  return PERSONAS.find((p) => p.slug === slug);
}

export function getModelForTier(tier: string): ClaudeModel {
  return tier === "advisor" ? "opus" : "sonnet";
}
