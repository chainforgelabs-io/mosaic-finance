"use client";

import { useEffect, useState } from "react";

type Size = "sm" | "md" | "lg";

const sizeConfig: Record<Size, { dim: number; stroke: number; fontSize: string }> = {
  sm: { dim: 80, stroke: 6, fontSize: "text-xl" },
  md: { dim: 120, stroke: 8, fontSize: "text-3xl" },
  lg: { dim: 180, stroke: 10, fontSize: "text-5xl" },
};

function getScoreColor(score: number) {
  if (score < 50) return "var(--error)";
  if (score < 70) return "var(--warning)";
  return "var(--emerald)";
}

export function HealthScore({ score, size = "md" }: { score: number; size?: Size }) {
  const [displayScore, setDisplayScore] = useState(0);
  const config = sizeConfig[size];
  const radius = (config.dim - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;
  const color = getScoreColor(score);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      start = Math.round(eased * score);
      setDisplayScore(start);
      if (t < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: config.dim, height: config.dim }}>
      <svg width={config.dim} height={config.dim} className="-rotate-90">
        <circle
          cx={config.dim / 2}
          cy={config.dim / 2}
          r={radius}
          fill="none"
          stroke="var(--warm-200)"
          strokeWidth={config.stroke}
        />
        <circle
          cx={config.dim / 2}
          cy={config.dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <span
        className={`absolute font-[family-name:var(--font-display)] font-bold ${config.fontSize} tabular-nums`}
        style={{ color }}
      >
        {displayScore}
      </span>
    </div>
  );
}
