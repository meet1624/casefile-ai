/**
 * Who everyone is. A character's face is looked up by suspect id, never by position or at random,
 * so a suspect keeps the same face on every screen. Ids we have not drawn by hand (cases an admin
 * adds) get a face generated from a hash of the id, so they are stable too.
 */

export const SKINS = {
  porcelain: ['#f0d1bb', '#c9998a'],
  warm: ['#e3b594', '#b9826a'],
  olive: ['#cc9769', '#9b6944'],
  tan: ['#b97e55', '#8a5836'],
  deep: ['#80503a', '#573222'],
  ruddy: ['#dea68c', '#b3766a'],
}

const base = {
  fw: 74, jaw: 62, cw: 32, cd: 10, top: 98,
  eye: { gap: 38, y: 208, w: 16, h: 10.5, tilt: 0, iris: '#4a3a2a' },
  brow: { thick: 5, arch: 6, color: '#2a2018', y: 186, len: 21 },
  nose: { w: 13, len: 48 },
  mouth: { w: 25, color: '#a8554f', thick: 3.2, y: 262 },
  age: 0.4, build: 1, lashes: false, freckles: false, blush: 0,
  facial: null, glasses: null, extras: [],
}
const merge = (spec) => ({
  ...base, ...spec,
  eye: { ...base.eye, ...spec.eye }, brow: { ...base.brow, ...spec.brow },
  nose: { ...base.nose, ...spec.nose }, mouth: { ...base.mouth, ...spec.mouth },
})

