"use client";
import ChatPane, { EMPTY_PANE } from "@/components/chat-pane";
import { useT } from "@/i18n/client";

/* The buyer talks to a candidate before choosing. */
export default function OfferChat({ offerId, meId, name, avatar, fromInbox, e2e = true }: { offerId: string; meId: string; name: string; avatar: React.ReactNode; fromInbox: boolean; e2e?: boolean }) {
  const t = useT();
  return <ChatPane endpoint={`/api/chat/offer/${offerId}`} meId={meId} name={name} avatar={avatar} initial={EMPTY_PANE} e2e={e2e} fromInbox={fromInbox}
    lock={e2e ? t("End to end encrypted") : t("Private chat")} intro={t("Ask what you want to know before you choose. Paying outside ByRequest, sharing contact details and meeting in person are not allowed.")}
    empty={t("No messages yet. Say hello to {name}.", { name })} />;
}
