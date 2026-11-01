import type { Metadata } from "next";

/* Share previews stay neutral everywhere (Reddit, X, iMessage, WhatsApp): no adult wording, one brand image.
   Pages that may be shared and found build their tags with share(). */
export const SHARE = { title: "ByRequest · Custom content, made on request", description: "Post a request, a verified creator makes it, and it is delivered privately. Secure checkout, ID-verified adults, no public feed." };

/* The one share image: 1200 x 630, logo and a neutral line, no photos. */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "ByRequest: custom content made on request, delivered privately" };

export function share(o: { title: string; description: string; path: string; index?: boolean }): Metadata {
  return {
    title: o.title, description: o.description,
    alternates: { canonical: o.path },
    robots: o.index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "website", siteName: "ByRequest", title: o.title, description: o.description, url: o.path, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [OG_IMAGE.url] },
  };
}
