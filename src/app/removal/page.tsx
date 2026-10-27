import { fileRemoval } from "@/server/participants";
import { redirect } from "next/navigation";

/* Anyone who appears in content can ask for removal, with or without an account. */
export default async function Removal({ searchParams }: { searchParams: Promise<{ sent?: string; e?: string }> }) {
  const sp = await searchParams;
  return (<div className="sbx" style={{ background: "var(--paper)" }}><form className="card" style={{ width: "min(560px,100%)" }} action={async (f) => {
    "use server";
    try { await fileRemoval(String(f.get("contact") ?? ""), String(f.get("reference") ?? ""), String(f.get("description") ?? "")); }
    catch { redirect("/removal?e=1"); }
    redirect("/removal?sent=1");
  }}>
    <img src="/logo.png" alt="byrequest" style={{ height: 40, alignSelf: "flex-start" }} />
    <h1 className="t-h2">Request removal</h1>
    {sp.sent ? <p>Thank you. A person reviews every request. Content is hidden while we look into it, and we reply through the contact you gave.</p> : (<>
      <p className="t-sm muted">If you appear in content on ByRequest without your consent, or you want to withdraw consent, tell us here. You do not need an account.</p>
      {sp.e ? <p className="formerr">Add a way to reach you and a short description.</p> : null}
      <div className="field"><label htmlFor="c">How can we reach you?</label><input id="c" name="contact" className="input" placeholder="Email or phone" required /></div>
      <div className="field"><label htmlFor="r">Which content, if you know</label><input id="r" name="reference" className="input" placeholder="A link, a creator username or a date" /></div>
      <div className="field"><label htmlFor="d">What happened</label><textarea id="d" name="description" className="input" rows={4} style={{ height: "auto", padding: 14 }} required /></div>
      <button className="btn btn-primary btn-lg">Send request</button>
      <p className="t-xs muted">Your contact details are stored encrypted and used only for this request.</p></>)}
  </form></div>);
}
