"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MosaicLogo } from "./mosaic-logo";

const NAV_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "For Advisors", href: "/#trust" },
];

/**
 * When auth is hidden (waitlist funnel): avoid `/#...` which resolves to the home route.
 * - On `/waitlist`, use same-page hashes (`#how-it-works`).
 * - On `/privacy`, `/terms`, etc., deep-link to `/waitlist#...` where those sections exist.
 */
function navLinkHref(
  href: string,
  hideAuth: boolean,
  pathname: string,
): string {
  if (!hideAuth || !href.startsWith("/#")) return href;
  const hash = href.slice(1);
  if (pathname === "/waitlist") return hash;
  return `/waitlist${hash}`;
}

export function Nav({ hideAuth = false }: { hideAuth?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-white/95 backdrop-blur-sm border-b border-warm-200"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
        <MosaicLogo theme={scrolled ? "light" : "dark"} />

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={navLinkHref(link.href, hideAuth, pathname)}
              className={`font-display text-sm font-medium transition-colors ${
                scrolled
                  ? "text-text-secondary hover:text-text-primary"
                  : "text-text-inverse/70 hover:text-text-inverse"
              }`}
            >
              {link.label}
            </a>
          ))}
          {!hideAuth && (
            <>
              <a
                href="/login"
                className={`font-display text-sm font-medium transition-colors ${
                  scrolled
                    ? "text-text-secondary hover:text-text-primary"
                    : "text-text-inverse/60 hover:text-text-inverse"
                }`}
              >
                Sign In
              </a>
              <a
                href="/#waitlist"
                className="rounded-full bg-emerald px-5 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-emerald-dark"
              >
                Get Started
              </a>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-3 md:hidden">
          {!hideAuth && (
            <a
              href="/#waitlist"
              className="rounded-full bg-emerald px-4 py-1.5 font-display text-xs font-semibold text-white"
            >
              Get Started
            </a>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`p-1 ${scrolled ? "text-text-primary" : "text-text-inverse"}`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-b border-warm-200 bg-white px-6 pb-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={navLinkHref(link.href, hideAuth, pathname)}
              onClick={() => setMobileOpen(false)}
              className="block py-2 font-display text-sm font-medium text-text-secondary"
            >
              {link.label}
            </a>
          ))}
          {!hideAuth && (
            <a
              href="/login"
              className="block py-2 font-display text-sm font-medium text-text-secondary"
            >
              Sign In
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
