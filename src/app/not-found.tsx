import type { Metadata } from "next";
import Link from "next/link";
import { MosaicLogo } from "@/components/app/MosaicLogo";

export const metadata: Metadata = {
  title: "Page not found — Mosaic Finance",
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6 py-16 text-center">
      <Link href="/" aria-label="Mosaic Finance home" className="inline-flex">
        <MosaicLogo size="lg" variant="onDark" />
      </Link>
      <h1 className="mt-10 font-display text-2xl font-semibold text-white">That page isn&apos;t here.</h1>
      <p className="mt-2 max-w-sm font-body text-sm text-slate-300">
        The link may be old, or the address may be mistyped.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald px-6 font-display text-sm font-semibold text-white hover:bg-emerald-dark"
      >
        Back to the homepage
      </Link>
      <p className="mt-12 max-w-sm font-body text-xs text-slate-400">
        Educational information, not financial advice.
      </p>
    </main>
  );
}
