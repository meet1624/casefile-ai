import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiAlertTriangle, FiCheck } from 'react-icons/fi'
import Character from '../characters/Character'
import { cx } from '../lib'
import { useSound } from '../sound'

/** The suspects, standing under the lamps. Pointing at one lights them and draws their eyes to you. */
export default function Lineup({ room, sel, onPick }) {
  const { play } = useSound()
  const [hot, setHot] = useState(null)
  const [notice, setNotice] = useState({})
  const { statements, contradictions } = room.journal
  const focus = hot ?? null

  return (
    <section aria-label="Suspect lineup" className="relative">
      <p className="px-5 pt-6 font-hand text-[28px] text-bone/85 sm:px-8">Who do you want in the room?</p>
      <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-4 pt-2 sm:justify-center sm:gap-6 sm:px-8" onPointerLeave={() => setHot(null)}>
        {room.case.suspects.map((s) => {
          const talked = new Set(statements.filter((st) => st.suspect === s.id).map((st) => st.topic)).size
          const caught = contradictions.some((c) => c.suspect === s.id)
          const lit = focus === s.id ? 1 : sel === s.id && !focus ? 0.85 : focus ? 0.12 : 0.4
          return (
            <li key={s.id} className="snap-center">
              <motion.button
                type="button" aria-label={`Interview ${s.name}, ${s.role}`} aria-pressed={sel === s.id}
                onPointerEnter={() => { setHot(s.id); setNotice((n) => ({ ...n, [s.id]: (n[s.id] ?? 0) + 1 })) }}
                onFocus={() => setHot(s.id)} onBlur={() => setHot(null)}
                onClick={() => { play('paper'); onPick(s.id) }}
                className="group relative block w-[200px] text-left sm:w-[230px]"
                animate={{ y: focus === s.id ? -10 : 0, opacity: focus && focus !== s.id ? 0.55 : 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-2 mx-auto h-[300px] w-full" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 0%, rgb(255 214 140 / .16), transparent 70%)', opacity: lit }} />
                <Character id={s.id} name={s.name} personality={s.personality} look="cursor" interactive lit={lit} notice={notice[s.id] ?? 0}
                  expression={focus === s.id ? 'listening' : 'neutral'} className="relative block h-[330px] w-full" />
                <span className="relative -mt-1 block border-t border-brass-dim/60 bg-gradient-to-b from-black/70 to-black/30 px-3 pb-3 pt-2.5 backdrop-blur-sm">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg leading-tight">{s.name}</span>
                    {caught && <FiAlertTriangle aria-label="Caught in a contradiction" className="size-4 shrink-0 text-oxblood" />}
                  </span>
                  <span className="block text-[13px] text-ash">{s.role}</span>
                  <span className={cx('mt-1.5 flex items-center gap-1.5 text-xs', talked ? 'text-brass-light' : 'text-ash/80')}>
                    {talked ? <><FiCheck aria-hidden="true" />Interviewed · {talked} {talked === 1 ? 'topic' : 'topics'}</> : 'Not yet interviewed'}
                  </span>
                  <span className="mt-1 block min-h-[2.4em] font-hand text-[19px] leading-[1.05] text-bone/0 transition-colors group-hover:text-bone/90 group-focus-visible:text-bone/90 [@media(hover:none)]:text-bone/75">{s.personality}</span>
                </span>
              </motion.button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
