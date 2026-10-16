import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
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
  title: { default: "Dalo · Org event attendance", template: "%s · Dalo" },
  description:
    "Event registration, QR tickets, scan-in/scan-out attendance, reports and e-certificates for student organizations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-stone-200 py-6 text-center text-xs text-stone-500">
          Dalo · attendance you can trust
        </footer>
      </body>
    </html>
  );
}
