import { cn } from "@/lib/utils";

interface MosaicLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Applied to the wordmark span (e.g. hide on narrow sidebars). */
  wordmarkClassName?: string;
  /** Use `onDark` for dark backgrounds (e.g. app sidebar). */
  variant?: "default" | "onDark";
}

const sizeConfig = {
  sm: { icon: "size-7", word: "text-sm", gap: "gap-2" },
  md: { icon: "size-9", word: "text-xl", gap: "gap-2.5" },
  lg: { icon: "size-12", word: "text-3xl", gap: "gap-3" },
} as const;

const BRAND_YELLOW = "#EAB308";

function MosaicMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="rotate(45 16 16)">
        <rect x="8" y="8" width="8" height="8" fill="#10B981" />
        <rect x="16" y="8" width="8" height="8" fill="#1F2937" />
        <rect x="8" y="16" width="8" height="8" fill="#1F2937" />
        <rect x="16" y="16" width="8" height="8" fill="#10B981" />
        <rect x="14" y="14" width="4" height="4" fill={BRAND_YELLOW} />
      </g>
    </svg>
  );
}



export function MosaicLogo({
  size = "md",
  className,
  wordmarkClassName,
  variant = "default",
}: MosaicLogoProps) {
  const config = sizeConfig[size];
  const letterColor =
    variant === "onDark" ? "text-white" : "text-[var(--text-primary)]";

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <MosaicMark className={cn("shrink-0", config.icon)} />
      <span
        className={cn(
          "font-display font-semibold lowercase tracking-tight",
          letterColor,
          config.word,
          wordmarkClassName,
        )}
      >
        mosaic{" "}
        finance
      </span>
    </div>
  );
}
