import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { Cover, I } from "@/components/ui";
import SignInForm from "./form";

export default async function SignIn() {
  if (await currentUser()) redirect("/");
  const demo = process.env.DEV_SHOW_CODE === "1";
  return (
    <div className="auth">
      <section className="auth-visual media">
        <Cover cover="c20" />
        <span className="wordmark"><img src="/logo_white.png" alt="byrequest" style={{ height: 52 }} /></span>
        <div className="fan" aria-hidden="true">
          {[["fc1", "c07", "Photo set", "Post workout photo set", "€36"], ["fc2", "c05", "Video · 10 min", "Shower video, calm and natural", "€80"], ["fc3", "c17", "Voice note", "Good night voice note", "€20"]].map(([k, c, b, t, p]) => (
            <div key={k} className={`fc ${k} media`}><Cover cover={c} /><span className="badge glass">{b}</span><div><div className="t">{t}</div><div className="p num">{p}</div></div></div>
          ))}
        </div>
        <div><h1>Someone asks. You choose. Deal.</h1><p>Personal content made to order, between adults. Payment, chat and delivery in one private place.</p></div>
      </section>
      <section className="auth-form">
        <SignInForm demo={demo} />
        <div className="trustrow"><span><I n="shield" c="sm" />Adults only, ID checked</span><span><I n="lock" c="sm" />Encrypted chat</span><span><I n="eyeoff" c="sm" />No nudity in feeds</span><span><I n="lock" c="sm" />Private vault</span></div>
      </section>
    </div>
  );
}
