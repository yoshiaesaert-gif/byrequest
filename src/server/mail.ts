import "server-only";

/* Transactional mail. Uses Resend (https://resend.com) when RESEND_API_KEY is set, with a neutral
   sender so nothing in an inbox or on a lock screen gives ByRequest away. MAIL_FROM must be an address
   on a domain verified at Resend, for example "Notes <code@byrequest.me>". */
/* Mail for everyone once the sending domain is verified. Until then MAIL_STAFF_ONLY=1 keeps mail
   for staff accounts only (the sender can reach the owner's own address). */
export const mailReady = () => !!process.env.RESEND_API_KEY && process.env.MAIL_STAFF_ONLY !== "1";
export const staffMailReady = () => !!process.env.RESEND_API_KEY;

const COPY = {
  nl: { subject: "Je code: {code}", title: "Je inlogcode", intro: "Vul deze code in op ByRequest om verder te gaan.", valid: "Geldig voor 10 minuten.", ignore: "Heb je niets gevraagd? Dan mag je deze mail negeren. Deel deze code nooit met iemand: ByRequest zal er nooit naar vragen.", rights: "Alle rechten voorbehouden." },
  en: { subject: "Your code: {code}", title: "Your sign in code", intro: "Enter this code on ByRequest to continue.", valid: "Valid for 10 minutes.", ignore: "Did not ask for it? You can ignore this email. Never share this code with anyone: ByRequest will never ask for it.", rights: "All rights reserved." },
  fr: { subject: "Ton code : {code}", title: "Ton code de connexion", intro: "Saisis ce code sur ByRequest pour continuer.", valid: "Valable 10 minutes.", ignore: "Tu n'as rien demandé ? Tu peux ignorer cet e-mail. Ne partage jamais ce code : ByRequest ne te le demandera jamais.", rights: "Tous droits réservés." },
} as const;

const SITE = process.env.SITE_URL || "https://byrequest.me";

/* A small, table based layout that renders the same in Gmail, Outlook and Apple Mail. */
function codeMail(c: (typeof COPY)[keyof typeof COPY], code: string) {
  const year = new Date().getFullYear();
  const digits = code.split("").map((d) => `<td style="width:46px;height:58px;border-radius:12px;background:#F2F1FA;font:700 28px/58px -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0E1013;text-align:center">${d}</td><td style="width:8px"></td>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${c.title}</title></head>
<body style="margin:0;padding:0;background:#F4F4F1">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${code} · ${c.valid}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F1"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;box-shadow:0 1px 0 #E4E4DE">
<tr><td style="padding:36px 40px 8px"><img src="${SITE}/logo.png" alt="byrequest" height="34" style="display:block;height:34px;border:0"></td></tr>
<tr><td style="padding:20px 40px 0;font:800 24px/1.25 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0E1013;letter-spacing:-.4px">${c.title}</td></tr>
<tr><td style="padding:8px 40px 0;font:400 15px/1.55 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3B3F46">${c.intro}</td></tr>
<tr><td style="padding:24px 40px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table></td></tr>
<tr><td style="padding:14px 40px 0;font:600 13px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#4434E6">${c.valid}</td></tr>
<tr><td style="padding:28px 40px 36px"><div style="border-top:1px solid #ECECE6;padding-top:20px;font:400 13px/1.55 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#6B7079">${c.ignore}</div></td></tr>
</table>
<p style="margin:20px 0 0;font:400 12px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#9A9EA6">© ${year} ByRequest LLC · ${c.rights}</p>
</td></tr></table></body></html>`;
}

export async function sendLoginCode(to: string, code: string, locale: string) {
  const c = COPY[(locale in COPY ? locale : "en") as keyof typeof COPY];
  const text = `${c.title}: ${code}\n\n${c.intro} ${c.valid}\n\n${c.ignore}`;
  const html = codeMail(c, code);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(8000),
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "Notes <code@byrequest.me>", to: [to], subject: c.subject.replace("{code}", code), text, html }),
  });
  if (!r.ok) throw new Error(`mail ${r.status}`);
}
