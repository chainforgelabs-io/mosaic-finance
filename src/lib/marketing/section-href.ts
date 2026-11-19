/** Pages that render the homepage sections, so in-page hashes stay on that URL. */
const HOME_PATHS = new Set(["/", "/test"]);

/**
 * `/#pricing` stays on the homepage and on `/test`.
 * From any other page it points back at the homepage.
 */
export function marketingSectionHref(href: string, pathname: string): string {
  if (!href.startsWith("/#")) return href;
  const hash = href.slice(1);
  if (HOME_PATHS.has(pathname)) return hash;
  return `/${hash}`;
}
