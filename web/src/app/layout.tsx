import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MynkDB | Manga & Webtoon Tracker",
  description:
    "Track manga, manhwa, and manhua releases powered by the MangaDex API.",
  metadataBase: new URL("https://mynkdb.local"),
  openGraph: {
    title: "MynkDB | Manga & Webtoon Tracker",
    description:
      "Discover, follow, and organize series from MangaDex in one place.",
    url: "https://mynkdb.local",
    siteName: "MynkDB",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MynkDB | Manga & Webtoon Tracker",
    description:
      "Discover, follow, and organize series from MangaDex in one place.",
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
        className={`${geistSans.variable} ${geistMono.variable} bg-surface text-surface-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
