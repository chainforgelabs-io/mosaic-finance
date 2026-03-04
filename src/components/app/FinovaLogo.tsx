import { cn } from "@/lib/utils";

interface FinovaLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { box: "size-7", font: "text-xs", label: "text-sm" },
  md: { box: "size-9", font: "text-sm", label: "text-xl" },
  lg: { box: "size-12", font: "text-lg", label: "text-3xl" },
} as const;

export function FinovaLogo({ size = "md", className }: FinovaLogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-[var(--emerald)]",
          config.box,
        )}
      >
        <span className={cn("font-display font-bold text-white", config.font)}>
          F
        </span>
      </div>
      <span
        className={cn(
          "font-display font-semibold text-[var(--text-primary)]",
          config.label,
        )}
      >
        Finova
      </span>
    </div>
  );
}