// demeanor: how this person's face behaves. `amp` scales every expression (a stoic face moves less),
// `onEvidence` is how they look when handed an exhibit. It never depends on whether they are lying.
const CAST = {
  vivian: merge({
    skin: 'porcelain', age: 0.6, fw: 71, jaw: 58, cw: 28, cd: 12, lashes: true, blush: 0.15,
    eye: { gap: 37, h: 10, iris: '#5b6b5a', tilt: 2 }, brow: { color: '#6d5947', thick: 3.6, arch: 9 },
    nose: { w: 11, len: 46 }, mouth: { w: 24, color: '#a23a4a', thick: 3.6 },
    hair: { style: 'chignon', color: '#8f7f78', streak: '#d8d2cc' },
    clothes: { type: 'dress', color: '#6e5a92', accent: '#e9e2d6' },
    extras: ['pearls', 'earrings'],
    demeanor: { amp: 0.7, idle: 'confident', onEvidence: 'confident', blink: 4300, breath: 4.6 },
    hover: 'Vivian smiles like she has been waiting for you.',
  }),
  marcus: merge({
    skin: 'warm', age: 0.28, fw: 77, jaw: 66, cw: 34, cd: 8, blush: 0.1,
    eye: { gap: 40, iris: '#6a4a2c', y: 207 }, brow: { color: '#3b2a1d', thick: 5.5 },
    mouth: { w: 26, color: '#b0645a' },
    hair: { style: 'messy', color: '#4a3220' }, facial: { type: 'stubble', color: '#3b2a1d' },
    clothes: { type: 'suit', color: '#30333f', accent: '#8a2f38', shirt: '#d9d4c6', loose: true },
    demeanor: { amp: 1.15, idle: 'nervous', onEvidence: 'nervous', blink: 2600, breath: 3.6 },
    hover: 'Marcus cracks a joke, then glances at the door.',
  }),
  elena: merge({
    skin: 'warm', age: 0.5, fw: 70, jaw: 57, cw: 28, cd: 10, lashes: true,
    eye: { gap: 36, h: 9.5, iris: '#33423a', tilt: 1 }, brow: { color: '#17130f', thick: 3.8, arch: 3, y: 188 },
    nose: { w: 11, len: 47 }, mouth: { w: 22, color: '#9a5048', thick: 2.8 },
    hair: { style: 'bob', color: '#15110d' }, glasses: { type: 'round', color: '#222' },
    clothes: { type: 'blazer', color: '#585d66', accent: '#d9d4c6', shirt: '#2a2c33' },
    demeanor: { amp: 0.6, idle: 'suspicious', onEvidence: 'suspicious', blink: 5200, breath: 5 },
    hover: 'Elena studies you over the rims of her glasses.',
  }),
  tomas: merge({
    skin: 'ruddy', age: 0.55, fw: 79, jaw: 68, cw: 36, cd: 8, blush: 0.5,
    eye: { gap: 39, h: 10, iris: '#4f6a82', y: 209 }, brow: { color: '#6a5646', thick: 5, arch: 4 },
    nose: { w: 15, len: 49 }, mouth: { w: 24, color: '#b0645a' },
    hair: { style: 'balding', color: '#7a6858' }, facial: { type: 'chevron', color: '#6a5646' },
    clothes: { type: 'whites', color: '#e8e4da', accent: '#7a1f2b' },
    demeanor: { amp: 1.1, idle: 'nervous', onEvidence: 'nervous', blink: 2400, breath: 3.8 },
    hover: 'Tomas straightens his bow tie and smiles too quickly.',
  }),
  owen: merge({
    skin: 'tan', age: 0.62, fw: 80, jaw: 70, cw: 38, cd: 7,
    eye: { gap: 40, h: 9, iris: '#40382c', y: 208 }, brow: { color: '#4a4a4a', thick: 6.5, arch: 2, y: 187 },
    nose: { w: 15, len: 50 }, mouth: { w: 25, color: '#8f544c' },
    hair: { style: 'crop', color: '#6d6d6d' }, facial: { type: 'beard', color: '#58585a' },
    clothes: { type: 'crew', color: '#1d1f24', accent: '#3d4350' }, extras: ['headset'],
    demeanor: { amp: 0.8, idle: 'suspicious', onEvidence: 'angry', blink: 4800, breath: 4.9 },
    hover: 'Owen does not look up from his clipboard. Then he does.',
  }),
  ines: merge({
    skin: 'porcelain', age: 0.78, fw: 68, jaw: 55, cw: 26, cd: 12, lashes: true,
    eye: { gap: 35, h: 9, iris: '#4b6674', tilt: 2 }, brow: { color: '#a8a8a8', thick: 3, arch: 5 },
    nose: { w: 11, len: 50 }, mouth: { w: 21, color: '#91505a', thick: 2.6 },
    hair: { style: 'swept', color: '#b9bbbe' }, glasses: { type: 'rect', color: '#3a3f4a' },
    clothes: { type: 'blazer', color: '#2f6a6f', accent: '#e8e2d6', shirt: '#e8e2d6' }, extras: ['brooch'],
    demeanor: { amp: 0.55, idle: 'neutral', onEvidence: 'suspicious', blink: 5600, breath: 5.2 },
    hover: 'Dr. Calder checks her watch. You are keeping her.',
  }),
  helena: merge({
    skin: 'olive', age: 0.25, fw: 69, jaw: 57, cw: 27, cd: 11, lashes: true, blush: 0.12,
    eye: { gap: 37, h: 11, iris: '#2e2a26', tilt: 3 }, brow: { color: '#1a1410', thick: 4.4, arch: 8 },
    nose: { w: 11, len: 46 }, mouth: { w: 25, color: '#a8202f', thick: 4 },
    hair: { style: 'long', color: '#1a1410' },
    clothes: { type: 'offshoulder', color: '#16171c', accent: '#d9a441' },
    demeanor: { amp: 1, idle: 'confident', onEvidence: 'surprised', blink: 3400, breath: 4.2 },
    hover: 'Helena rolls her shoulders like someone about to go on stage.',
  }),
  finch: merge({
    skin: 'warm', age: 0.58, fw: 74, jaw: 62, cw: 31, cd: 10, lashes: true, blush: 0.12,
    eye: { gap: 37, h: 9.5, iris: '#58513a' }, brow: { color: '#5c5348', thick: 4.2, arch: 6 },
    nose: { w: 12, len: 47 }, mouth: { w: 23, color: '#a85d56' },
    hair: { style: 'curly', color: '#7d7468' }, glasses: { type: 'pince', color: '#c9a94f' },
    clothes: { type: 'tweed', color: '#5b6046', accent: '#e8e2d6', shirt: '#e8e2d6' }, extras: ['stethoscope'],
    demeanor: { amp: 0.65, idle: 'confident', onEvidence: 'neutral', blink: 4500, breath: 4.7 },
    hover: 'Dr. Finch tilts her head, the way she does with every patient.',
  }),
  julian: merge({
    skin: 'porcelain', age: 0.24, fw: 72, jaw: 60, cw: 28, cd: 9, blush: 0.2,
    eye: { gap: 38, h: 10.5, iris: '#4f7396', y: 207 }, brow: { color: '#a98a52', thick: 4.2, arch: 8 },
    nose: { w: 11, len: 47 }, mouth: { w: 24, color: '#b0645a' },
    hair: { style: 'slick', color: '#c8a45c' }, facial: { type: 'pencil', color: '#a98a52' },
    clothes: { type: 'waistcoat', color: '#7a1f2b', accent: '#d9a441', shirt: '#eee8da' },
    demeanor: { amp: 1.05, idle: 'confident', onEvidence: 'confident', blink: 3000, breath: 3.9 },
    hover: 'Julian flashes a grin you would not trust with your wallet.',
  }),
  beatrice: merge({
    skin: 'porcelain', age: 0.7, fw: 69, jaw: 56, cw: 27, cd: 12, lashes: true,
    eye: { gap: 36, h: 9, iris: '#3f4f5a', tilt: 2 }, brow: { color: '#4a4745', thick: 3.2, arch: 8, y: 187 },
    nose: { w: 11, len: 47 }, mouth: { w: 22, color: '#8f1f33', thick: 3.6 },
    hair: { style: 'veilhat', color: '#5b5856' },
    clothes: { type: 'widow', color: '#101116', accent: '#e8e2d6' }, extras: ['pearls'],
    demeanor: { amp: 0.5, idle: 'neutral', onEvidence: 'suspicious', blink: 5800, breath: 5.4 },
    hover: 'Lady Ashby behind her veil. You cannot tell what she is thinking.',
  }),
  edith: merge({
    skin: 'porcelain', age: 0.3, fw: 70, jaw: 58, cw: 28, cd: 10, freckles: true, blush: 0.22,
    eye: { gap: 37, h: 10.5, iris: '#6a7a4a', tilt: 1 }, brow: { color: '#6a4a30', thick: 3.6, arch: 5 },
    nose: { w: 11, len: 46 }, mouth: { w: 23, color: '#b05d5a' },
    hair: { style: 'braids', color: '#7a4a2a' }, glasses: { type: 'round', color: '#6a4a30', small: true },
    clothes: { type: 'cardigan', color: '#c08a2e', accent: '#f0e8d6', shirt: '#f0e8d6' },
    demeanor: { amp: 0.75, idle: 'listening', onEvidence: 'surprised', blink: 3700, breath: 4.4 },
    hover: 'Edith glances up from her notes. She notices everything.',
  }),
  pym: merge({
    skin: 'ruddy', age: 0.86, fw: 78, jaw: 67, cw: 35, cd: 8, blush: 0.4,
    eye: { gap: 40, h: 8.5, iris: '#58667a', y: 209 }, brow: { color: '#d8d6d2', thick: 6, arch: 3, y: 187 },
    nose: { w: 16, len: 50 }, mouth: { w: 22, color: '#a3605a' },
    hair: { style: 'cap', color: '#d8d6d2' }, facial: { type: 'walrus', color: '#e2e0dc' },
    clothes: { type: 'uniform', color: '#1c2a45', accent: '#d9a441' },
    demeanor: { amp: 0.6, idle: 'neutral', onEvidence: 'neutral', blink: 5100, breath: 5.3 },
    hover: 'Pym tips his cap an inch and says nothing.',
  }),
}

