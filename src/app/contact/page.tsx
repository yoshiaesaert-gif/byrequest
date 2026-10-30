import Link from "next/link";
import type { Metadata } from "next";
import ContactForm from "./form";

export const metadata: Metadata = { title: "Send us a message" };

/* One form for everything: questions, payments, partnerships. It lands in the back office and is answered in the app. */
export default function Contact() {
  return (<div className="hc">
    <header className="hc-top"><Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 30 }} /></Link><Link href="/help" className="btn btn-secondary btn-sm">Help centre</Link></header>
    <ContactForm />
  </div>);
}
