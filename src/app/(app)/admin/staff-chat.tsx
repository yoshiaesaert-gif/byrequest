"use client";
import ChatPane, { type PaneState } from "@/components/chat-pane";
import { teamOfferSend, teamSend } from "./actions";

/* The back office writes as the team profile; the creator sees an ordinary chat and sees "typing…". */
export default function StaffChat({ kind, id, creatorId, creator, as, avatar, initial }: { kind: "deal" | "offer"; id: string; creatorId: string; creator: string; as: string; avatar: React.ReactNode; initial: PaneState }) {
  const send = async (text: string) => {
    const r = kind === "offer" ? await teamOfferSend(id, text) : await teamSend(id, text);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  };
  const typing = () => { fetch("/api/chat/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }), keepalive: true }).catch(() => {}); };
  return <ChatPane variant="inline" endpoint={`/api/chat/team/thread?kind=${kind}&id=${id}`} meId="" name={creator} avatar={avatar} initial={initial} e2e={false} send={send} onTyping={typing}
    lock={`You write as ${as}`} placeholder={`Write as ${as}`} empty="No messages yet. Write the first one." />;
}
