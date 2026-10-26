export const cx = (...parts) => parts.filter(Boolean).join(' ')

export const initials = (name) =>
  name.split(/\s+/).filter((w) => w && !/^(dr\.?|sir|lady|lord|mr\.?|mrs\.?|miss)$/i.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export const titleCase = (s) => s.replace(/(^|\s)\w/g, (c) => c.toUpperCase())

export const PHASE_LABEL = {
  lobby: 'Waiting for players',
  investigation: 'Investigating',
  voting: 'Voting',
  reveal: 'Case closed',
}

// Exhibits are lettered in the order the team found them: A, B, C...
export const exhibitLetter = (i) => (i < 26 ? String.fromCharCode(65 + i) : String(i + 1))

// A slight, steady tilt per exhibit so a stack looks handled, not generated.
export const tiltFor = (i) => [-1.1, 0.7, -0.5, 1, -0.9, 0.4, -0.3][i % 7]

// Muted jewel tones for suspect portraits.
const TONES = [
  ['#8a3630', '#2a1313'],
  ['#2f6a6a', '#102321'],
  ['#6a4470', '#201526'],
  ['#77762f', '#1f2010'],
  ['#34528a', '#101827'],
]
export const toneFor = (id) => {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}
