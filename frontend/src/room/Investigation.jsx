import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiCheckSquare } from 'react-icons/fi'
import { errorText } from '../api'
import { Button } from '../components/ui'
import { cx } from '../lib'
import Backdrop from '../scene/Atmosphere'
import { useReducedMotion } from 'framer-motion'
import { useToast } from '../toast'
import Board from './Board'
import Interrogation from './Interrogation'
import Lineup from './Lineup'
import Notes from './Notes'

const TABS = [['lineup', 'Suspects'], ['interview', 'Interview'], ['board', 'Board'], ['notes', 'Notebook']]

export default function Investigation({ room, me, rt }) {
  const toast = useToast()
  const reduce = useReducedMotion()
  const [pane, setPane] = useState('lineup')
  const [sel, setSel] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const isHost = room.host === me

  async function callVote() {
    setBusy(true)
    try { await rt.actions.openVoting() } catch (e) { toast(errorText(e), 'error'); setBusy(false) }
  }
  const pick = (id) => { setSel(id); setPane('interview') }

  return (
    <div className="relative pb-20">
      {pane !== 'interview' && pane !== 'board' && <Backdrop variant="quiet" />}
      <nav aria-label="Sections" className="sticky top-16 z-20 border-b border-hairline bg-soot/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 px-3 sm:px-6">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" aria-current={pane === k ? 'page' : undefined} onClick={() => setPane(k)}
              className={cx('relative px-4 py-3.5 text-sm font-semibold transition-colors', pane === k ? 'text-brass-light' : 'text-ash hover:text-bone')}>
              {label}
              {pane === k && <motion.span layoutId="tab-underline" className="absolute inset-x-3 bottom-0 h-0.5 bg-brass" />}
            </button>
          ))}
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            {isHost ? (confirm ? (
              <>
                <span className="text-sm text-ash">Everyone moves to voting. Evidence is locked.</span>
                <Button variant="quiet" onClick={() => setConfirm(false)}>Keep investigating</Button>
                <Button icon={FiCheckSquare} busy={busy} onClick={callVote}>Yes, open voting</Button>
              </>
            ) : <Button variant="ghost" icon={FiCheckSquare} onClick={() => setConfirm(true)}>Call the vote</Button>)
              : <span className="text-sm text-ash">{room.host} decides when the room votes.</span>}
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-[1500px]">
        {pane === 'lineup' && <Lineup room={room} sel={sel} onPick={pick} />}
        {pane === 'interview' && (sel
          ? <Interrogation key={sel} room={room} me={me} suspectId={sel} transcript={rt.transcript} actions={rt.actions} reduce={reduce} />
          : <div className="px-6 py-20 text-center font-hand text-[28px] text-ash">Nobody is in the room. <button type="button" className="text-brass-light underline" onClick={() => setPane('lineup')}>Pick a suspect.</button></div>)}
        {pane === 'board' && <Board room={room} rt={rt} />}
        {pane === 'notes' && <div className="mx-auto max-w-2xl"><Notes room={room} feed={rt.feed} /></div>}

        {isHost && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 px-4 sm:hidden">
            {confirm ? (
              <>
                <Button variant="quiet" onClick={() => setConfirm(false)}>Keep investigating</Button>
                <Button icon={FiCheckSquare} busy={busy} onClick={callVote}>Yes, open voting</Button>
              </>
            ) : <Button variant="ghost" icon={FiCheckSquare} onClick={() => setConfirm(true)}>Call the vote</Button>}
          </div>
        )}
      </main>
    </div>
  )
}
