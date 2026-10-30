/* Every page in the app opens with this the instant you click, while the real page streams in. */
export default function Loading() {
  return (<div className="wrap" aria-busy="true">
    <div className="sk-head"><div><span className="sk sk-l" /><span className="sk sk-xl" /></div></div>
    <div className="sk-grid">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="sk sk-card" />)}</div>
  </div>);
}
