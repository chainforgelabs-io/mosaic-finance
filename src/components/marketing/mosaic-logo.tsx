export function MosaicLogo({
  size = "md",
  theme = "dark",
}: {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
}) {
  const fontSize = { sm: "18px", md: "22px", lg: "28px" }[size];
  const iconSize = { sm: 32, md: 40, lg: 48 }[size];
  const isOnDark = theme === "dark";
  const color = isOnDark ? "#F9FAFB" : "#1F2937";
  const emblemSrc = isOnDark
    ? "/logos/MosaicEmblemLogoWhiteBack.svg"
    : "/logos/MosaicEmblemLogo.svg";

  return (
    <div className="flex items-center gap-2.5">
      <img
        src={emblemSrc}
        alt=""
        width={iconSize}
        height={iconSize}
        style={{ width: iconSize, height: iconSize }}
      />
      <span
        className="font-bold lowercase tracking-tight leading-none"
        style={{
          fontFamily: "var(--font-display), 'Plus Jakarta Sans', sans-serif",
          fontSize,
          color,
        }}
      >
        mosaic finance
      </span>
    </div>
  );
}
