"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export function ChartFrame({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function loadChart<P extends object>(
  loader: () => Promise<ComponentType<P>>,
  frameClassName: string,
) {
  return dynamic(loader, {
    loading: () => <ChartFrame className={frameClassName} />,
  });
}
