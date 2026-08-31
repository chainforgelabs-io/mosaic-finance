import { MosaicLogo } from "./mosaic-logo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <MosaicLogo size="sm" theme="dark" />
            <span className="font-body text-[13px] text-text-muted">
              &copy; 2026 ChainForge Labs
            </span>
          </div>

          <div className="flex gap-6">
            <a
              href="/privacy"
              className="font-body text-[13px] text-text-muted transition-colors hover:text-text-inverse"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="font-body text-[13px] text-text-muted transition-colors hover:text-text-inverse"
            >
              Terms
            </a>
            <a
              href="mailto:hello@mosaicfinance.ai"
              className="font-body text-[13px] text-text-muted transition-colors hover:text-text-inverse"
            >
              Contact
            </a>
          </div>

          <p className="font-body text-[13px] text-text-muted">
            Canada
          </p>
        </div>

        <div className="mt-8 border-t border-white/[0.06] pt-6">
          <p className="mx-auto max-w-[900px] text-center font-body text-[11px] leading-relaxed text-text-muted">
            Mosaic Finance is a financial tracking and education tool. This is
            educational information, not financial advice. Speak with a licensed
            financial advisor before implementing any changes.
          </p>
          <p className="mt-4 text-center">
            <a
              href="https://chainforgelabs.io"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 font-body text-[11px] text-text-muted transition-colors hover:text-text-inverse"
            >
              <svg
                viewBox="0 0 32 32"
                width="12"
                height="12"
                fill="currentColor"
                fillRule="evenodd"
                aria-hidden="true"
              >
                <path d="M4 4h24v24H13L4 19Zm4.5 4.5v8.64l6.36 6.36h8.64V8.5Z" />
              </svg>
              Built by Chain Forge Labs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
