import { Loader2, Upload } from "lucide-react";

export function StatementStart({
  parsing,
  onUpload,
  onManual,
}: {
  parsing: boolean;
  onUpload: () => void;
  onManual: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
        Start from three months of statements
      </h2>
      <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
        Upload bank and card statements for the household. One upload can cover everyone&apos;s spending.
        We&apos;ll sort money in, needs, and flexible spending, then set what&apos;s left.
      </p>
      <button
        type="button"
        onClick={onUpload}
        disabled={parsing}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2.5 font-display text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] disabled:opacity-60"
      >
        {parsing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {parsing ? "Reading your statements…" : "Upload statements"}
      </button>
      <button
        type="button"
        onClick={onManual}
        className="mt-2 w-full py-2 font-display text-sm font-semibold text-[var(--text-muted)]"
      >
        Enter a balance instead
      </button>
    </div>
  );
}
