import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import {
  THEME_COOKIE_NAME,
  THEME_DEFAULT,
  isThemeName,
} from "@/lib/theme/config";

import { Analytics } from "@vercel/analytics/next"

// Force dynamic rendering to ensure fresh session state on every request
export const dynamic = "force-dynamic";
export const revalidate = 0;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "shujia.dev",
    template: "%s | shujia.dev",
  },
  description:
    "Track manga, manhwa, and manhua releases powered by the MangaDex API.",
  metadataBase: new URL("https://shujia.dev"),
  openGraph: {
    title: "shujia.dev",
    description:
      "Discover, follow, and organize series in one place.",
    url: "https://shujia.dev",
    siteName: "shujia.dev",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "shujia.dev",
    description:
      "Discover, follow, and organize series in one place.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isThemeName(themeCookie) ? themeCookie : THEME_DEFAULT;

  return (
    <html lang="en" data-theme={theme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-surface text-surface-foreground antialiased`}
      >
        <AnnouncementBar />
        <SiteHeader />

        <div className="flex flex-1 flex-col">{children}</div>

        <Analytics />
      </body>
    </html>
  );
}

