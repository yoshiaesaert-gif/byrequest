"use client";
import Link from "next/link";
import ChatPane from "@/components/chat-pane";
import { useT } from "@/i18n/client";

const EMPTY = { v: "", status: null, typing: false, otherKey: null, closed: false, msgs: [] };

/* The buyer's questions about this application, and your answers. Shown once the buyer wrote. */
export default function OfferTalk({ offerId, uid, name, house, avatar, previewAsked }: { offerId: string; uid: string; name: string; house: boolean; avatar: React.ReactNode; previewAsked: boolean }) {
  const t = useT();
  return (<section id="talk" className="talk-wrap">
    <h3 className="talk-h">{t("Questions from the buyer")}</h3>
    <ChatPane variant="inline" endpoint={`/api/chat/offer/${offerId}`} meId={uid} name={name} avatar={avatar} initial={EMPTY} e2e={!house} hideWhenEmpty
      lock={house ? t("Private chat") : t("End to end encrypted")}
      actions={previewAsked ? <Link href="/studio#previews" className="cx-chip">{t("{name} asked for a preview: share photos", { name })}</Link> : undefined} />
  </section>);
}
