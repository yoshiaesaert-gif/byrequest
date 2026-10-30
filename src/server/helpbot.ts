import "server-only";
import { HELP } from "@/content/help";

/* The help assistant: answers from the help centre, and files a problem with the team when it cannot fix it. Needs ANTHROPIC_API_KEY; without it the app falls back to filing the message directly. */
export const botReady = () => !!process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.HELP_BOT_MODEL || "claude-haiku-5-5";

const knowledge = HELP.map((c) => `## ${c.title[1]}\n` + c.items.map((x) => `Q: ${x.q[1]}\nA: ${x.a[1]}${x.href ? ` (page: ${x.href})` : ""}`).join("\n")).join("\n\n");

const SYSTEM = `You are the ByRequest help assistant, available 24/7. ByRequest is a marketplace where verified adults order personal content from verified creators. Be warm, brief (2 to 4 short sentences) and concrete. Answer in the language the person writes in.
Rules:
- Use only the help centre below and what the person tells you. If you do not know, say so and offer to pass it to the team.
- For a technical problem you cannot solve with a clear answer (upload fails, page broken, something does not save, cannot sign in), ask at most one short clarifying question, then call file_problem with a short factual summary. Do not call it for general questions.
- Never promise refunds, payouts, bans or decisions. The team decides, and you can say you passed it on.
- Safety concerns (minors, coercion, trafficking, non consensual content, threats) are not for you: tell the person to use Report in the footer (/report) right away.
- Never ask for passwords, codes, ID documents or payment details. Do not give legal or medical advice.
- You may mention a page path from the help centre, such as /help or /settings.

HELP CENTRE
${knowledge}`;

export type Turn = { role: "user" | "assistant"; content: string };

export async function ask(turns: Turn[]): Promise<{ text: string; file?: string }> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 400,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: [{ name: "file_problem", description: "Send a technical problem to the ByRequest team, who will look at it right away.", input_schema: { type: "object", properties: { summary: { type: "string", description: "What the person tried and what went wrong, in English, max 300 characters." } }, required: ["summary"] } }],
      messages: turns,
    }),
  });
  if (!r.ok) throw new Error(`bot ${r.status}`);
  const j = (await r.json()) as { content: ({ type: "text"; text: string } | { type: "tool_use"; name: string; input: { summary?: string } })[] };
  const text = j.content.filter((c): c is { type: "text"; text: string } => c.type === "text").map((c) => c.text).join("\n").trim();
  const tool = j.content.find((c) => c.type === "tool_use" && c.name === "file_problem") as { input: { summary?: string } } | undefined;
  return { text, file: tool ? String(tool.input.summary ?? "").slice(0, 400) : undefined };
}
