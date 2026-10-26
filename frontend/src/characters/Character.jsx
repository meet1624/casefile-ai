import { memo, useEffect, useId, useRef } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { shade } from './color'
import { EXPRESSIONS, GAZE, NEUTRAL, resolve } from './expressions'
import { Body, BodyExtras, Extras, FacialHair, Glasses, Hair } from './parts'
import { subscribePointer } from './pointer'
import { SKINS, specFor } from './specs'

const CROPS = {
  bust: '0 0 400 480',
  portrait: '50 50 300 380',
  head: '84 70 232 270',
}

function facePath({ fw, jaw, cw, cd, top }) {
  const R = (x) => 200 + x
  const Lf = (x) => 200 - x
  const cheek = 205
  const chin = 300
  return (
    `M200 ${top}C${R(fw * 0.55)} ${top} ${R(fw)} ${top + 34} ${R(fw)} ${cheek - 30}` +
    `C${R(fw)} ${cheek + 30} ${R(jaw)} ${chin - 28} ${R(cw)} ${chin - 4}` +
    `C${R(cw * 0.55)} ${chin + cd} ${R(cw * 0.25)} ${chin + cd} 200 ${chin + cd}` +
    `C${Lf(cw * 0.25)} ${chin + cd} ${Lf(cw * 0.55)} ${chin + cd} ${Lf(cw)} ${chin - 4}` +
    `C${Lf(jaw)} ${chin - 28} ${Lf(fw)} ${cheek + 30} ${Lf(fw)} ${cheek - 30}` +
    `C${Lf(fw)} ${top + 34} ${Lf(fw * 0.55)} ${top} 200 ${top}Z`
  )
}

const almond = (cx, cy, w, ry, tilt, squint) => {
  const up = ry * 1.75
  const low = ry * 1.45 * (1 - squint * 0.75)
  return `M${cx - w} ${cy + tilt}Q${cx} ${cy - up} ${cx + w} ${cy - tilt}Q${cx} ${cy + low} ${cx - w} ${cy + tilt}Z`
}
const upperLid = (cx, cy, w, ry, tilt) => `M${cx - w - 1} ${cy + tilt}Q${cx} ${cy - ry * 1.75} ${cx + w + 1} ${cy - tilt}`

/**
 * A suspect, drawn as layered vector art. The face is built from separate parts (eyes, lids, brows, mouth, head,
 * shoulders) and every part is animated on its own, so expressions move rather than swap.
 *
 * expression: neutral | listening | thinking | nervous | confident | suspicious | angry | surprised | revealing
 * look: 'cursor' (eyes follow the pointer) | 'player' | 'away' | 'down'
 * speaking: moves the mouth while true. lit: 0..1 brightness of the lamp on the face.
 */
