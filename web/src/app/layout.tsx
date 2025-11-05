import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";

import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shujia",
  description:
    "Track manga, manhwa, and manhua releases powered by the MangaDex API.",
  metadataBase: new URL("https://shujia.local"),
  openGraph: {
    title: "Shujia",
    description:
      "Discover, follow, and organize series in one place.",
    url: "https://shujia.local",
    siteName: "Shujia",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shujia",
    description:
      "Discover, follow, and organize series in one place.",
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
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-surface text-surface-foreground antialiased`}
      >
        <div className="sticky top-0 z-50">
          <AnnouncementBar />
          <SiteHeader />
        </div>

        <div className="flex flex-1 flex-col">{children}</div>

        <Analytics />
      </body>
    </html>
  );
}

