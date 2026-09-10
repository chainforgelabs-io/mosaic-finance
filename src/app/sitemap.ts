import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";
  const paths = [
    "",
    "/waitlist",
    "/privacy",
    "/terms",
    "/calculators/fhsa",
    "/calculators/rrsp-vs-tfsa",
    "/calculators/cpp-timing",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path.startsWith("/calculators") ? "monthly" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));
}
