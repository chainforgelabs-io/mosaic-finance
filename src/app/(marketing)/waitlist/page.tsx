import type { Metadata } from "next";
import { WaitlistPage } from "@/components/marketing/waitlist-page";

export const metadata: Metadata = {
  title: "Free guide + early access — Mosaic Finance",
  description:
    "Still guessing RRSP vs TFSA vs FHSA? Get a free decision framework plus early access to gamified financial tracking for Canadians.",
};

export default function WaitlistRoute() {
  return <WaitlistPage />;
}
