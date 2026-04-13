import { cn } from "@/lib/utils";

interface MosaicLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Use `onDark` for dark backgrounds (e.g. app sidebar). */
  variant?: "default" | "onDark";
  /** When true, hides the wordmark at md–lg breakpoints (collapsed sidebar). */
  collapseToEmblem?: boolean;
}

const sizeConfig = {
  sm: { icon: "h-7", word: "text-sm", gap: "gap-2" },
  md: { icon: "h-9", word: "text-xl", gap: "gap-2.5" },
  lg: { icon: "h-12", word: "text-3xl", gap: "gap-3" },
} as const;

export function MosaicLogo({
  size = "md",
  className,
  variant = "default",
  collapseToEmblem = false,
}: MosaicLogoProps) {
  const isOnDark = variant === "onDark";
  const emblemSrc = isOnDark
    ? "/logos/MosaicEmblemLogoWhiteBack.png"
    : "/logos/MosaicEmblemLogo.png";
  const config = sizeConfig[size];
  const letterColor = isOnDark ? "text-white" : "text-[var(--text-primary)]";

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <img
        src={emblemSrc}
        alt=""
        className={cn("shrink-0 w-auto", config.icon)}
      />
      <span
        className={cn(
          "font-display font-semibold lowercase tracking-tight",
          letterColor,
          config.word,
          collapseToEmblem && "md:max-lg:hidden",
        )}
      >
        mosaic finance
      </span>
    </div>
  );
}
