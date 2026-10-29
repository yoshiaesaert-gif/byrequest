/* Shown the moment a chat is opened, while the conversation loads. */
export default function Loading() {
  return (<div className="wrap" aria-busy="true">
    <div className="sk-head"><span className="sk sk-av" /><div><span className="sk sk-l" /><span className="sk sk-xl" /></div></div>
    <div className="two"><div className="card chatbox sk-chat">{[62, 44, 70, 38, 55].map((w, i) => <span key={i} className={"sk sk-msg" + (i % 2 ? " r" : "")} style={{ width: `${w}%` }} />)}</div><div className="card sk-side"><span className="sk sk-img" /><span className="sk sk-l" /><span className="sk sk-l" /></div></div>
  </div>);
}
