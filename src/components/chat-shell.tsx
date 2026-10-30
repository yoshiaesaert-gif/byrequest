import Link from "next/link";

/* The one page layout for every conversation: the chat on the left, everything you can do next on the
   right. On a phone the chat is a card that opens full screen, with the same cards below it. */
export function ChatShell({ back, backLabel, eyebrow, title, chat, side }: { back: string; backLabel: string; eyebrow?: string; title: string; avatar?: React.ReactNode; chat: React.ReactNode; side: React.ReactNode }) {
  return (<div className="wrap sh">
    <Link href={back} className="back"><svg className="ico sm" aria-hidden="true"><use href="#i-left" /></svg>{backLabel}</Link>
    <header className="sh-head"><div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1 className="t-h1">{title}</h1></div></header>
    <div className="sh-grid">
      <div className="sh-main">{chat}</div>
      <aside className="sh-side">{side}</aside>
    </div>
  </div>);
}

export function SideCard({ title, tone, children }: { title?: string; tone?: "violet" | "green"; children: React.ReactNode }) {
  return <section className={"card sh-card" + (tone ? " is-" + tone : "")}>{title ? <h2 className="sh-ct">{title}</h2> : null}{children}</section>;
}

/* Shown while the right column loads, so the chat can open at once. */
export function SideSkeleton() {
  return <section className="card sh-card sh-skel-card" aria-hidden="true"><i className="w60" /><i /><i className="w80" /><i className="w40" /></section>;
}

/* Whole page placeholder shown the instant a conversation is clicked. */
export function ShellLoading() {
  return (<div className="wrap sh" aria-busy="true">
    <span className="sk sk-l" style={{ width: 90 }} />
    <header className="sh-head"><span className="sh-av sk" /><div><span className="sk sk-l" /><span className="sk sk-xl" /></div></header>
    <div className="sh-grid">
      <div className="sh-main"><div className="cx cx-skel" aria-hidden="true">{[62, 44, 70, 38, 55].map((w, i) => <span key={i} className={"sk sk-msg" + (i % 2 ? " r" : "")} style={{ width: `${w}%` }} />)}</div></div>
      <aside className="sh-side"><SideSkeleton /><SideSkeleton /></aside>
    </div>
  </div>);
}
