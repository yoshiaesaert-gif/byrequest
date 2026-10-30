import type { MetadataRoute } from "next";

/* Makes ByRequest installable: its own icon on the home screen, full screen without the browser bar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ByRequest", short_name: "ByRequest", id: "/", start_url: "/?source=app", scope: "/",
    display: "standalone", orientation: "portrait", background_color: "#F7F7F4", theme_color: "#F7F7F4",
    description: "Personal content made to order, between adults. Discreet by design.",
    icons: [
      { src: "/app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
