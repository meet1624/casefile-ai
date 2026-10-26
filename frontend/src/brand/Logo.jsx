import { useId } from 'react'

/** The Casefile mark: an evidence folder, an eye whose iris is a fingerprint and whose pupil is a keyhole, and a wax seal. */
export function Mark({ size = 40, className = '', title }) {
  const id = useId()
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <radialGradient id={`${id}-seal`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#c4473f" /><stop offset="1" stopColor="#6a1824" />
        </radialGradient>
      </defs>
      <path d="M5 19a4 4 0 0 1 4-4h14l5 6h27a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" fill="#0c1018" stroke="#d9a441" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M9 31Q30 14 51 31Q30 48 9 31Z" fill="none" stroke="#d9a441" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="30" cy="31" r="9.5" fill="#d9a441" />
      <g fill="none" stroke="#0c1018" strokeWidth="1.1" strokeLinecap="round">
        <path d="M22.4 31a7.6 7.6 0 0 1 15.2 0" strokeDasharray="9 2.5" />
        <path d="M24.6 33.4a5.6 5.6 0 0 0 10.8-.4" strokeDasharray="7 2.2" />
      </g>
      <circle cx="30" cy="29.4" r="2.8" fill="#0c1018" />
      <path d="M28 31h4l1.6 6.6h-7.2z" fill="#0c1018" />
      <circle cx="50" cy="49" r="9.2" fill={`url(#${id}-seal)`} stroke="#c4473f" strokeWidth="1.2" />
      <circle cx="50" cy="49" r="5.6" fill="none" stroke="#0c1018" strokeOpacity=".4" strokeWidth="1" />
      <path d="M52.6 46.8a4 4 0 1 0 0 4.4" fill="none" stroke="#f3d6cf" strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Stencil lettering, drawn from strokes so it reads like a stamped file label rather than a font.
const LETTERS = {
  C: { w: 60, d: 'M52 22C44 4 10 8 10 40S44 76 52 58' },
  A: { w: 60, d: 'M6 80 30 6 54 80M17 56H43' },
  S: { w: 60, d: 'M50 20C46 6 12 6 12 24S50 36 50 56 14 74 8 58' },
  E: { w: 60, d: 'M50 8H12V72H50M12 40H44' },
  F: { w: 60, d: 'M50 8H12V80M12 40H44' },
  L: { w: 60, d: 'M12 8V72H50' },
  I: { w: 40, d: 'M20 30V72' },
}
const WORD = ['C', 'A', 'S', 'E', 'F', 'I', 'L', 'E']

export function Wordmark({ height = 28, className = '', rough = false }) {
  const id = useId()
  let x = 0
  const cells = WORD.map((ch, i) => {
    const cell = { ch, x, i }
    x += LETTERS[ch].w + 12
    return cell
  })
  const width = x - 12
  return (
    <svg viewBox={`0 0 ${width} 90`} height={height} width={(height * width) / 90} className={className} role="img" aria-label="Casefile">
      {rough && (
        <filter id={`${id}-rough`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      )}
      <g fill="none" stroke="currentColor" strokeWidth="11" strokeLinejoin="miter" strokeLinecap="butt" filter={rough ? `url(#${id}-rough)` : undefined} transform="translate(0 4)">
        {cells.map(({ ch, x: cx, i }) => (
          <path key={i} d={LETTERS[ch].d} transform={`translate(${cx} 0)`} />
        ))}
      </g>
      {/* the dot of the I is the wax seal */}
      <circle cx={cells[5].x + 20} cy="14" r="9" fill="#a82f35" />
      <circle cx={cells[5].x + 20} cy="14" r="9" fill="none" stroke="#e0867c" strokeOpacity=".5" />
    </svg>
  )
}

/** Mark and wordmark side by side. */
export default function Logo({ size = 36, className = '', rough = false }) {
  return (
    <span className={`inline-flex items-center gap-3 text-bone ${className}`}>
      <Mark size={size} />
      <Wordmark height={size * 0.56} rough={rough} />
    </span>
  )
}
