const BRAND_YELLOW = "#EAB308";

function MosaicMark({ sizePx }: { sizePx: number }) {
  return (
    <svg
      width={sizePx}
      height={sizePx}
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
  theme = "dark",
}: {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
}) {
  const fontSize = { sm: "18px", md: "22px", lg: "28px" }[size];
  const iconSize = { sm: 22, md: 28, lg: 34 }[size];
  const color = theme === "dark" ? "#F9FAFB" : "#1F2937";

  return (
    <div className="flex items-center gap-2">
      <MosaicMark sizePx={iconSize} />
      <div
        className="flex items-baseline font-bold lowercase tracking-tight"
        style={{
          fontFamily: "var(--font-display), 'Plus Jakarta Sans', sans-serif",
          fontSize,
          color,
        }}
      >
        <span style={{ color, fontSize }}>
          mosaic{" "}
          finance
        </span>
      </div>
    </div>
  );
}
