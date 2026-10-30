import "server-only";
import { createHmac } from "crypto";

/* The look of every automatic email: a soft gradient band with the logo, one clear headline, one big
   number when there is one, a single button, and a quiet footer with a one tap unsubscribe. Table
   based so it renders the same in Gmail, Outlook and Apple Mail. Nothing explicit, ever: subjects and
   preview lines read neutral on a lock screen. */
export const SITE = process.env.SITE_URL || "https://byrequest.me";
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export type Theme = "warm" | "violet" | "mint" | "ink";
const BAND: Record<Theme, string> = {
  warm: "linear-gradient(135deg,#FFE7A3 0%,#FFC8DD 55%,#C9B8FF 100%)",
  violet: "linear-gradient(135deg,#6E5BFF 0%,#3B2BD6 60%,#1E1660 100%)",
  mint: "linear-gradient(135deg,#C8F5DD 0%,#B9E6FF 100%)",
  ink: "linear-gradient(135deg,#2A2D35 0%,#0E1013 100%)",
};
const BAND_SOLID: Record<Theme, string> = { warm: "#FFD6C2", violet: "#4434E6", mint: "#C8F0E6", ink: "#1A1C20" };
const LIGHT_LOGO: Record<Theme, boolean> = { warm: false, violet: true, mint: false, ink: true };

export type Mail = {
  lang: string; theme: Theme; preheader: string; kicker: string; title: string; intro: string;
  big?: { value: string; label: string; note?: string };
  rows?: [string, string][];
  code?: string;
  cta: { label: string; href: string };
  after?: string;
  footer: { why: string; unsub: string; rights: string; unsubUrl: string };
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function render(m: Mail) {
  const year = new Date().getFullYear();
  const light = LIGHT_LOGO[m.theme];
  const head = light ? "#FFFFFF" : "#1A1030";
  const sub = light ? "rgba(255,255,255,.82)" : "#4A3360";
  const rows = (m.rows ?? []).map(([a, b]) => `<tr><td style="padding:12px 0;border-top:1px solid #EEEDF3;font:400 14px/1.4 ${FONT};color:#3B3F46">${esc(a)}</td><td align="right" style="padding:12px 0;border-top:1px solid #EEEDF3;font:700 14px/1.4 ${FONT};color:#0E1013;white-space:nowrap">${esc(b)}</td></tr>`).join("");
  return `<!doctype html><html lang="${m.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(m.title)}</title></head>
<body style="margin:0;padding:0;background:#F4F3EF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:24px;overflow:hidden">
<tr><td style="background:${BAND_SOLID[m.theme]};background-image:${BAND[m.theme]};padding:30px 36px 34px">
  <img src="${SITE}/${light ? "logo_white.png" : "logo.png"}" alt="byrequest" height="30" style="display:block;height:30px;border:0">
  <div style="margin-top:26px;font:800 12px/1.2 ${FONT};letter-spacing:2px;text-transform:uppercase;color:${sub}">${esc(m.kicker)}</div>
  <div style="margin-top:10px;font:800 30px/1.12 ${FONT};letter-spacing:-.8px;color:${head}">${esc(m.title)}</div>
</td></tr>
<tr><td style="padding:28px 36px 0;font:400 16px/1.6 ${FONT};color:#3B3F46">${esc(m.intro)}</td></tr>
${m.big ? `<tr><td style="padding:22px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3FF;border-radius:18px"><tr><td style="padding:22px 24px">
  <div style="font:800 46px/1 ${FONT};letter-spacing:-1.5px;color:#0E1013">${esc(m.big.value)}</div>
  <div style="margin-top:8px;font:600 15px/1.4 ${FONT};color:#3B2BD6">${esc(m.big.label)}</div>
  ${m.big.note ? `<div style="margin-top:6px;font:400 13px/1.5 ${FONT};color:#6B7079">${esc(m.big.note)}</div>` : ""}
</td></tr></table></td></tr>` : ""}
${rows ? `<tr><td style="padding:16px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>` : ""}
${m.code ? `<tr><td style="padding:20px 36px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding:12px 20px;border-radius:12px;border:1.5px dashed #C9B8FF;font:800 22px/1 'SF Mono',Menlo,Consolas,monospace;letter-spacing:3px;color:#0E1013">${esc(m.code)}</td></tr></table></td></tr>` : ""}
<tr><td style="padding:26px 36px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#0E0D17"><a href="${m.cta.href}" style="display:inline-block;padding:15px 28px;font:700 15px/1 ${FONT};color:#FFFFFF;text-decoration:none;border-radius:999px">${esc(m.cta.label)} &rarr;</a></td></tr></table></td></tr>
${m.after ? `<tr><td style="padding:18px 36px 0;font:400 14px/1.6 ${FONT};color:#6B7079">${esc(m.after)}</td></tr>` : ""}
<tr><td style="padding:30px 36px 32px"><div style="border-top:1px solid #EEEDF3;padding-top:18px;font:400 12px/1.6 ${FONT};color:#9A9EA6">${esc(m.footer.why)} <a href="${m.footer.unsubUrl}" style="color:#6B7079;text-decoration:underline">${esc(m.footer.unsub)}</a></div></td></tr>
</table>
<p style="margin:18px 0 0;font:400 12px/1.5 ${FONT};color:#9A9EA6">© ${year} That&#39;s Amore IP, LLC · ${esc(m.footer.rights)}</p>
</td></tr></table></body></html>`;
}

export function plain(m: Mail) {
  return [m.title, "", m.intro, m.big ? `\n${m.big.value} · ${m.big.label}${m.big.note ? `\n${m.big.note}` : ""}` : "", ...(m.rows ?? []).map(([a, b]) => `${a}: ${b}`), m.code ? `\n${m.code}` : "", "", `${m.cta.label}: ${m.cta.href}`, m.after ?? "", "", `${m.footer.why} ${m.footer.unsub}: ${m.footer.unsubUrl}`].filter((x) => x !== undefined).join("\n");
}

/* One tap unsubscribe: a signed link, no login needed. */
const secret = () => process.env.SESSION_SECRET || "dev-secret";
export const unsubToken = (userId: string) => `${userId}.${createHmac("sha256", secret()).update("unsub:" + userId).digest("base64url").slice(0, 32)}`;
export function checkUnsub(token: string) {
  const [id, sig] = token.split(".");
  return id && sig && unsubToken(id) === token ? id : null;
}

export async function deliver(to: string, subject: string, m: Mail) {
  if (!process.env.RESEND_API_KEY) { console.log(`[mail] (not sent, no RESEND_API_KEY) to ${to}: ${subject}`); return "logged"; }
  const unsub = m.footer.unsubUrl.replace("/u/", "/api/unsub/");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "ByRequest <code@byrequest.me>", to: [to], subject, html: render(m), text: plain(m),
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
  });
  if (!r.ok) throw new Error(`mail ${r.status}`);
  return "sent";
}
