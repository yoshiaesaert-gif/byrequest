/* Replying to one message. The quote travels inside the message text itself (so it stays end to end encrypted):
   an invisible marker, the id of the message, who wrote it and a short snippet, then the answer. */
const M = "⁣";
export type Quote = { id: string; who: string; text: string };
export function withReply(text: string, q: Quote | null) {
  if (!q) return text;
  const clean = (s: string) => s.replace(new RegExp(M, "g"), "").replace(/\s+/g, " ").trim();
  return `${M}R:${q.id}${M}${clean(q.who).slice(0, 40)}${M}${clean(q.text).slice(0, 140)}${M}${text}`;
}
export function splitReply(raw: string | null | undefined): { quote: Quote | null; text: string } {
  if (!raw || !raw.startsWith(M + "R:")) return { quote: null, text: raw ?? "" };
  const p = raw.split(M);   // ["", "R:id", who, snippet, text...]
  if (p.length < 5) return { quote: null, text: raw.replace(new RegExp(M, "g"), "") };
  return { quote: { id: p[1].slice(2), who: p[2], text: p[3] }, text: p.slice(4).join("") };
}

/* A reaction is a tiny encrypted message too: the marker, the id of the message it reacts to and one emoji.
   An empty emoji takes the reaction away. Each person keeps at most one reaction per message; the latest wins. */
export const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
export const withReaction = (id: string, emoji: string) => `${M}X:${id}${M}${emoji}`;
export function parseReaction(raw: string | null | undefined): { id: string; emoji: string } | null {
  if (!raw || !raw.startsWith(M + "X:")) return null;
  const p = raw.split(M);   // ["", "X:id", emoji]
  return p.length >= 3 ? { id: p[1].slice(2), emoji: p[2] } : null;
}
