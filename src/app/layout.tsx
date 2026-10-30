import type { Metadata, Viewport } from "next";
import { SPRITE } from "@/components/sprite";
import { GeistSans } from "geist/font/sans";   // self hosted and preloaded: the first paint already has the final font, no jump
import "./globals.css";
import "./app.css";
import "./home.css";
import { getLocale } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import Tracker from "@/components/tracker";
import ConsentBanner from "@/components/consent-banner";
import AgeGate from "@/components/age-gate";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "ByRequest",
  description: "Personal content made to order, between adults. Discreet by design.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "ByRequest", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F6F6F3" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const jar = await cookies();
  const gate = !jar.get("brq_18") && !jar.get("brq_s");   // signed in members already confirmed their age
  return (
    <html lang={locale} className={GeistSans.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@85..100,400..700&display=swap" />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: SPRITE }} />
        <I18nProvider locale={locale}>{children}{gate ? <AgeGate /> : <ConsentBanner />}</I18nProvider>
        <Tracker />
      </body>
    </html>
  );
}
