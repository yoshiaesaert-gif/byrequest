"use client";
import { useTransition } from "react";
import { testInbox } from "./actions";
import { toast } from "@/components/chrome";

/* Fills the signed in staff account with sample chats and notifications, to try the message centre. */
export default function TestInbox() {
  const [pending, start] = useTransition();
  return <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => {
    const r = await testInbox();
    toast(r.ok ? `${r.data} test chats and 6 notifications added. Open your inbox.` : r.error, r.ok ? "ok" : "err");
  })}>{pending ? "Adding…" : "Fill my inbox with test messages"}</button>;
}
