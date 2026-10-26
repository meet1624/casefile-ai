import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../auth'
import Polaroid from '../components/Polaroid'
import SiteHeader from '../components/SiteHeader'
import Backdrop from '../scene/Atmosphere'
import Intro, { shouldPlayIntro } from '../scene/Intro'

// The four people of the first case, pinned up. Their faces follow your cursor.
const WALL = [
  { id: 'vivian', name: 'Vivian Cross', note: 'business partner', x: 4, y: 40, r: -4 },
  { id: 'marcus', name: 'Marcus Hale', note: 'the nephew', x: 176, y: 8, r: 3 },
  { id: 'elena', name: 'Elena Voss', note: 'the curator', x: 348, y: 70, r: -2 },
  { id: 'tomas', name: 'Tomas Reyes', note: 'catering', x: 214, y: 292, r: 4 },
]
const PIN = (p) => [p.x + 74, p.y - 4]

function PinnedWall() {
  const pts = WALL.map(PIN)
  const thread = `M${pts[0]} Q${(pts[0][0] + pts[1][0]) / 2} ${pts[0][1] + 40} ${pts[1]} T${pts[2]} T${pts[3]} T${pts[0]}`
  return (
    <div className="relative h-[360px] w-[360px] sm:h-[520px] sm:w-[520px]">
      <div className="absolute left-0 top-0 h-[520px] w-[520px] origin-top-left max-sm:scale-[0.69]">
        <svg aria-hidden="true" viewBox="0 0 520 520" className="absolute inset-0 z-0 h-full w-full overflow-visible">
          <motion.path d={thread} fill="none" stroke="#b3322f" strokeWidth="2.4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.2, duration: 2.2, ease: 'easeInOut' }} style={{ filter: 'drop-shadow(0 2px 2px rgb(0 0 0 / .6))' }} />
        </svg>
        {WALL.map((p, i) => (
          <motion.div key={p.id} className="absolute z-10" style={{ left: p.x, top: p.y }} initial={{ opacity: 0, y: -30, rotate: p.r - 8 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.3 + i * 0.18, type: 'spring', stiffness: 160, damping: 17 }}>
            <Polaroid id={p.id} name={p.name} caption={p.name.split(' ')[0]} rotate={p.r} />
          </motion.div>
        ))}
        <motion.div className="absolute left-[8px] top-[330px] z-[5] w-[168px] -rotate-3 bg-[#e9dfc2] px-3 py-3 font-hand text-[22px] leading-tight text-[#2b2318] shadow-[0_14px_24px_-12px_rgb(0_0_0/.9)]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
          <span aria-hidden="true" className="absolute -top-2.5 left-5 h-5 w-14 -rotate-3 bg-brass/55" />
          Four stories. One is a lie that kills.
        </motion.div>
      </div>
    </div>
  )
}

const NOTES = [
  ['Interview', 'Ask each suspect where they were, what the victim meant to them, and what they think of the others. Everyone in your room shares the same conversation.', -1.4],
  ['Collect', 'Search the study, the cellar and every other room. Put each exhibit in front of a suspect and watch what changes.', 1.1],
  ['Accuse', 'When the team is ready, the host calls the vote. Everyone picks in secret, then the case file shows who was right, and why.', -0.8],
]

export default function Landing() {
  const { user } = useAuth()
  const [intro, setIntro] = useState(shouldPlayIntro)
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Backdrop variant="office" />
      {intro && <Intro onDone={() => setIntro(false)} />}
      <SiteHeader />
      <main className="relative z-10">
        <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32 lg:pt-12">
          <div>
            <h1 className="font-display text-[clamp(2.7rem,6.4vw,5.5rem)] font-medium leading-[1.02] tracking-tight text-glow">
              Someone in this room is lying to you.
            </h1>
            <p className="mt-7 max-w-[33rem] text-lg leading-relaxed text-bone/75">
              Casefile is a detective game for you and up to five friends. Question the suspects face to face, collect the evidence, catch one of them in a lie, then vote on who did it.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to={user ? '/lobby' : '/auth?mode=register'} className="inline-flex items-center gap-2 rounded-md bg-brass px-6 py-3.5 text-[15px] font-semibold text-soot shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_0_34px_rgb(217_164_65/.28)] hover:bg-brass-light">
                {user ? 'Go to your cases' : 'Open a case'} <FiArrowRight aria-hidden="true" />
              </Link>
              <Link to="/cast" className="inline-flex rounded-md border border-white/15 bg-black/25 px-6 py-3.5 text-[15px] font-semibold backdrop-blur hover:border-brass-dim">Meet the suspects</Link>
            </div>
            <p className="mt-6 text-sm text-ash">Free, and it runs on your own computer. Play alone or invite people with a room code.</p>
          </div>
          <div className="justify-self-center lg:justify-self-end"><PinnedWall /></div>
        </section>

        <section id="how" className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
          <h2 className="sr-only">How a case plays</h2>
          <div className="grid gap-7 md:grid-cols-3">
            {NOTES.map(([title, text, r]) => (
              <article key={title} className="paper relative px-6 pb-7 pt-8" style={{ rotate: `${r}deg` }}>
                <span aria-hidden="true" className="absolute -top-2.5 left-8 h-5 w-14 -rotate-2 bg-brass/50" />
                <h3 className="font-hand text-[34px] font-bold leading-none text-[#7a1f2b]">{title}</h3>
                <p className="mt-3 font-type text-[14px] leading-relaxed">{text}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-16 max-w-[46rem] text-center font-display text-[clamp(1.35rem,2.5vw,1.9rem)] leading-snug text-bone/90">
            Every suspect speaks from the case file. If you run a local AI model, they put it in their own words, and any answer that strays from the facts is thrown out.
          </p>
        </section>
      </main>
      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-sm text-ash">
        Casefile is a portfolio project and works offline once installed.{' '}
        <button type="button" onClick={() => { try { sessionStorage.removeItem('casefile-intro-seen') } catch { /* storage unavailable */ } setIntro(true) }} className="underline underline-offset-4 hover:text-bone">Replay the intro</button>
      </footer>
    </div>
  )
}
