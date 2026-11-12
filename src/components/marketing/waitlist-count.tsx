"use client";

import { useEffect, useState } from "react";

export function WaitlistCount({ className }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/waitlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: unknown } | null) => {
        if (cancelled) return;
        const n = typeof data?.count === "number" ? data.count : null;
        if (n != null && n > 0) setCount(n);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (count == null) return null;
  const label = count === 1 ? "1 person on the list" : `${count.toLocaleString("en-CA")} people on the list`;
  return <p className={className}>{label}</p>;
}
