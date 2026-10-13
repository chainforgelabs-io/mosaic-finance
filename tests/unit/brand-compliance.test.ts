import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Brand and launch-surface guard. See docs/legal/launch-legal-checklist.md §3 and §5.
 *
 * - "Mosaic University" is a restricted term in ON and BC; "Mosaic Institute"
 *   is an existing Toronto charity. The paid community is "Mosaic Academy".
 * - "portfolio demo" / "not an operated" was pre-launch README framing that
 *   must not reappear on any public surface once real users can be charged.
 */
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /mosaic\s+university/i, reason: 'use "Mosaic Academy", never "University"' },
  { pattern: /mosaic\s+institute/i, reason: '"Mosaic Institute" is an existing charity' },
  { pattern: /portfolio\s+demo/i, reason: "pre-launch README framing" },
  { pattern: /not an operated/i, reason: "pre-launch README framing" },
];

const ROOT = join(__dirname, "..", "..");
const SCAN_DIRS = ["src"];
const SCAN_FILES = ["README.md", "package.json"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".mdx", ".json", ".html", ".css"]);

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (EXTENSIONS.has(full.slice(full.lastIndexOf(".")))) {
      out.push(full);
    }
  }
}

function publicSurfaceFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);
  for (const file of SCAN_FILES) files.push(join(ROOT, file));
  return files;
}

describe("brand compliance", () => {
  const files = publicSurfaceFiles();

  it("scans a non-trivial set of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("never uses restricted or pre-launch brand language", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const { pattern, reason } of FORBIDDEN) {
        const match = text.match(pattern);
        if (match) {
          hits.push(`${relative(ROOT, file)}: "${match[0]}" (${reason})`);
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
