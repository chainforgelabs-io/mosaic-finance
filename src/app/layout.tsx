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
  title: "Mosaic Finance — Your money, in one weekly score",
  description:
    "Log weekly. Snapshot monthly. Your Financial Health Score shows the direction. Free tracking for Canadians. Educational information, not financial advice.",
  alternates: {
    canonical: appUrl,
  },
  openGraph: {
    title: "Mosaic Finance — Your money, in one weekly score",
    description:
      "Log weekly. Snapshot monthly. Your Financial Health Score shows the direction. Educational information, not financial advice.",
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
    title: "Mosaic Finance — Your money, in one weekly score",
    description:
      "Log weekly. Snapshot monthly. Your Financial Health Score shows the direction. Educational information, not financial advice.",
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
