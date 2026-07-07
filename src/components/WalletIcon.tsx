interface Props {
  size?: number
  className?: string
}

/** לוגו ארנק גברי — ארנק בי-פולד עם תפרים וכרטיס מבצבץ. משתמש ב-currentColor. */
export function WalletIcon({ size = 24, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      {/* גוף הארנק (בי-פולד) */}
      <rect x="2.5" y="6" width="19" height="13.5" rx="2.6" fill="currentColor" opacity="0.16" />
      <rect x="2.5" y="6" width="19" height="13.5" rx="2.6" stroke="currentColor" strokeWidth="1.7" />
      {/* קו הקיפול העליון + תפר */}
      <path d="M2.5 10 H21.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 8 H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="0.2 2.2" />
      {/* תא הכרטיס עם הכפתור/סמל */}
      <path
        d="M21.5 12.5 H17.5 a2 2 0 0 0 0 4 H21.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="17.6" cy="14.5" r="1.15" fill="currentColor" />
    </svg>
  )
}
