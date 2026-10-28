import "server-only";

/* Transactional mail. Uses Resend (https://resend.com) when RESEND_API_KEY is set, with a neutral
   sender so nothing in an inbox or on a lock screen gives ByRequest away. MAIL_FROM must be an address
   on a domain verified at Resend, for example "Notes <code@byrequest.me>". */
export const mailReady = () => !!process.env.RESEND_API_KEY;

const COPY = {
  nl: { subject: "Je code: {code}", body: "Je code is {code}. Hij werkt 10 minuten. Heb je niets gevraagd? Dan mag je deze mail negeren." },
  en: { subject: "Your code: {code}", body: "Your code is {code}. It works for 10 minutes. Did not ask for it? You can ignore this email." },
  fr: { subject: "Ton code : {code}", body: "Ton code est {code}. Il est valable 10 minutes. Tu n'as rien demandé ? Tu peux ignorer cet e-mail." },
} as const;

export async function sendLoginCode(to: string, code: string, locale: string) {
  const c = COPY[(locale in COPY ? locale : "en") as keyof typeof COPY];
  const text = c.body.replace("{code}", code);
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:16px;color:#111;line-height:1.5"><p>${text.replace(code, `<b style="font-size:28px;letter-spacing:4px">${code}</b><br>`)}</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(8000),
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "Notes <code@byrequest.me>", to: [to], subject: c.subject.replace("{code}", code), text, html }),
  });
  if (!r.ok) throw new Error(`mail ${r.status}`);
}
