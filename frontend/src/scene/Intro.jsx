import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mark, Wordmark } from '../brand/Logo'
import { useSound } from '../sound'
import { Desk, LampLight, RainWindow } from './Atmosphere'

const KEY = 'casefile-intro-seen'

export function shouldPlayIntro() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try { return sessionStorage.getItem(KEY) !== '1' } catch { return true }
}
const markSeen = () => { try { sessionStorage.setItem(KEY, '1') } catch { /* storage unavailable */ } }

const TAGLINE = 'EVERYONE HAS A SECRET.'

/** A cut manila folder. Closed, it carries the logo; open, it shows the first page. */
function Folder({ stage, opening }) {
  return (
    <div className="relative" style={{ width: 'min(80vw, 520px)', aspectRatio: '1.36', perspective: 1600 }}>
      {/* back panel and loose pages */}
      <div className="absolute inset-0 rounded-[6px] shadow-[0_40px_60px_-20px_rgb(0_0_0/.9)]" style={{ background: 'linear-gradient(135deg,#b79d68,#9c8352)' }} />
      <motion.div className="absolute inset-x-[5%] inset-y-[4%] rounded-[2px] bg-[#e9e0c8]" animate={{ y: opening ? -26 : 0, rotate: opening ? -1.5 : 0 }} transition={{ duration: 0.9, delay: 0.25 }}
        style={{ boxShadow: '0 2px 6px rgb(0 0 0 / .4)' }}>
        <p className="p-5 font-type text-[13px] leading-relaxed text-[#2a2218]">
          CASE FILE No. 0417<br />STATUS: OPEN<br />SUSPECTS: 4<br />THE VICTIM CANNOT SPEAK.<br />THE REST OF THEM WILL.
        </p>
      </motion.div>
      <motion.div className="absolute inset-x-[3%] inset-y-[3%] rounded-[2px] bg-[#f0e8d2]" animate={{ y: opening ? -12 : 0, rotate: opening ? 1 : 0 }} transition={{ duration: 0.9, delay: 0.15 }}
        style={{ boxShadow: '0 1px 4px rgb(0 0 0 / .35)', zIndex: 1 }} />

      {/* cover */}
      <motion.div
        className="absolute inset-0 rounded-[6px]"
        style={{ transformOrigin: 'left center', zIndex: 2, background: 'linear-gradient(135deg,#d6c18f 0%,#c3aa74 52%,#ad9360 100%)', boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / .18), inset 0 -40px 60px -40px rgb(80 55 20 / .5), 0 24px 40px -18px rgb(0 0 0 / .8)' }}
        animate={{ rotateY: opening ? -158 : 0 }}
        transition={{ duration: 1.1, ease: [0.6, 0.05, 0.2, 1] }}
      >
        <div className="absolute inset-0 rounded-[6px] opacity-[0.22] mix-blend-multiply" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {/* tab */}
        <div className="absolute -top-[22px] left-[6%] flex h-[26px] w-[36%] items-center rounded-t-[5px] px-3 font-type text-[11px] font-bold tracking-wider text-[#3a2c18]" style={{ background: 'linear-gradient(135deg,#d6c18f,#c3aa74)' }}>
          CASE No. 0417
        </div>
        <p className="absolute left-[7%] top-[7%] font-type text-[11px] tracking-[0.18em] text-[#4a3a22]/80">PRIVATE INVESTIGATIONS · EYES ONLY</p>

        {/* the logo is stamped onto the cover */}
        <motion.div className="absolute inset-0 grid place-items-center" initial={{ opacity: 0, scale: 1.9, rotate: -9 }}
          animate={stage >= 3 ? { opacity: 1, scale: 1, rotate: -2 } : {}} transition={{ type: 'spring', stiffness: 520, damping: 26, mass: 0.9 }}>
          <div className="ink-stamp flex flex-col items-center gap-3 text-[#2b1d12]" style={{ opacity: 0.92 }}>
            <Mark size={92} />
            <Wordmark height={34} rough />
          </div>
        </motion.div>
        <motion.span className="absolute right-[7%] top-[13%] rounded-[3px] border-[3px] border-[#8a1e2b] px-3 py-1 font-type text-lg font-bold tracking-[0.2em] text-[#8a1e2b]"
          initial={{ opacity: 0, scale: 1.6, rotate: 14 }} animate={stage >= 4 ? { opacity: 0.85, scale: 1, rotate: 9 } : {}} transition={{ type: 'spring', stiffness: 420, damping: 24 }}>
          CLASSIFIED
        </motion.span>
        {/* string tie */}
        <span aria-hidden="true" className="absolute bottom-[8%] right-[6%] size-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#e8d9ae,#9a7f4a)] shadow-[0_2px_4px_rgb(0_0_0/.5)]" />
        <svg aria-hidden="true" viewBox="0 0 100 40" className="absolute bottom-[3%] right-[10%] w-[24%]"><path d="M96 4C70 8 50 28 6 34M96 4C80 22 60 14 30 22" stroke="#8a6f3a" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
      </motion.div>
    </div>
  )
}

/**
 * The opening scene: rain on a window, a dark desk, a case file slides in, the lamp comes on,
 * the logo is stamped, and the player opens the case. Always skippable, and it only plays once per visit.
 */
export default function Intro({ onDone }) {
  const [stage, setStage] = useState(0) // 0 dark, 1 window, 2 folder, 3 lamp + stamp, 4 classified, 5 tagline, 6 ready
  const [opening, setOpening] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])
  const { play } = useSound()
  const buttonRef = useRef(null)

  const finish = useCallback(() => {
    markSeen()
    setLeaving(true)
    setTimeout(onDone, 700)
  }, [onDone])

  useEffect(() => {
    const at = (ms, fn) => timers.current.push(setTimeout(fn, ms))
    at(300, () => setStage(1))
    at(1500, () => setStage(2))
    at(3000, () => { setStage(3); play('lamp') })
    at(3700, () => { play('stamp') })
    at(4200, () => setStage(4))
    at(5000, () => setStage(5))
    at(6100, () => setStage(6))
    return () => timers.current.forEach(clearTimeout)
  }, [play])

  useEffect(() => { if (stage === 6) buttonRef.current?.focus() }, [stage])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  function open() {
    if (opening) return
    setOpening(true)
    play('paper')
    setTimeout(finish, 1100)
  }

  return (
    <AnimatePresence>
      {!leaving ? (
        <motion.div key="intro" className="fixed inset-0 z-[90] overflow-hidden bg-black" role="dialog" aria-label="Casefile introduction"
          initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.7 }}>
          <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: stage >= 1 ? 0.7 : 0 }} transition={{ duration: 1.6 }}>
            <RainWindow className="absolute inset-x-0 top-0 h-[74%]" />
          </motion.div>
          <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: stage >= 3 ? 1 : 0 }} transition={{ duration: 1.4 }}>
            <LampLight x="62%" />
          </motion.div>
          <Desk className="h-[44%]" />
          {/* the lamp */}
          <motion.div className="absolute right-[9%] top-0 w-[110px] origin-top" initial={{ opacity: 0, y: -30 }} animate={{ opacity: stage >= 2 ? 1 : 0, y: 0 }} transition={{ duration: 1 }}>
            <svg viewBox="0 0 110 90" aria-hidden="true">
              <path d="M55 0V16" stroke="#1a1410" strokeWidth="3" />
              <path d="M12 74C14 40 36 18 55 18S96 40 98 74Z" fill="#14301f" stroke="#0a1a11" />
              <path d="M22 70C26 46 42 28 55 26" stroke="#3f7a56" strokeWidth="3" fill="none" opacity={stage >= 3 ? 0.8 : 0.2} />
              <ellipse cx="55" cy="75" rx="43" ry="6" fill={stage >= 3 ? '#ffd48a' : '#2a2216'} style={{ transition: 'fill 1s' }} />
            </svg>
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
          <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 1 }} animate={{ opacity: stage >= 3 ? 0.08 : stage >= 1 ? 0.5 : 1 }} transition={{ duration: 1.4 }} />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            <motion.div initial={{ y: '90vh', rotate: 9, opacity: 0 }} animate={stage >= 2 ? { y: 0, rotate: -2.5, opacity: 1 } : {}} transition={{ duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }} className="mt-[6vh]">
              <Folder stage={stage} opening={opening} />
            </motion.div>

            <p className="mt-9 h-6 font-type text-[clamp(0.85rem,2.2vw,1.1rem)] font-bold tracking-[0.5em] text-bone/90 text-glow" aria-live="polite">
              {TAGLINE.split('').map((ch, i) => (
                <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: stage >= 5 ? 1 : 0 }} transition={{ delay: i * 0.045, duration: 0.2 }}>{ch === ' ' ? ' ' : ch}</motion.span>
              ))}
            </p>

            <motion.button ref={buttonRef} type="button" onClick={open} disabled={stage < 6 || opening}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: stage >= 6 && !opening ? 1 : 0, y: 0 }} transition={{ duration: 0.5 }}
              className="mt-7 rounded-md bg-brass px-7 py-3 text-[15px] font-semibold text-soot shadow-[inset_0_1px_0_rgb(255_255_255/.35),0_0_30px_rgb(217_164_65/.3)] hover:bg-brass-light disabled:pointer-events-none">
              Open the case
            </motion.button>
          </div>

          <button type="button" onClick={finish} className="absolute right-4 top-4 rounded-md border border-white/15 bg-black/40 px-3.5 py-2 text-sm text-bone/85 backdrop-blur hover:border-brass-dim hover:text-bone">
            Skip intro
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
