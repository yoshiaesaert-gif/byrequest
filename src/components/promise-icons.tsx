/* Custom two tone icons for the ByRequest promises. Violet for the object, mint for the "safe" accent. */
const V = "#7C6FFF", M = "#59E0A6", D = "#1B1840";

export function PromiseIcon({ name, size = 56 }: { name: "held" | "e2e" | "vault" | "adults" | "billing" | "fair"; size?: number }) {
  const s = { width: size, height: size };
  switch (name) {
    case "held": return (
      <svg viewBox="0 0 64 64" {...s} aria-hidden="true"><rect x="8" y="18" width="48" height="34" rx="9" fill={V} /><rect x="8" y="26" width="48" height="7" fill={D} opacity=".35" /><rect x="14" y="40" width="14" height="5" rx="2.5" fill="#fff" opacity=".85" />
        <circle cx="46" cy="16" r="11" fill={M} /><path d="M41 16.5l3.5 3.5 6.5-7" stroke={D} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>);
    case "e2e": return (
      <svg viewBox="0 0 64 64" {...s} aria-hidden="true"><path d="M8 14a8 8 0 018-8h22a8 8 0 018 8v12a8 8 0 01-8 8H24l-9 8v-8h1a8 8 0 01-8-8z" fill={V} /><path d="M18 20h20M18 26h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
        <rect x="34" y="34" width="24" height="22" rx="6" fill={M} /><path d="M40 34v-4a6 6 0 0112 0v4" stroke={M} strokeWidth="4" fill="none" /><circle cx="46" cy="44" r="3" fill={D} /><rect x="45" y="45" width="2" height="6" rx="1" fill={D} /></svg>);
    case "vault": return (
      <svg viewBox="0 0 64 64" {...s} aria-hidden="true"><rect x="6" y="8" width="52" height="46" rx="10" fill={V} /><rect x="6" y="50" width="52" height="6" rx="3" fill={D} opacity=".3" />
        <circle cx="32" cy="31" r="13" fill={D} opacity=".35" /><circle cx="32" cy="31" r="9" fill={M} /><path d="M32 22v4M32 36v4M23 31h4M37 31h4" stroke={D} strokeWidth="2.6" strokeLinecap="round" /><circle cx="32" cy="31" r="3" fill={D} /></svg>);
    case "adults": return (
      <svg viewBox="0 0 64 64" {...s} aria-hidden="true"><rect x="6" y="12" width="52" height="38" rx="9" fill={V} /><circle cx="22" cy="28" r="6" fill="#fff" opacity=".9" /><path d="M13 42c1.5-5.5 5-8 9-8s7.5 2.5 9 8" fill="#fff" opacity=".9" />
        <path d="M36 25h14M36 32h10" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" /><circle cx="50" cy="48" r="10" fill={M} /><text x="50" y="52" textAnchor="middle" fontFamily="Geist, sans-serif" fontWeight="800" fontSize="10" fill={D}>18+</text></svg>);
    case "billing": return (
      <svg viewBox="0 0 64 64" {...s} aria-hidden="true"><path d="M12 6h40v52l-6-4-6 4-6-4-6 4-6-4-6 4z" fill={V} /><path d="M20 18h24M20 26h16" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <rect x="18" y="34" width="28" height="10" rx="3" fill={M} /><text x="32" y="41.6" textAnchor="middle" fontFamily="Geist, sans-serif" fontWeight="800" fontSize="6.4" fill={D}>BRQ DIGITAL</text></svg>);
    case "fair": return (
      <svg viewBox="0 0 64 64" {...s} aria-hidden="true"><rect x="30" y="10" width="4" height="40" rx="2" fill={V} /><rect x="18" y="50" width="28" height="6" rx="3" fill={V} /><path d="M10 18h44" stroke={V} strokeWidth="4" strokeLinecap="round" />
        <path d="M6 36l8-16 8 16a8 8 0 01-16 0z" fill={M} /><path d="M42 36l8-16 8 16a8 8 0 01-16 0z" fill={V} opacity=".75" /><circle cx="32" cy="10" r="5" fill={M} /></svg>);
  }
}
