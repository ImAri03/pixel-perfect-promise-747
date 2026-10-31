export function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <line x1="2" y1="16" x2="24" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M3 20 C9 19, 12 13, 21 6" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="21" cy="6" r="2.4" fill="var(--color-gold)" />
      </svg>
      <span className="font-serif text-xl tracking-tight">Meridian</span>
    </span>
  );
}
