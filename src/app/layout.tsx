import { OG_IMAGE, SHARE } from "@/config/share";
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
  metadataBase: new URL(process.env.SITE_URL || "https://byrequest.me"),
  title: "ByRequest",
  description: SHARE.description,
  robots: { index: false, follow: false },
  openGraph: { type: "website", siteName: "ByRequest", title: SHARE.title, description: SHARE.description, locale: "en_GB", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: SHARE.title, description: SHARE.description, images: [OG_IMAGE.url] },
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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wdth,wght@85..100,400..700&display=swap" />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: SPRITE }} />
        <I18nProvider locale={locale}>{children}{gate ? <AgeGate /> : <ConsentBanner />}</I18nProvider>
        <Tracker />
      </body>
    </html>
  );
}
