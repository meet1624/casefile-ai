import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiRotateCcw } from 'react-icons/fi'
import { errorText } from '../api'
import Character from '../characters/Character'
import { Button } from '../components/ui'
import { cx } from '../lib'
import Backdrop from '../scene/Atmosphere'
import { useSound } from '../sound'
import { useToast } from '../toast'

/** Stages: 0 hush, 1 the votes, 2 the culprit, 3 the full file. Everything shown comes from the server's result. */
export default function Reveal({ room, me, rt }) {
  const toast = useToast()
  const { play } = useSound()
  const reduce = useReducedMotion()
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(reduce ? 3 : 0)
  const r = room.result
  const suspects = room.case.suspects
  const culprit = suspects.find((s) => s.id === r.solution.culprit)
  const name = (id) => suspects.find((s) => s.id === id)?.name ?? id
  const anyVotes = r.votes.length > 0
  const headline = !anyVotes ? 'Nobody voted.' : r.tie || !r.verdict ? 'The room could not agree.' : r.correct ? 'Case closed. You got them.' : `The room accused ${name(r.verdict)}. Wrong.`
  const best = Math.max(1, ...r.scores.map((s) => s.score))

  useEffect(() => {
    if (reduce || stage >= 3) return undefined
    const t = setTimeout(() => setStage((s) => s + 1), [1800, 3200, 3600][stage])
    return () => clearTimeout(t)
  }, [stage, reduce])
  useEffect(() => { if (stage === 2) play('sting'); if (stage === 3) play(r.correct ? 'chime' : 'stamp') }, [stage]) // eslint-disable-line

  async function replay() {
    setBusy(true)
    try { await rt.actions.replay() } catch (e) { toast(errorText(e), 'error'); setBusy(false) }
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden pb-20">
      <Backdrop variant="quiet" />
      <AnimatePresence>
        {stage < 3 && (
          <motion.div key="stage" exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#030509] px-6 text-center" role="status" aria-live="polite">
            <button type="button" onClick={() => setStage(3)} className="absolute right-5 top-5 rounded-md border border-hairline px-3.5 py-2 text-sm text-ash hover:text-bone">Skip</button>
            <AnimatePresence mode="wait">
              {stage === 0 && <motion.p key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-hand text-[clamp(2rem,6vw,3.6rem)] text-bone/90">The votes are in.</motion.p>}
              {stage === 1 && (
                <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-md">
                  <p className="font-hand text-[34px] text-brass-light">The room says…</p>
                  <ul className="mt-5 space-y-2">
                    {anyVotes ? r.votes.map((v, i) => (
                      <motion.li key={v.username} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.35 }} className="flex justify-between gap-8 border-b border-hairline/60 pb-1.5 font-type text-lg"><span>{v.username}</span><span className="text-oxblood">{name(v.suspect)}</span></motion.li>
                    )) : <li className="font-type text-lg text-ash">No votes were cast.</li>}
                  </ul>
                </motion.div>
              )}
              {stage === 2 && (
                <motion.div key="c" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }} className="relative">
                  <p className="font-hand text-[30px] text-bone/80">It was…</p>
                  <div className="relative mx-auto mt-2 h-[360px] w-[300px] overflow-hidden rounded-[3px] bg-[#0b0f17] shadow-[0_0_80px_rgb(196_71_63/.35)]">
                    <Character id={culprit.id} name={culprit.name} personality={culprit.personality} expression="revealing" look="player" lit={1} crop="portrait" className="h-full w-full" />
                  </div>
                  <h2 className="mt-4 font-display text-4xl">{culprit.name}</h2>
                  <motion.span initial={{ scale: 2.6, opacity: 0, rotate: -22 }} animate={{ scale: 1, opacity: 0.95, rotate: -12 }} transition={{ delay: 1.6, type: 'spring', stiffness: 300, damping: 16 }} className="absolute right-[-30px] top-24 rounded-[3px] border-4 border-oxblood px-3 py-1 font-type text-3xl font-bold tracking-widest text-oxblood">GUILTY</motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <h1 className={cx('font-display text-[clamp(2.2rem,6vw,4rem)] font-medium leading-tight tracking-tight text-glow', r.correct ? 'text-brass-light' : 'text-bone')}>{headline}</h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="paper relative flex flex-col gap-6 p-6 font-type sm:flex-row sm:p-9" style={{ rotate: '-0.3deg' }}>
            <div className="relative h-[220px] w-[170px] shrink-0 self-center overflow-hidden bg-[#0b0f17] shadow-[0_0_0_4px_#e6dec9,0_14px_26px_-10px_rgb(0_0_0/.8)] sm:self-start">
              <Character id={culprit.id} name={culprit.name} personality={culprit.personality} expression="revealing" look="player" lit={1} crop="portrait" className="h-full w-full" />
              <span className="absolute inset-x-0 bottom-3 -rotate-6 text-center font-type text-xl font-bold tracking-widest text-oxblood [text-shadow:0_0_6px_#000]">GUILTY</span>
            </div>
            <div>
              <p className="text-sm italic opacity-70">The culprit</p>
              <h2 className="font-display text-3xl font-semibold leading-tight">{culprit.name}</h2>
              <dl className="mt-5 space-y-4 text-[14.5px] leading-relaxed">
                <div><dt className="font-bold">Motive</dt><dd>{r.solution.motive}</dd></div>
                <div><dt className="font-bold">Method</dt><dd>{r.solution.method}</dd></div>
                <div><dt className="font-bold">How it fits together</dt><dd>{r.solution.explanation}</dd></div>
              </dl>
              <p className="mt-5 text-sm italic opacity-70">The room found {r.key_evidence_found} of the key clues.</p>
            </div>
          </article>

          <div className="space-y-5">
            <section className="rounded-md border border-hairline bg-black/55 backdrop-blur" aria-labelledby="sb">
              <h2 id="sb" className="border-b border-hairline px-4 py-3 font-hand text-[26px] leading-none">Scoreboard</h2>
              <ol className="divide-y divide-hairline">
                {[...r.scores].sort((a, b) => b.score - a.score).map((s) => (
                  <li key={s.username} className="px-4 py-3">
                    <div className="flex items-baseline justify-between"><span>{s.username}{s.username === me && <span className="text-sm text-ash"> (you)</span>}</span><span className="font-display text-2xl">{s.score}</span></div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-brass" initial={{ width: 0 }} animate={{ width: `${(s.score / best) * 100}%` }} transition={{ duration: 0.9, delay: 0.3 }} /></div>
                    <p className="mt-1.5 text-xs text-ash">{!s.voted ? 'Did not vote' : s.vote_correct ? 'Voted correctly' : 'Voted wrong'}</p>
                  </li>
                ))}
              </ol>
            </section>
            {anyVotes && (
              <section className="rounded-md border border-hairline bg-black/55 backdrop-blur" aria-labelledby="vv">
                <h2 id="vv" className="border-b border-hairline px-4 py-3 font-hand text-[26px] leading-none">Who voted for whom</h2>
                <ul className="divide-y divide-hairline text-sm">{r.votes.map((v) => <li key={v.username} className="flex justify-between px-4 py-2.5"><span>{v.username}</span><span className="text-ash">{name(v.suspect)}</span></li>)}</ul>
              </section>
            )}
            {room.host === me
              ? <Button icon={FiRotateCcw} busy={busy} onClick={replay} className="w-full py-3">Play again</Button>
              : <p className="text-sm text-ash">{room.host} can start a new round.</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
