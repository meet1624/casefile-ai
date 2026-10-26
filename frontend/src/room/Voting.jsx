import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { errorText } from '../api'
import Character from '../characters/Character'
import { Button } from '../components/ui'
import { cx } from '../lib'
import Backdrop from '../scene/Atmosphere'
import { useSound } from '../sound'
import { useToast } from '../toast'
import Notes from './Notes'

export default function Voting({ room, me, rt }) {
  const toast = useToast()
  const { play } = useSound()
  const [pick, setPick] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState(false)
  const mine = room.players.find((p) => p.username === me)
  const voted = Boolean(mine?.voted)
  const cast = room.players.filter((p) => p.voted).length
  const chosen = room.case.suspects.find((s) => s.id === pick)

  async function vote() {
    setBusy(true)
    try { await rt.actions.vote(pick); play('stamp'); toast('Your vote is in'); setConfirm(false) } catch (e) { toast(errorText(e), 'error') } finally { setBusy(false) }
  }
  async function close() {
    setBusy(true)
    try { await rt.actions.closeVoting() } catch (e) { toast(errorText(e), 'error'); setBusy(false) }
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] pb-16">
      <Backdrop variant="quiet" />
      <main className="relative z-10 mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-medium leading-tight tracking-tight text-glow">Who did it?</h1>
        <p className="mt-1 font-hand text-[26px] text-bone/80">One vote each. Once it's stamped, it stays.</p>

        <ul className="mt-8 flex flex-wrap justify-center gap-5">
          {room.case.suspects.map((s) => (
            <li key={s.id}>
              <button type="button" disabled={voted} aria-pressed={pick === s.id} aria-label={`Accuse ${s.name}`} onClick={() => { setPick(s.id); setConfirm(false); play('paper') }}
                className={cx('relative block w-[190px] overflow-hidden rounded-[3px] border text-left transition-all disabled:cursor-default', pick === s.id ? 'border-brass shadow-[0_0_40px_rgb(217_164_65/.35)]' : 'border-hairline', pick && pick !== s.id && 'opacity-45 grayscale-[.6]')}>
                <Character id={s.id} name={s.name} personality={s.personality} look="cursor" interactive expression={pick === s.id ? 'suspicious' : 'neutral'} lit={pick === s.id ? 1 : 0.4} crop="portrait" className="block h-[250px] w-full bg-[#0b0f17]" />
                <span className="block bg-black/70 px-3 py-2"><span className="block font-display text-lg leading-tight">{s.name}</span><span className="text-xs text-ash">{s.role}</span></span>
                {pick === s.id && <span className="absolute right-2 top-2 -rotate-12 rounded-[3px] border-2 border-oxblood bg-black/40 px-2 py-0.5 font-type text-xs font-bold tracking-widest text-oxblood">ACCUSED</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          {voted ? <p role="status" className="font-hand text-[26px] text-sage">Your vote is stamped. Waiting for the others.</p>
            : confirm ? (
              <div className="paper px-6 py-4 font-type">
                <p className="text-[15px]">Accuse <b>{chosen.name}</b>? You can't change it.</p>
                <div className="mt-3 flex justify-center gap-3"><Button variant="quiet" className="!text-paper-ink" onClick={() => setConfirm(false)}>Not yet</Button><Button busy={busy} onClick={vote}>Stamp my vote</Button></div>
              </div>
            ) : <Button disabled={!pick} onClick={() => setConfirm(true)}>{pick ? `Accuse ${chosen.name}` : 'Choose a suspect'}</Button>}
          <p className="text-sm text-ash" aria-live="polite">{cast} of {room.players.length} have voted</p>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Who has voted">
            {room.players.map((p) => <li key={p.username} className={cx('rounded-full border px-3 py-1 text-sm', p.voted ? 'border-sage/60 text-sage' : 'border-hairline text-ash')}>{p.username}{p.voted ? ' ✓' : ''}</li>)}
          </ul>
          <button type="button" onClick={() => setNotes((n) => !n)} className="text-sm text-brass-light underline">{notes ? 'Hide my notes' : 'Read my notes'}</button>
        </div>
        <AnimatePresence>{notes && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-auto mt-4 max-w-2xl overflow-hidden rounded-md border border-hairline bg-black/50"><Notes room={room} feed={rt.feed} showFeed={false} /></motion.div>}</AnimatePresence>

        {room.host === me && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-hairline pt-6">
            {closing ? (
              <>
                <p className="text-sm text-ash">{cast < room.players.length ? 'Not everyone has voted. ' : ''}Close voting and reveal the answer?</p>
                <Button variant="quiet" onClick={() => setClosing(false)}>Wait</Button>
                <Button busy={busy} onClick={close}>Close and reveal</Button>
              </>
            ) : <Button variant="ghost" onClick={() => setClosing(true)}>Close voting now</Button>}
          </div>
        )}
      </main>
    </div>
  )
}
