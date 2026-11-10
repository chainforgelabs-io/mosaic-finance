import type { Metadata } from "next";
import { WaitlistPage } from "@/components/marketing/waitlist-page";

export const metadata: Metadata = {
  title: "Smart tracker — Mosaic Finance",
  description:
    "An AI-powered cash flow and net worth tracker. Join the waitlist for early access and a free guide on RRSP, TFSA, and FHSA. Educational information, not financial advice.",
};

export default function WaitlistRoute() {
  return <WaitlistPage />;
}
