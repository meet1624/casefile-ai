import { initials, toneFor } from '../lib'

/** A suspect's portrait: a monogram in a coloured seal. */
export default function Seal({ id, name, size = 48, className = '' }) {
  const [from, to] = toneFor(id)
  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid shrink-0 place-items-center rounded-full font-display text-bone ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 600,
        background: `radial-gradient(circle at 30% 25%, ${from}, ${to} 80%)`,
        boxShadow: 'inset 0 0 0 1px rgb(194 161 92 / .55), inset 0 0 0 4px rgb(13 14 17 / .55), inset 0 0 0 5px rgb(194 161 92 / .25)',
      }}
    >
      {initials(name)}
    </span>
  )
}
