"use client";
import ChatPane, { type PaneEvent, type PaneState } from "@/components/chat-pane";

/* The back office writes as the team profile; the creator sees an ordinary chat and sees "typing…". */
export default function StaffChat({ kind, id, creatorId, creator, as, avatar, initial, actions, events }: { events?: PaneEvent[]; actions?: React.ReactNode; kind: "deal" | "offer"; id: string; creatorId: string; creator: string; as: string; avatar: React.ReactNode; initial: PaneState }) {
  // A light request instead of a page refresh, so a message is on its way within a moment.
  const send = async (text: string) => {
    try { return await (await fetch("/api/chat/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, text }) })).json() as { ok: boolean; error?: string }; }
    catch { return { ok: false, error: "Check your connection." }; }
  };
  const typing = () => { fetch("/api/chat/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }), keepalive: true }).catch(() => {}); };
  return <ChatPane endpoint={`/api/chat/team/thread?kind=${kind}&id=${id}`} meId="" name={creator} avatar={avatar} initial={initial} e2e={false} send={send} onTyping={typing}
    lock={`You write as ${as}`} placeholder={`Write as ${as}`} empty="No messages yet. Write the first one." actions={actions} events={events} />;
}
