// Crest.tsx — SHSID institutional crest: "S" monogram in a green shield.
// Inline SVG, no assets. `tone` switches between light-on-dark (rail) and
// dark-on-light (light panels) rendering.
export default function Crest({
  size = 40,
  tone = 'light',
  className,
}: {
  size?: number
  tone?: 'light' | 'dark'
  className?: string
}) {
  const shield = tone === 'light' ? '#FBFCFB' : '#2F5D50'
  const letter = tone === 'light' ? '#26493F' : '#FBFCFB'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="SHSID crest"
      role="img"
    >
      <path
        d="M24 3 42 9v14c0 11-7.5 18.6-18 22C13.5 41.6 6 34 6 23V9l18-6Z"
        fill={shield}
      />
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontFamily="'Instrument Serif', Georgia, serif"
        fontSize="24"
        fill={letter}
      >
        S
      </text>
    </svg>
  )
}