// ---- stable faces for ids we have not drawn --------------------------------------------------

function hash(str) {
  let h = 2166136261
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h >>> 0
}
const pick = (arr, h, salt) => arr[(hash(`${h}:${salt}`)) % arr.length]
const range = (h, salt, lo, hi) => lo + ((hash(`${h}:${salt}`) % 1000) / 1000) * (hi - lo)

const HAIR_COLORS = ['#15110d', '#3b2a1d', '#6a4a30', '#a67c4a', '#c8a45c', '#7d7468', '#b9bbbe', '#8a3b24']
const SUITS = [['suit', '#30333f'], ['blazer', '#4a5a66'], ['cardigan', '#9a6a3a'], ['suit', '#4a2f38'], ['tweed', '#5b6046'], ['widow', '#14151a']]
const STYLES = ['slick', 'messy', 'bob', 'chignon', 'crop', 'swept', 'long', 'curly', 'braids']
const FEMME = new Set(['bob', 'chignon', 'long', 'braids', 'swept'])

function generated(id, personality = '') {
  const h = hash(id)
  const style = pick(STYLES, h, 'hair')
  const [type, color] = pick(SUITS, h, 'clothes')
  const demeanor = demeanorFrom(personality)
  return merge({
    skin: pick(Object.keys(SKINS), h, 'skin'), age: range(h, 'age', 0.2, 0.85),
    fw: range(h, 'fw', 68, 80), jaw: range(h, 'jaw', 55, 68), cw: range(h, 'cw', 26, 38), cd: range(h, 'cd', 7, 12),
    lashes: FEMME.has(style), blush: range(h, 'blush', 0, 0.35), freckles: hash(`${h}:fr`) % 6 === 0,
    eye: { gap: range(h, 'gap', 35, 41), h: range(h, 'eh', 9, 11), iris: pick(['#4a3a2a', '#4f6a82', '#58603a', '#3a3a3a'], h, 'iris') },
    brow: { thick: range(h, 'bt', 3.2, 6.4), arch: range(h, 'ba', 3, 9), color: pick(HAIR_COLORS, h, 'hair') },
    mouth: { w: range(h, 'mw', 21, 26), color: FEMME.has(style) ? '#a33c4a' : '#a8645a' },
    hair: { style, color: pick(HAIR_COLORS, h, 'hair'), streak: '#d8d2cc' },
    facial: !FEMME.has(style) && hash(`${h}:fh`) % 3 === 0 ? { type: pick(['stubble', 'chevron', 'pencil'], h, 'ft'), color: pick(HAIR_COLORS, h, 'hair') } : null,
    glasses: hash(`${h}:gl`) % 4 === 0 ? { type: pick(['round', 'rect'], h, 'gt'), color: '#2a2a2a' } : null,
    clothes: { type, color, accent: '#e8e2d6', shirt: '#e8e2d6' },
    demeanor: { ...demeanor, blink: range(h, 'bl', 2800, 5600), breath: range(h, 'br', 3.6, 5.4) },
  })
}

/** Read a suspect's public personality line and decide how their face behaves. */
export function demeanorFrom(personality = '') {
  const p = personality.toLowerCase()
  const has = (...w) => w.some((x) => p.includes(x))
  if (has('nervous', 'anxious', 'desperate', 'restless')) return { amp: 1.1, idle: 'nervous', onEvidence: 'nervous' }
  if (has('gruff', 'blunt', 'brisk', 'sharp')) return { amp: 0.8, idle: 'suspicious', onEvidence: 'angry' }
  if (has('charming', 'polished', 'warm', 'composed', 'calm')) return { amp: 0.75, idle: 'confident', onEvidence: 'confident' }
  if (has('quiet', 'precise', 'guarded', 'discreet', 'weary', 'observant')) return { amp: 0.6, idle: 'neutral', onEvidence: 'suspicious' }
  return { amp: 0.8, idle: 'neutral', onEvidence: 'surprised' }
}

const cache = new Map()
export function specFor(id, personality) {
  if (CAST[id]) return CAST[id]
  if (!cache.has(id)) cache.set(id, generated(id, personality))
  return cache.get(id)
}

export const CAST_IDS = Object.keys(CAST)
