import Link from "next/link";
import { requireUser } from "@/server/auth";

export default async function StaffOnly() {
  const u = await requireUser();
  return (<div className="wrap"><div className="bo-deny">
    <img src="/icon.png" alt="" width={56} height={56} />
    <h1 className="t-h1">The back office is for the ByRequest team</h1>
    <p className="muted">You are signed in as <b>{u.handle}</b>, and this account has no team role yet. An admin can add it under Back office, Team.</p>
    <Link href="/" className="btn btn-secondary">Back to home</Link>
  </div></div>);
}
