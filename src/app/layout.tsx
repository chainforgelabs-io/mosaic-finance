import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10B981",
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Mosaic Finance — Know every week whether your money is moving the right direction",
  description:
    "Log spending weekly, snapshot net worth monthly, and watch your Financial Health Score move. Free tracking for Canadians, with Charlie, your AI money guide, and educational Progress Reports on Progress. Educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.",
  alternates: {
    canonical: appUrl,
  },
  openGraph: {
    title: "Mosaic Finance — Know every week whether your money is moving the right direction",
    description:
      "Log weekly, snapshot monthly, and see your Financial Health Score move. Free tracking for Canadians. Charlie is your AI money guide. Educational information, not financial advice.",
    url: appUrl,
    siteName: "Mosaic Finance",
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "/logos/MosaicEmblemLogo.png",
        alt: "Mosaic Finance",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Mosaic Finance — Know every week whether your money is moving the right direction",
    description:
      "Log weekly, snapshot monthly, and see your Financial Health Score move. Free tracking for Canadians. Charlie is your AI money guide. Educational information, not financial advice.",
    images: ["/logos/MosaicEmblemLogo.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/logos/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logos/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/logos/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${dmSans.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
