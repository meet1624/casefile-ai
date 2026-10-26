import { useMemo } from 'react'
import { cx } from '../lib'

// A small seeded generator, so the city and the rain look the same on every render.
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

/** Night outside a window: skyline, bokeh, rain and a few drops running down the glass. */
export function RainWindow({ className = '', rain = true, mullions = true, glow = '#d9a441', style }) {
  const city = useMemo(() => {
    const r = rng(42)
    const far = Array.from({ length: 26 }, (_, i) => ({ x: i * 40 - 10, w: 30 + r() * 26, h: 90 + r() * 170 }))
    const near = Array.from({ length: 16 }, (_, i) => ({ x: i * 66 - 20, w: 50 + r() * 34, h: 140 + r() * 210 }))
    const lights = Array.from({ length: 70 }, () => ({ x: r() * 1000, y: 300 + r() * 280, r: 2 + r() * 7, warm: r() > 0.45 }))
    const drops = Array.from({ length: 22 }, () => ({ x: r() * 100, y: r() * 90, s: 2 + r() * 3, d: 7 + r() * 14, delay: -r() * 12 }))
    const streaks = Array.from({ length: 46 }, () => ({ x: r() * 100, d: 0.55 + r() * 0.6, delay: -r() * 2, o: 0.12 + r() * 0.28, h: 40 + r() * 80 }))
    return { far, near, lights, drops, streaks }
  }, [])

  return (
    <div className={cx('relative overflow-hidden', className)} style={style} aria-hidden="true">
      <svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#050912" /><stop offset=".6" stopColor="#0d1626" /><stop offset="1" stopColor="#2a2230" />
          </linearGradient>
          <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={glow} stopOpacity="0" /><stop offset="1" stopColor={glow} stopOpacity=".22" />
          </linearGradient>
          <filter id="bokeh"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="mist"><feGaussianBlur stdDeviation="1.2" /></filter>
        </defs>
        <rect width="1000" height="640" fill="url(#sky)" />
        <g filter="url(#mist)">
          {city.far.map((b, i) => <rect key={i} x={b.x} y={640 - b.h} width={b.w} height={b.h} fill="#0a111d" />)}
          {city.near.map((b, i) => <rect key={i} x={b.x} y={640 - b.h} width={b.w} height={b.h} fill="#060a12" />)}
        </g>
        <g filter="url(#bokeh)">
          {city.lights.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={l.warm ? '#ffcf8a' : '#9db8e8'} opacity={l.warm ? 0.5 : 0.32} />)}
        </g>
        <rect y="300" width="1000" height="340" fill="url(#haze)" />
        {mullions && (
          <g fill="#04060a">
            <rect x="0" y="0" width="1000" height="26" /><rect x="0" y="614" width="1000" height="26" />
            <rect x="0" y="0" width="26" height="640" /><rect x="974" y="0" width="26" height="640" />
            <rect x="486" y="0" width="28" height="640" /><rect x="0" y="302" width="1000" height="26" />
          </g>
        )}
      </svg>
      {rain && (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {city.streaks.map((s, i) => (
              <span key={i} className="cf-rain absolute top-0 w-px bg-gradient-to-b from-transparent via-[#a9c2e6] to-transparent"
                style={{ left: `${s.x}%`, height: s.h, opacity: s.o, animationDuration: `${s.d}s`, animationDelay: `${s.delay}s` }} />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0">
            {city.drops.map((d, i) => (
              <span key={i} className="cf-drop absolute rounded-full" style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.s, height: d.s * 1.5, animationDuration: `${d.d}s`, animationDelay: `${d.delay}s` }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** A warm cone of lamp light with dust turning in it. */
export function LampLight({ className = '', x = '50%', dust = true, strength = 1 }) {
  const motes = useMemo(() => {
    const r = rng(7)
    return Array.from({ length: 26 }, () => ({ l: 8 + r() * 84, t: 6 + r() * 86, s: 1.2 + r() * 2.4, d: 16 + r() * 18, dl: -r() * 20, o: 0.25 + r() * 0.5 }))
  }, [])
  return (
    <div className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true" style={{ '--lamp-x': x }}>
      <div className="absolute inset-0" style={{ opacity: strength, background: `radial-gradient(ellipse 52% 70% at ${x} 0%, rgb(255 196 107 / 0.30), rgb(255 196 107 / 0.08) 45%, transparent 72%)`, mixBlendMode: 'screen' }} />
      <div className="absolute inset-x-0 top-0 h-full" style={{ opacity: strength, left: 0, background: `linear-gradient(180deg, rgb(255 205 130 / .18), transparent 78%)`, clipPath: `polygon(calc(${x} - 4%) 0, calc(${x} + 4%) 0, calc(${x} + 30%) 100%, calc(${x} - 30%) 100%)`, filter: 'blur(14px)', mixBlendMode: 'screen' }} />
      {dust && (
        <div className="absolute inset-0" style={{ WebkitMaskImage: `radial-gradient(ellipse 45% 75% at ${x} 25%, #000 25%, transparent 78%)`, maskImage: `radial-gradient(ellipse 45% 75% at ${x} 25%, #000 25%, transparent 78%)` }}>
          {motes.map((m, i) => (
            <span key={i} className="cf-mote absolute rounded-full bg-[#ffe2b0]" style={{ left: `${m.l}%`, top: `${m.t}%`, width: m.s, height: m.s, opacity: m.o, animationDuration: `${m.d}s`, animationDelay: `${m.dl}s` }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** The desk surface in the foreground. */
export function Desk({ className = '', children }) {
  return (
    <div className={cx('absolute inset-x-0 bottom-0', className)}>
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #1c120d 0%, #130b08 26%, #0a0605 100%)',
        boxShadow: 'inset 0 2px 0 rgb(217 164 65 / .16), inset 0 24px 40px -24px rgb(217 164 65 / .18)',
      }} />
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(255 255 255 / .02) 0 2px, transparent 2px 9px, rgb(0 0 0 / .12) 9px 10px)', mixBlendMode: 'overlay' }} />
      <div className="absolute inset-x-[10%] top-[6%] h-[40%] rounded-[50%] opacity-60" style={{ background: 'radial-gradient(ellipse, rgb(255 190 100 / .16), transparent 70%)', filter: 'blur(10px)' }} />
      {children}
    </div>
  )
}

/** A fixed backdrop behind a whole page. */
export default function Backdrop({ variant = 'office', className = '' }) {
  return (
    <div className={cx('pointer-events-none fixed inset-0 -z-0 overflow-hidden bg-soot', className)} aria-hidden="true">
      {variant !== 'wall' && <RainWindow mullions={false} className="absolute inset-x-0 top-0 h-[86%] opacity-[0.55]" style={{ WebkitMaskImage: 'linear-gradient(180deg,#000 55%,transparent)', maskImage: 'linear-gradient(180deg,#000 55%,transparent)' }} />}
      <LampLight x={variant === 'office' ? '74%' : '50%'} strength={variant === 'quiet' ? 0.6 : 1} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgb(2 3 6 / .78) 100%)' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-soot/55 via-transparent to-soot/90" />
    </div>
  )
}