function Character({
  id, name = '', personality = '', expression = 'neutral', speaking = false, look = 'player', lit = 0.4,
  lightFrom = 'left', crop = 'bust', className = '', interactive = false, notice = 0,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const reduce = useReducedMotion()
  const spec = specFor(id, personality)
  const amp = spec.demeanor?.amp ?? 1
  const skin = SKINS[spec.skin]
  const { eye, brow, mouth: m, nose } = spec
  const fw = spec.fw
  const face = facePath(spec)

  const svgRef = useRef(null)
  const mv = {
    browLift: useMotionValue(0), browInner: useMotionValue(0), browOuter: useMotionValue(0), brow2: useMotionValue(0),
    lid: useMotionValue(1), squint: useMotionValue(0), smile: useMotionValue(0), mouthW: useMotionValue(1),
    open: useMotionValue(0), skew: useMotionValue(0), tilt: useMotionValue(0), headY: useMotionValue(0),
  }
  const blink = useMotionValue(0)
  const sway = useMotionValue(0)
  const breath = useMotionValue(0)
  const nudge = useMotionValue(0)
  const talk = useMotionValue(0)
  const gxT = useMotionValue(0)
  const gyT = useMotionValue(0)
  const gx = useSpring(gxT, { stiffness: 110, damping: 18 })
  const gy = useSpring(gyT, { stiffness: 110, damping: 18 })

  // ---- expression: ease every part toward the target arrangement
  useEffect(() => {
    const target = resolve(expression, amp)
    if (reduce) {
      Object.entries(target).forEach(([k, v]) => mv[k].set(v))
      return undefined
    }
    const runs = Object.entries(target).map(([k, v]) => animate(mv[k], v, { type: 'spring', stiffness: 130, damping: 19 }))
    return () => runs.forEach((r) => r.stop())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, amp, reduce])

  // ---- idle life: blinking, breathing, a slow sway of the head
  useEffect(() => {
    if (reduce) return undefined
    let t
    let dead = false
    const base = spec.demeanor?.blink ?? 4000
    const loop = () => {
      t = setTimeout(async () => {
        if (dead) return
        await animate(blink, 1, { duration: 0.07 })
        await animate(blink, 0, { duration: 0.12 })
        if (!dead && Math.random() < 0.2) {
          await animate(blink, 1, { duration: 0.07 })
          await animate(blink, 0, { duration: 0.12 })
        }
        loop()
      }, base * (0.6 + Math.random() * 0.9))
    }
    loop()
    const b = animate(breath, [0, 1, 0], { duration: spec.demeanor?.breath ?? 4.5, repeat: Infinity, ease: 'easeInOut' })
    const s = animate(sway, [-0.9, 0.9, -0.9], { duration: (spec.demeanor?.breath ?? 4.5) * 2.3, repeat: Infinity, ease: 'easeInOut' })
    return () => { dead = true; clearTimeout(t); b.stop(); s.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, id])

  // ---- gaze
  useEffect(() => {
    if (look === 'cursor') {
      return subscribePointer(({ x, y }) => {
        const r = svgRef.current?.getBoundingClientRect()
        if (!r) return
        const dx = (x - (r.left + r.width / 2)) / (window.innerWidth * 0.32)
        const dy = (y - (r.top + r.height * 0.42)) / (window.innerHeight * 0.4)
        gxT.set(Math.max(-1, Math.min(1, dx)))
        gyT.set(Math.max(-0.8, Math.min(0.8, dy)))
      })
    }
    const [x, y] = GAZE[look] ?? GAZE.player
    gxT.set(x); gyT.set(y)
    if (reduce || look !== 'player') return undefined
    // small, character-sized eye movements; a nervous face glances around more
    const nervous = expression === 'nervous'
    const id2 = setInterval(() => {
      gxT.set((Math.random() - 0.5) * (nervous ? 1.1 : 0.3))
      gyT.set((Math.random() - 0.5) * (nervous ? 0.6 : 0.2))
    }, nervous ? 900 : 2600)
    return () => clearInterval(id2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, expression, reduce])

  // ---- speaking: the mouth opens and closes while the suspect talks
  useEffect(() => {
    if (!speaking || reduce) { const a = animate(talk, 0, { duration: 0.15 }); return () => a.stop() }
    const iv = setInterval(() => animate(talk, 0.15 + Math.random() * 0.85, { duration: 0.09 }), 115)
    return () => { clearInterval(iv); animate(talk, 0, { duration: 0.15 }) }
  }, [speaking, reduce, talk])

  // ---- "notice": a quick look-up, blink and head tilt when the player points at them
  useEffect(() => {
    if (!notice || reduce) return undefined
    const a = animate(nudge, [0, 3.2, 0], { duration: 1.1, ease: 'easeInOut' })
    animate(blink, [0, 1, 0], { duration: 0.22 })
    return () => a.stop()
  }, [notice, reduce, nudge, blink])

  // ---- derived drawing values
  const openAmt = useTransform([mv.open, talk], ([o, t]) => Math.max(o, t))
  const lidFrac = useTransform([mv.lid, blink], ([l, b]) => Math.max(0.06, Math.min(1.3, l) * (1 - b * 0.96)))
  const { gap, y: ey, w: ew, h: eh, tilt: et } = eye
  const eyeL = useTransform([lidFrac, mv.squint], ([l, s]) => almond(200 - gap, ey, ew, eh * l, et, s))
  const eyeR = useTransform([lidFrac, mv.squint], ([l, s]) => almond(200 + gap, ey, ew, eh * l, -et, s))
  const lidL = useTransform(lidFrac, (l) => upperLid(200 - gap, ey, ew, eh * l, et))
  const lidR = useTransform(lidFrac, (l) => upperLid(200 + gap, ey, ew, eh * l, -et))
  const squintLine = useTransform(mv.squint, (s) => 0.5 * s)
  const browPath = (side) => ([lift, inner, outer, extra]) => {
    const cx = 200 + side * gap
    const by = brow.y + lift + (side > 0 ? extra : 0)
    const half = brow.len
    const innerX = cx - side * half
    const outerX = cx + side * half
    const iy = by + inner
    const oy = by + outer + 2
    return `M${innerX} ${iy}Q${cx - side * 2} ${Math.min(iy, oy) - brow.arch}  ${outerX} ${oy}`
  }
  const browL = useTransform([mv.browLift, mv.browInner, mv.browOuter, mv.brow2], browPath(-1))
  const browR = useTransform([mv.browLift, mv.browInner, mv.browOuter, mv.brow2], browPath(1))
  const mouthD = useTransform([mv.smile, mv.mouthW, openAmt, mv.skew], ([s, wf, o, sk]) => {
    const hw = m.w * wf
    const cl = -s * 7
    const cr = -s * 7 + sk
    const u = -(3 + o * 1.2)
    const l = 5 + o * 15 - s * 1.2
    return `M${-hw} ${cl}C${-hw * 0.5} ${u + cl * 0.3} ${hw * 0.5} ${u + cr * 0.3} ${hw} ${cr}C${hw * 0.5} ${l} ${-hw * 0.5} ${l} ${-hw} ${cl}Z`
  })
  const teethOpacity = useTransform(openAmt, (o) => (o > 0.25 ? 1 : 0))
  const pupilT = useTransform([gx, gy], ([x, y]) => `translate(${x * ew * 0.42}px, ${y * eh * 0.5}px)`)
  const headT = useTransform([mv.tilt, sway, nudge, mv.headY], ([t, s, n, y]) => `translateY(${y}px) rotate(${t + s + n}deg)`)
  const bodyT = useTransform(breath, (b) => `translateY(${b * 2.4}px) scale(${1 + b * 0.004})`)
  const sweatY = useMotionValue(0)
  useEffect(() => {
    if (expression !== 'nervous' || reduce) return undefined
    const a = animate(sweatY, [0, 1], { duration: 2.4, repeat: Infinity, ease: 'easeIn' })
    return () => a.stop()
  }, [expression, reduce, sweatY])
  const sweatT = useTransform(sweatY, (v) => `translateY(${v * 34}px)`)
  const sweatO = useTransform(sweatY, [0, 0.15, 0.8, 1], [0, 0.9, 0.9, 0])

  const flip = lightFrom === 'right'
  const f = (a, b) => (flip ? b : a)
  const hairColor = spec.hair?.color ?? '#333'
  const aged = spec.age

  return (
    <svg
      ref={svgRef}
      viewBox={CROPS[crop] ?? CROPS.bust}
      preserveAspectRatio="xMidYMax meet"
      className={className}
      role="img"
      aria-label={name || id}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`${uid}-skin`} cx={f('38%', '62%')} cy="36%" r="85%">
          <stop offset="0" stopColor={shade(skin[0], 1.12)} /><stop offset=".55" stopColor={skin[0]} /><stop offset="1" stopColor={skin[1]} />
        </radialGradient>
        <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(hairColor, 1.18)} /><stop offset=".6" stopColor={hairColor} /><stop offset="1" stopColor={shade(hairColor, 0.6)} />
        </linearGradient>
        <linearGradient id={`${uid}-cloth`} x1={f('0', '1')} y1="0" x2={f('1', '0')} y2="1">
          <stop offset="0" stopColor={shade(spec.clothes.color, 1.2)} /><stop offset=".55" stopColor={spec.clothes.color} /><stop offset="1" stopColor={shade(spec.clothes.color, 0.55)} />
        </linearGradient>
        <linearGradient id={`${uid}-light`} x1={f('0', '1')} y1="0" x2={f('1', '0')} y2="0">
          <stop offset="0" stopColor="#ffc46b" stopOpacity="0.55" /><stop offset=".45" stopColor="#ffc46b" stopOpacity="0" /><stop offset="1" stopColor="#02040a" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${uid}-rim`} x1={f('0', '1')} y1="0" x2={f('1', '0')} y2="0">
          <stop offset="0" stopColor="#ffd28a" stopOpacity="0.95" /><stop offset=".3" stopColor="#ffd28a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-stub`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={spec.facial?.color ?? '#000'} stopOpacity="0" /><stop offset=".45" stopColor={spec.facial?.color ?? '#000'} stopOpacity=".6" />
        </linearGradient>
        <pattern id={`${uid}-dots`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.4" r=".7" fill={spec.facial?.color ?? '#000'} /><circle cx="3.8" cy="3.6" r=".7" fill={spec.facial?.color ?? '#000'} />
        </pattern>
        <linearGradient id={`${uid}-lidshadow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".45" /><stop offset=".5" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-iris`} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor={shade(eye.iris, 1.6)} /><stop offset=".6" stopColor={eye.iris} /><stop offset="1" stopColor={shade(eye.iris, 0.5)} />
        </radialGradient>
        <clipPath id={`${uid}-face`}><path d={face} /></clipPath>
        <clipPath id={`${uid}-eyeL`}><motion.path d={eyeL} /></clipPath>
        <clipPath id={`${uid}-eyeR`}><motion.path d={eyeR} /></clipPath>
        <clipPath id={`${uid}-mouth`}><motion.path d={mouthD} /></clipPath>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      {/* hair behind the head follows the head's movement */}
      <motion.g style={{ transform: headT, transformOrigin: '200px 316px' }}>
        <Hair id={uid} spec={spec} layer="back" fw={fw} />
      </motion.g>

      <motion.g style={{ transform: bodyT, transformOrigin: '200px 480px' }}>
        <Body spec={spec} id={uid} skin={skin} />
        <BodyExtras spec={spec} />
        <ellipse cx="200" cy="344" rx="70" ry="18" fill="#000" opacity=".28" filter={`url(#${uid}-soft)`} />
        <path d={`M${200 - 118 * spec.build} 480C${200 - 114 * spec.build} 400 ${200 - 80} 352 138 340H262C${200 + 80} 352 ${200 + 114 * spec.build} 400 ${200 + 118 * spec.build} 480Z`} fill={`url(#${uid}-light)`} opacity={0.28} />
      </motion.g>

      <Hair id={uid} spec={spec} layer="locks" fw={fw} />

      {/* neck */}
      <path d={`M${200 - 31} 262L${200 - 33} 346C${200 - 20} 366 ${200 + 20} 366 ${200 + 33} 346L${200 + 31} 262Z`} fill={`url(#${uid}-skin)`} />
      <path d={`M${200 - 31} 292C${200 - 10} 322 ${200 + 10} 322 ${200 + 31} 292L${200 + 33} 346C${200 + 10} 360 ${200 - 10} 360 ${200 - 33} 346Z`} fill="#000" opacity=".18" />

      <motion.g style={{ transform: headT, transformOrigin: '200px 316px' }}>
        {/* ears */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <ellipse cx={200 + s * (fw + 2)} cy="216" rx="10" ry="17" fill={skin[1]} />
            <ellipse cx={200 + s * (fw + 3)} cy="216" rx="5.5" ry="11" fill={shade(skin[1], 0.8)} opacity=".55" />
          </g>
        ))}
        <path d={face} fill={`url(#${uid}-skin)`} />

        {/* cheek colour, brow-bone and jaw shading */}
        {spec.blush > 0 && [-1, 1].map((s) => <ellipse key={s} cx={200 + s * 46} cy="244" rx="21" ry="13" fill="#d96a6a" opacity={spec.blush * 0.55} filter={`url(#${uid}-soft)`} />)}
        <path d="M130 236C140 290 176 318 200 318S260 290 270 236C262 276 232 304 200 304S138 276 130 236Z" fill="#000" opacity=".13" />

        {/* age lines */}
        <g fill="none" stroke={skin[1]} strokeWidth="1.8" strokeLinecap="round" opacity={0.15 + aged * 0.45}>
          {aged > 0.45 && <path d="M156 128Q200 118 244 128M160 140Q200 131 240 140" opacity={0.7} />}
          {[-1, 1].map((s) => <path key={s} d={`M${200 + s * 62} 213Q${200 + s * 70} 218 ${200 + s * 68} 226M${200 + s * 61} 205Q${200 + s * 71} 205 ${200 + s * 70} 198`} />)}
          {[-1, 1].map((s) => <path key={`n${s}`} d={`M${200 + s * 22} 244Q${200 + s * 36} 258 ${200 + s * 33} 276`} opacity={0.5 + aged * 0.5} />)}
          {aged > 0.65 && [-1, 1].map((s) => <path key={`b${s}`} d={`M${200 + s * 44} 236Q${200 + s * 50} 250 ${200 + s * 46} 262`} opacity=".7" />)}
        </g>

        {/* nose */}
        <g fill="none" strokeLinecap="round">
          <path d={`M${200 + 4} 196C${200 + 8} 216 ${200 + nose.w * 0.9} ${186 + nose.len * 0.7} ${200 + nose.w} ${190 + nose.len}`} stroke={skin[1]} strokeWidth="3" opacity=".55" />
          <path d={`M${200 - nose.w - 2} ${192 + nose.len}Q200 ${204 + nose.len} ${200 + nose.w + 2} ${192 + nose.len}`} stroke={shade(skin[1], 0.7)} strokeWidth="3.2" opacity=".7" />
          <ellipse cx={200 - nose.w * 0.45} cy={191 + nose.len} rx="3" ry="1.8" fill={shade(skin[1], 0.4)} stroke="none" opacity=".8" />
          <ellipse cx={200 + nose.w * 0.45} cy={191 + nose.len} rx="3" ry="1.8" fill={shade(skin[1], 0.4)} stroke="none" opacity=".8" />
          <ellipse cx={199} cy={186 + nose.len * 0.8} rx="3.4" ry="7" fill="#fff" stroke="none" opacity=".14" />
        </g>
        <path d={`M200 ${m.y - 20}V${m.y - 11}`} stroke={skin[1]} strokeWidth="1.6" opacity=".35" strokeLinecap="round" />

        {/* eyes */}
        {[-1, 1].map((s) => {
          const cx = 200 + s * gap
          const shape = s < 0 ? eyeL : eyeR
          const lid = s < 0 ? lidL : lidR
          return (
            <g key={s}>
              <ellipse cx={cx} cy={ey - 2} rx={ew + 7} ry={eh + 7} fill={shade(skin[1], 0.85)} opacity=".16" />
              <motion.path d={shape} fill="#efe9dd" />
              <g clipPath={`url(#${uid}-eye${s < 0 ? 'L' : 'R'})`}>
                <motion.g style={{ transform: pupilT }}>
                  <circle cx={cx} cy={ey} r={eh * 1.02} fill={`url(#${uid}-iris)`} />
                  <circle cx={cx} cy={ey} r={eh * 0.44} fill="#07080b" />
                  <circle cx={cx - eh * 0.34} cy={ey - eh * 0.36} r={eh * 0.2} fill="#fff" opacity=".92" />
                  <circle cx={cx + eh * 0.3} cy={ey + eh * 0.3} r={eh * 0.1} fill="#fff" opacity=".45" />
                </motion.g>
                <motion.path d={shape} fill={`url(#${uid}-lidshadow)`} />
              </g>
              <motion.path d={lid} fill="none" stroke={shade(skin[1], 0.38)} strokeWidth={spec.lashes ? 3.4 : 2.4} strokeLinecap="round" />
              {spec.lashes && <path d={`M${cx + s * (ew + 1)} ${ey - s * et * 1}l${s * 7} -4`} stroke={shade(skin[1], 0.3)} strokeWidth="2.4" strokeLinecap="round" />}
              <motion.path d={lid} fill="none" stroke={skin[1]} strokeWidth="1.4" transform="translate(0 -5)" style={{ opacity: 0.55 }} />
            </g>
          )
        })}
        <motion.g style={{ opacity: squintLine }}>
          {[-1, 1].map((s) => <path key={s} d={`M${200 + s * gap - 14} ${ey + 14}Q${200 + s * gap} ${ey + 20} ${200 + s * gap + 14} ${ey + 14}`} stroke={skin[1]} strokeWidth="1.6" fill="none" opacity=".7" />)}
        </motion.g>

        {/* brows */}
        <motion.path d={browL} fill="none" stroke={brow.color} strokeWidth={brow.thick} strokeLinecap="round" />
        <motion.path d={browR} fill="none" stroke={brow.color} strokeWidth={brow.thick} strokeLinecap="round" />

        <FacialHair spec={spec} id={uid} layer="under" />

        {/* mouth */}
        <g transform={`translate(200 ${m.y})`}>
          <motion.path d={mouthD} fill="#2a0c10" stroke={m.color} strokeWidth={m.thick} strokeLinejoin="round" />
          <g clipPath={`url(#${uid}-mouth)`}>
            <motion.rect x="-24" y="-5" width="48" height="6" rx="2" fill="#efeadf" style={{ opacity: teethOpacity }} />
            <ellipse cx="0" cy="12" rx="12" ry="6" fill="#8a3a3f" opacity=".7" />
          </g>
          <motion.path d={mouthD} fill="none" stroke={shade(m.color, 0.75)} strokeWidth="1.2" opacity=".6" />
          <path d={`M-9 ${12 + m.thick}Q0 ${17 + m.thick} 9 ${12 + m.thick}`} stroke={skin[1]} strokeWidth="2" fill="none" opacity=".4" strokeLinecap="round" />
        </g>

        <FacialHair spec={spec} id={uid} layer="over" />
        <Glasses spec={spec} />
        <Extras spec={spec} />

        {/* nervous sweat */}
        {expression === 'nervous' && (
          <motion.g style={{ transform: sweatT, opacity: sweatO }}>
            <path d={`M${200 + fw - 14} 150C${200 + fw - 8} 160 ${200 + fw - 4} 166 ${200 + fw - 14} 170C${200 + fw - 24} 166 ${200 + fw - 20} 160 ${200 + fw - 14} 150Z`} fill="#bfe3f0" opacity=".85" />
          </motion.g>
        )}

        <Hair id={uid} spec={spec} layer="front" fw={fw} />

        {/* the lamp: warm light from one side, falling into shadow on the other */}
        <motion.path d={face} fill={`url(#${uid}-light)`} initial={false} animate={{ opacity: 0.25 + lit * 0.6 }} transition={{ duration: 0.4 }} />
        <motion.path d={face} fill="none" stroke={`url(#${uid}-rim)`} strokeWidth="3.5" initial={false} animate={{ opacity: 0.35 + lit * 0.65 }} transition={{ duration: 0.4 }} />
      </motion.g>
    </svg>
  )
}

export default memo(Character)
export { EXPRESSIONS, NEUTRAL }
