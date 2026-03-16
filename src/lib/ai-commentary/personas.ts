import type { PersonaSlug } from "@/lib/market-data/types";
import type { ClaudeModel } from "@/lib/claude/client";

export interface Persona {
  slug: PersonaSlug;
  name: string;
  title: string;
  philosophySummary: string;
  avatarInitials: string;
  accentColor: string;
}

export const PERSONAS: Persona[] = [
  {
    slug: "ray_dalio",
    name: "Ray Dalio",
    title: "All-Weather Macro Strategist",
    philosophySummary:
      "Risk parity, macro debt cycles, and all-weather portfolio construction.",
    avatarInitials: "RD",
    accentColor: "#3B82F6",
  },
  {
    slug: "warren_buffett",
    name: "Warren Buffett",
    title: "Value Investing Oracle",
    philosophySummary:
      "Durable moats, margin of safety, and long-term compounding.",
    avatarInitials: "WB",
    accentColor: "#8B5CF6",
  },
  {
    slug: "cathie_wood",
    name: "Cathie Wood",
    title: "Disruptive Innovation Advocate",
    philosophySummary:
      "Exponential growth, S-curve adoption, and technology convergence.",
    avatarInitials: "CW",
    accentColor: "#EC4899",
  },
  {
    slug: "howard_marks",
    name: "Howard Marks",
    title: "Risk & Cycles Analyst",
    philosophySummary:
      "Market cycles, second-level thinking, and risk-reward asymmetry.",
    avatarInitials: "HM",
    accentColor: "#F59E0B",
  },
  {
    slug: "peter_lynch",
    name: "Peter Lynch",
    title: "Growth at a Reasonable Price",
    philosophySummary:
      "GARP investing, tenbaggers, and investing in what you know.",
    avatarInitials: "PL",
    accentColor: "#10B981",
  },
  {
    slug: "canadian_perspective",
    name: "Canadian Strategist",
    title: "TSX & Registered Account Focus",
    philosophySummary:
      "TSX sectors, RRSP/TFSA optimization, and CAD/USD dynamics.",
    avatarInitials: "CA",
    accentColor: "#EF4444",
  },
];

export function getPersona(slug: PersonaSlug): Persona | undefined {
  return PERSONAS.find((p) => p.slug === slug);
}

export function getModelForTier(tier: string): ClaudeModel {
  return tier === "premium" ? "opus" : "sonnet";
}
