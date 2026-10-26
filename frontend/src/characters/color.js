const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
/** Darken (f<1) or lighten (f>1) a #rrggbb colour. */
export function shade(hex, f) {
  const [r, g, b] = parse(hex)
  if (f <= 1) return `rgb(${clamp(r * f)} ${clamp(g * f)} ${clamp(b * f)})`
  const t = f - 1
  return `rgb(${clamp(r + (255 - r) * t)} ${clamp(g + (255 - g) * t)} ${clamp(b + (255 - b) * t)})`
}
