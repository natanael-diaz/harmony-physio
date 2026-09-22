import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Harmony Physio",
    template: "%s | Harmony Physio",
  },
  description:
    "Harmony Physiotherapy Clinic — specialist physiotherapy services in the UK. Book appointments, access your records, and connect with your clinician.",
  metadataBase: new URL(
    process.env.AUTH_URL ?? "https://app.harmonyphysio.co.uk"
  ),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Harmony Physio",
  },
  robots: {
    index: false, // Patient portal — do not index
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
