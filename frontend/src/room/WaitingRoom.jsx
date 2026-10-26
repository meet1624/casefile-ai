import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiCopy, FiPlay, FiStar } from 'react-icons/fi'
import { errorText } from '../api'
import CaseCover from '../components/CaseCover'
import { Button } from '../components/ui'
import { cx, initials } from '../lib'
import { useSound } from '../sound'
import { useToast } from '../toast'

/** The room code, on an evidence tag hanging from a string. */
function CodeTag({ code, onCopy }) {
  return (
    <motion.div className="relative origin-top" style={{ width: 'fit-content' }} initial={{ rotate: -9 }} animate={{ rotate: [-9, 4, -2, 1, 0] }} transition={{ duration: 2.2, ease: 'easeOut' }}>
      <svg aria-hidden="true" viewBox="0 0 200 40" className="mx-auto -mb-1 h-10 w-44"><path d="M100 36C100 14 20 4 6 0M100 36C100 14 180 4 194 0" stroke="#bfa56a" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
      <div className="relative rounded-[6px] bg-[#e9dfc2] px-9 py-7 text-[#1b160f] shadow-[0_26px_36px_-18px_rgb(0_0_0/.95)]" style={{ clipPath: 'polygon(0 18%, 8% 0, 92% 0, 100% 18%, 100% 100%, 0 100%)' }}>
        <span aria-hidden="true" className="absolute left-1/2 top-3 size-4 -translate-x-1/2 rounded-full bg-[#0a0e15] shadow-[inset_0_1px_3px_rgb(0_0_0/.8)]" />
        <p className="mt-4 text-center font-type text-[11px] font-bold tracking-[0.3em] text-[#2a2218]/70">EVIDENCE · ROOM CODE</p>
        <p className="mt-1 text-center font-type text-[clamp(2.6rem,9vw,4.4rem)] font-bold leading-none tracking-[0.18em]" aria-label={`Room code ${code.split('').join(' ')}`}>{code}</p>
        <button type="button" onClick={onCopy} className="mx-auto mt-4 flex items-center gap-2 rounded-md border-2 border-[#1b160f]/60 px-3.5 py-1.5 text-sm font-bold hover:bg-[#1b160f]/10"><FiCopy aria-hidden="true" />Copy code</button>
      </div>
    </motion.div>
  )
}

export default function WaitingRoom({ room, me, actions }) {
  const toast = useToast()
  const { play } = useSound()
  const [busy, setBusy] = useState(false)
  const isHost = room.host === me

  async function start() {
    setBusy(true)
    play('stamp')
    try { await actions.start() } catch (e) { toast(errorText(e), 'error'); setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(room.code); toast('Room code copied'); play('click') } catch { toast(`The code is ${room.code}.`, 'warn') }
  }

  return (
    <main className="relative z-10 mx-auto grid max-w-[1150px] gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-10">
        <div>
          <p className="font-hand text-[28px] text-bone/85">Send this code to the people you want in the room.</p>
          <div className="mt-4"><CodeTag code={room.code} onCopy={copy} /></div>
        </div>

        <article className="paper relative flex max-w-2xl flex-col gap-5 px-6 pb-7 pt-8 sm:flex-row sm:px-8" style={{ rotate: '-0.5deg' }}>
          <span aria-hidden="true" className="absolute -top-2.5 left-9 h-5 w-16 -rotate-2 bg-brass/55" />
          <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_3px_#1b160f] sm:w-44"><CaseCover id={room.case.id} className="h-full w-full" /></div>
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight text-[#1b160f]">{room.case.title}</h1>
            <p className="mt-1 font-type text-[13px] italic text-[#2a2218]/80">{room.case.setting}</p>
            <p className="mt-3 font-type text-[14px] leading-relaxed">{room.case.briefing}</p>
            <p className="mt-2 font-type text-[12.5px] text-[#2a2218]/75">Victim: {room.case.victim}.</p>
          </div>
        </article>
      </div>

      <div className="space-y-6">
        <section aria-labelledby="players">
          <h2 id="players" className="font-hand text-[30px] leading-none text-bone/90">Investigators ({room.players.length} of 6)</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {room.players.map((p, i) => (
                <motion.li key={p.username} layout initial={{ opacity: 0, y: -26, rotate: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, rotate: [-2, 1.5, -1][i % 3], scale: 1 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                  className="relative bg-[#e9dfc2] px-3 pb-3 pt-4 text-center text-[#1b160f] shadow-[0_16px_24px_-14px_rgb(0_0_0/.95)]">
                  <span aria-hidden="true" className="absolute -top-2 left-1/2 size-3.5 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a80,#a82f35_60%,#5a1219)]" />
                  <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-[#1b160f] font-display text-2xl text-bone">
                    {initials(p.username)}
                    <span className={cx('absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-[#e9dfc2]', p.online ? 'bg-sage' : 'bg-[#8a8372]')} title={p.online ? 'Online' : 'Offline'} />
                  </span>
                  <p className="mt-2 flex items-center justify-center gap-1 font-type text-sm font-bold">
                    {p.username}{p.username === room.host && <FiStar aria-label="Host" className="size-3.5 text-[#7a1f2b]" />}
                  </p>
                  <p className="font-type text-[11.5px] text-[#2a2218]/70">{p.username === me ? 'You' : p.online ? 'Online' : 'Offline'}</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        {isHost ? (
          <div>
            <Button icon={FiPlay} busy={busy} onClick={start} className="w-full py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/.35),0_0_34px_rgb(217_164_65/.3)]">Start the investigation</Button>
            <p className="mt-3 text-sm leading-relaxed text-bone/70">You can start now. Friends can still join with the code until you call the vote.</p>
          </div>
        ) : (
          <p role="status" className="rounded-md border border-white/15 bg-black/30 px-4 py-4 text-sm leading-relaxed text-bone/80 backdrop-blur">
            Waiting for <span className="font-semibold text-bone">{room.host}</span> to start the investigation. This screen will change by itself.
          </p>
        )}
      </div>
    </main>
  )
}
