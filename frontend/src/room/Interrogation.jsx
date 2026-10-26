import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiSend } from 'react-icons/fi'
import { errorText } from '../api'
import Character from '../characters/Character'
import { demeanorFrom } from '../characters/specs'
import { Spinner, inputClass } from '../components/ui'
import { cx, exhibitLetter } from '../lib'
import { LampLight, RainWindow } from '../scene/Atmosphere'
import { useSound } from '../sound'
import { useToast } from '../toast'

const STOP = new Set('a an and are about as at be did do does for from have how i is it me my of on or so tell that the their they this to was were what which who why with you your'.split(' '))
const stems = (text) => text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.slice(0, 5))

/** Which topic is a typed question about? Matches its words to each topic's question; null if none fits. */
export function topicFor(question, topics, labels) {
  const asked = new Set(stems(question))
  let best = null, top = 0
  for (const t of topics) {
    const score = stems(`${labels[t] ?? ''} ${t}`).filter((w) => asked.has(w)).length
    if (score > top) { best = t; top = score }
  }
  return best
}

/** Types an answer out like a statement being taken down. Calls onDone when finished. */
function Typed({ text, live, onDone, onTick }) {
  const [n, setN] = useState(live ? 0 : text.length)
  useEffect(() => {
    if (!live) return undefined
    let i = 0
    const id = setInterval(() => {
      i += 2
      setN(i)
      if (i % 24 === 0) onTick?.()
      if (i >= text.length) { clearInterval(id); onDone?.() }
    }, 24)
    return () => clearInterval(id)
  }, [text, live]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{text.slice(0, n)}{n < text.length && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[#241b10]" />}</>
}

export default function Interrogation({ room, me, suspectId, transcript, actions, reduce }) {
  const toast = useToast()
  const { play } = useSound()
  const [waiting, setWaiting] = useState(false)
  const [own, setOwn] = useState('')
  const [talking, setTalking] = useState(null) // id of the message being typed
  const [shown, setShown] = useState(null) // { evidence, until }
  const [reacting, setReacting] = useState(false)
  const seen = useRef(new Set())
  const endRef = useRef(null)
  const suspect = room.case.suspects.find((s) => s.id === suspectId)
  const labels = room.case.topic_labels ?? {}
  const exhibits = room.journal.evidence
  const messages = transcript.filter((m) => m.suspect === suspectId)
  const demeanor = demeanorFrom(suspect?.personality)

  // A newly arrived answer is typed out; one already on the record just appears.
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last) return
    if (!seen.current.has(last.id)) {
      seen.current.add(last.id)
      if (last.source !== 'record' && !reduce) setTalking(last.id)
      if (last.kind === 'present') { setReacting(true); setTimeout(() => setReacting(false), 3200) }
    }
  }, [messages, reduce])
  useEffect(() => { messages.forEach((m) => { if (m.source === 'record') seen.current.add(m.id) }) }, [suspectId]) // eslint-disable-line
  const scroll = () => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  useEffect(() => { scroll() }, [messages.length, waiting])

  async function run(fn, ev) {
    setWaiting(true)
    if (ev) { setShown({ evidence: ev }); play('paper') }
    try { await fn() } catch (e) { toast(errorText(e), 'error'); setShown(null) } finally { setWaiting(false); if (ev) setTimeout(() => setShown(null), 4200) }
  }
  const ask = (topic, question) => { play('tap'); return run(async () => { await actions.ask(suspectId, topic, question); setOwn('') }) }

  if (!suspect) return null
  // Expression comes from the person's temperament and from what the player just did, never from whether they are lying.
  const expression = waiting ? 'thinking' : talking ? demeanor.idle : reacting ? demeanor.onEvidence : messages.length ? demeanor.idle : 'listening'
  const look = shown ? 'down' : waiting ? 'away' : 'player'
  const shownItem = shown && exhibits.find((e) => e.id === shown.evidence)

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* the room */}
      <div className="relative min-h-[360px] overflow-hidden border-b border-hairline bg-[#05070b] lg:min-h-[calc(100dvh-7.5rem)] lg:border-b-0 lg:border-r">
        <RainWindow className="absolute inset-x-0 top-0 h-[55%] opacity-60" mullions={false} rain={false} />
        <LampLight x="72%" dust strength={0.7} />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,transparent_30%,rgb(0_0_0/.75))]" />
        <motion.div className="absolute inset-x-0 bottom-[78px] top-2 mx-auto w-full max-w-[460px]" animate={{ x: waiting ? -6 : 0 }} transition={{ duration: 0.8 }}>
          <Character id={suspect.id} name={suspect.name} personality={suspect.personality} expression={expression} speaking={Boolean(talking)} look={look} lit={0.75} lightFrom="right" className="h-full w-full" />
        </motion.div>
        {/* the desk */}
        <div className="absolute inset-x-0 bottom-0 h-[92px] border-t border-brass-dim/50 bg-gradient-to-b from-[#2a1d12] to-[#120b07] shadow-[0_-20px_40px_rgb(0_0_0/.6)]">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-brass/50" />
          <AnimatePresence>
            {shownItem && (
              <motion.div key={shownItem.id} initial={{ x: 140, y: 40, opacity: 0, rotate: 12 }} animate={{ x: 0, y: -26, opacity: 1, rotate: -4 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                className="paper absolute left-1/2 top-0 w-[210px] -translate-x-1/2 px-3 pb-3 pt-3 font-type">
                <p className="text-xs font-bold">Exhibit {exhibitLetter(exhibits.indexOf(shownItem))}</p>
                <p className="text-[13px] font-bold leading-tight">{shownItem.name}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="absolute left-4 top-4 rounded-sm bg-black/55 px-3 py-1.5 backdrop-blur-sm">
          <p className="font-display text-xl leading-tight">{suspect.name}</p>
          <p className="text-xs text-ash">{suspect.role}</p>
        </div>
        {waiting && <p role="status" className="absolute bottom-[104px] left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 font-hand text-[22px] text-brass-light backdrop-blur">{suspect.name.split(' ')[0]} is thinking<span className="inline-block animate-pulse">…</span></p>}
      </div>

      {/* the notepad and questions */}
      <div className="flex min-h-[460px] flex-col bg-[#0a0e15]/90 lg:max-h-[calc(100dvh-7.5rem)]">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" role="log" aria-label={`Interview with ${suspect.name}`}>
          {messages.length === 0 && !waiting && (
            <p className="py-8 text-center font-hand text-[26px] leading-snug text-ash">{suspect.name} is waiting across the desk. Start with where they were.</p>
          )}
          <div className="space-y-5">
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <p className="font-hand text-[22px] leading-tight text-brass-light">
                  {m.by && m.by !== me ? `${m.by}: ` : ''}{m.prompt}
                </p>
                <div className="paper relative px-4 py-3 text-[15px] leading-relaxed" style={{ rotate: `${(m.id.length % 3 - 1) * 0.3}deg` }}>
                  <Typed text={m.answer} live={talking === m.id} onTick={scroll} onDone={() => setTalking((t) => (t === m.id ? null : t))} />
                  {m.source === 'ai' && <span className="mt-1.5 block font-type text-[11px] text-paper-ink/60">Worded by the AI, facts from the case file</span>}
                </div>
              </motion.div>
            ))}
            {waiting && <div className="flex items-center gap-2 text-sm text-ash" role="status"><Spinner className="text-brass" />Waiting for an answer</div>}
          </div>
          <div ref={endRef} />
        </div>

        <div className="space-y-4 border-t border-hairline p-4 sm:px-6">
          <div>
            <p className="mb-2 font-hand text-[22px] leading-none text-bone/80">Ask</p>
            <div className="flex flex-wrap gap-2">
              {room.case.topics.map((t, i) => (
                <button key={t} type="button" disabled={waiting} onClick={() => ask(t)}
                  className="paper rounded-[2px] px-3 py-1.5 font-type text-[12.5px] font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50" style={{ rotate: `${[-1, 0.8, -0.4, 1.1][i % 4]}deg` }}>
                  {labels[t] ?? t}
                </button>
              ))}
            </div>
          </div>
          {exhibits.length > 0 && (
            <div>
              <p className="mb-2 font-hand text-[22px] leading-none text-bone/80">Put an exhibit on the desk</p>
              <div className="flex flex-wrap gap-2">
                {exhibits.map((e, i) => (
                  <button key={e.id} type="button" disabled={waiting} onClick={() => run(() => actions.present(suspectId, e.id), e.id)}
                    className="rounded-[2px] border border-brass-dim bg-brass/10 px-3 py-1.5 text-xs font-semibold hover:bg-brass/20 disabled:opacity-50">
                    {exhibitLetter(i)}. {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); const q = own.trim(); if (!q) return
            const topic = topicFor(q, room.case.topics, labels)
            if (topic) ask(topic, q)
            else toast('They can only answer the questions above. Pick one, or reword yours.', 'warn') }} className="flex gap-2">
            <label className="sr-only" htmlFor="own-q">Ask in your own words</label>
            <input id="own-q" className={inputClass} value={own} maxLength={200} onChange={(e) => setOwn(e.target.value)} placeholder="Or type it your way, like “tell me about the money”" />
            <button type="submit" disabled={waiting || !own.trim()} aria-label="Send question" className="grid w-11 shrink-0 place-items-center rounded-md bg-brass text-soot hover:bg-brass-light disabled:opacity-40">
              <FiSend aria-hidden="true" className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
