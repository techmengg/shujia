import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LayoutWithSidebar } from "@/components/layout/layout-with-sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getCurrentUser } from "@/lib/auth/session";
import {
  THEME_COOKIE_NAME,
  THEME_DEFAULT,
  isThemeName,
} from "@/lib/theme/config";

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
  title: {
    default: "shujia | Comics Directory",
    template: "%s | shujia",
  },
  description:
    "Track manga, manhwa, and manhua. Discover series, rate them, build your reading list, and follow other readers.",
  metadataBase: new URL("https://shujia.dev"),
  openGraph: {
    title: "shujia | Comics Directory",
    description:
      "Track manga, manhwa, and manhua. Discover series, rate them, and follow other readers.",
    url: "https://shujia.dev",
    siteName: "shujia",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "shujia | Comics Directory",
    description:
      "Track manga, manhwa, and manhua. Discover series, rate them, and follow other readers.",
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
  const user = await getCurrentUser();

  return (
    <html lang="en" data-theme={theme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-surface text-surface-foreground antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider serverAuth={Boolean(user)}>
          <AnnouncementBar />
          <SiteHeader />

          <LayoutWithSidebar sidebar={<RightSidebar />}>
            {children}
          </LayoutWithSidebar>

          <SiteFooter />

          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}

