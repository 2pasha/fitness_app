import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ECEEF3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "Spotter",
  title: "Spotter · Hevy AI Training Companion",
  description:
    "Syncs with Hevy API, tracks progressive overload & e1RM trends, and generates today's workout routine with Google Gemini.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Spotter",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-[#ECEEF3] font-sans text-[#0B0D17] antialiased selection:bg-[#2E3BFF]/20">
        <I18nProvider>
          <PwaRegister />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
