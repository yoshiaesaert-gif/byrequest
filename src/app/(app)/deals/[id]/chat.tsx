"use client";
import { useRouter } from "next/navigation";
import ChatPane, { EMPTY_PANE } from "@/components/chat-pane";
import { useT } from "@/i18n/client";

/* The chat looks for contact details and outside payments only on the sender's device, before sending, and only warns. */
const RISKY = [/\b(?:\+?\d[\d\s().-]{7,}\d)\b/, /[\w.+-]+@[\w-]+\.[\w.]{2,}/, /\b(?:whats\s?app|telegram|signal|snap(?:chat)?|insta(?:gram)?|onlyfans|tiktok|paypal|tikkie|payconiq|revolut|iban|bitcoin|crypto)\b/i, /\b(?:meet|meeting|in person|irl|hotel|my place|your place|afspreken|ontmoeten|langskomen)\b/i];

export default function DealChat({ dealId, meId, name, avatar, house, status, held, fromInbox, closed }: { dealId: string; meId: string; name: string; avatar: React.ReactNode; house: boolean; status: string; held: boolean; fromInbox: boolean; closed: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  return <ChatPane endpoint={`/api/chat/deal/${dealId}`} meId={meId} name={name} avatar={avatar} initial={{ ...EMPTY_PANE, status }} e2e={!house} fromInbox={fromInbox}
    lock={house ? t("Private chat") : t("End to end encrypted")} guards={RISKY} onStatus={() => router.refresh()}
    intro={t("Only you and {name} can read this chat. Paying outside ByRequest, sharing contact details and meeting in person are not allowed.", { name })}
    empty={held ? t("No messages yet. Agree on the details with {name} here.", { name }) : undefined} closedNode={closed} />;
}
