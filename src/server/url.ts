/* Public base URL for links that leave the server (provider redirects, participant links), and the
   internal URL the server uses to call itself (test provider webhooks, the release worker). */
export const appUrl = () => process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");
export const internalUrl = () => process.env.INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
