/** How the face is arranged for each expression. Distances are in drawing units (the face is about 150 wide). */
export const NEUTRAL = { browLift: 0, browInner: 0, browOuter: 0, brow2: 0, lid: 1, squint: 0, smile: 0, mouthW: 1, open: 0, skew: 0, tilt: 0, headY: 0 }

export const EXPRESSIONS = {
  neutral: {},
  listening: { browLift: -4, lid: 1.1, smile: 0.12, tilt: 2.6 },
  thinking: { browLift: -2, brow2: -9, browInner: 1, lid: 0.88, smile: -0.12, skew: -2.5, tilt: -3.6, mouthW: 0.82 },
  nervous: { browLift: -5, browInner: -6, lid: 1.14, smile: -0.28, mouthW: 0.82, tilt: 1.2, headY: 1 },
  confident: { browLift: -2, lid: 0.92, smile: 0.5, skew: 2.6, tilt: -1.6, headY: -3 },
  suspicious: { browLift: 2, browInner: 3, brow2: -7, lid: 0.62, squint: 0.4, smile: -0.12, skew: 2.2, tilt: 5.2, mouthW: 0.92 },
  angry: { browLift: 3, browInner: 9, lid: 0.7, squint: 0.3, smile: -0.62, mouthW: 0.95, tilt: -1.2, headY: 1 },
  surprised: { browLift: -11, lid: 1.28, mouthW: 0.55, open: 0.95, headY: -4 },
  revealing: { browLift: 1, browInner: 5, lid: 0.78, squint: 0.22, smile: 0.32, skew: 3.2, tilt: -3.2, headY: 3 },
}

export const GAZE = {
  player: [0, 0],
  away: [-0.8, -0.8],
  down: [0.05, 1],
}

/** Scale an expression's distance from neutral by how expressive this person is. */
export function resolve(name, amp = 1) {
  const e = { ...NEUTRAL, ...(EXPRESSIONS[name] ?? {}) }
  const out = {}
  for (const k of Object.keys(NEUTRAL)) {
    if (k === 'lid' || k === 'mouthW') out[k] = 1 + (e[k] - 1) * amp
    else out[k] = e[k] * amp
  }
  return out
}
