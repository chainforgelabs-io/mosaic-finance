"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface HealthScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { dimension: 80, strokeWidth: 6, fontSize: "text-lg" },
  md: { dimension: 120, strokeWidth: 8, fontSize: "text-3xl" },
  lg: { dimension: 180, strokeWidth: 10, fontSize: "text-5xl" },
} as const;

function getScoreColor(score: number): string {
  if (score < 50) return "var(--error)";
  if (score < 70) return "var(--warning)";
  if (score < 85) return "var(--emerald)";
  return "#059669";
}

export function HealthScore({ score, size = "md", className }: HealthScoreProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const shownRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const { dimension, strokeWidth, fontSize } = sizeMap[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Tween from whatever is currently shown to `target`. Re-used for the first
  // reveal and for later prop changes (e.g. the live score replacing the report score).
  const animateTo = useCallback((target: number) => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    const from = shownRef.current;
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      // rAF timestamps are frame-start times and can precede `startTime`;
      // clamp so the ease never runs negative and flashes a negative score.
      const elapsed = Math.max(0, currentTime - startTime);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setDisplayScore(next);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      else frameRef.current = null;
    }

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          animateTo(score);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [score, hasAnimated, animateTo]);

  // The score prop can change after the first reveal (plan score -> live score).
  useEffect(() => {
    if (!hasAnimated) return;
    if (shownRef.current === score && frameRef.current == null) return;
    animateTo(score);
  }, [score, hasAnimated, animateTo]);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: dimension, height: dimension }}
    >
      <svg
        width={dimension}
        height={dimension}
        className="-rotate-90"
      >
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="var(--warm-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 100ms ease-out" }}
        />
      </svg>
      <span
        className={cn(
          "absolute font-display font-bold tabular-nums",
          fontSize,
        )}
        style={{ color }}
      >
        {displayScore}
      </span>
    </div>
  );
}
