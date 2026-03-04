export function FinovaLogo({
  size = "md",
  theme = "dark",
}: {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
}) {
  const fontSize = { sm: "18px", md: "22px", lg: "28px" }[size];
  const aiSize = { sm: "8px", md: "9px", lg: "11px" }[size];

  return (
    <div className="flex items-baseline gap-0.5">
      <span
        style={{
          fontFamily: "var(--font-display), 'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize,
          color: theme === "dark" ? "#F9FAFB" : "#0C0F17",
          letterSpacing: "-0.02em",
        }}
      >
        finova
      </span>
      <span
        style={{
          fontFamily: "var(--font-body), 'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: aiSize,
          color: "#10B981",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
        }}
      >
        ai
      </span>
    </div>
  );
}
