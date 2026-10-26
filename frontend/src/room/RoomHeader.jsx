import { Link } from 'react-router-dom'
import { FiBookOpen, FiChevronLeft, FiCopy } from 'react-icons/fi'
import { Button } from '../components/ui'
import { PHASE_LABEL, cx, initials } from '../lib'
import { useToast } from '../toast'

export function PlayerDots({ players, host }) {
  return (
    <ul className="flex items-center -space-x-2" aria-label="Players in this room">
      {players.map((p) => (
        <li key={p.username} className="relative" aria-label={`${p.username}${p.username === host ? ', host' : ''}, ${p.online ? 'online' : 'offline'}`} title={`${p.username}${p.username === host ? ' (host)' : ''}: ${p.online ? 'online' : 'offline'}`}>
          <span className={cx('grid size-9 place-items-center rounded-full border-2 border-soot bg-slate-2 text-xs font-semibold', p.online ? 'text-bone' : 'text-ash')}>{initials(p.username)}</span>
          <span aria-hidden="true" className={cx('absolute -bottom-px -right-px size-2.5 rounded-full border-2 border-soot', p.online ? 'bg-sage' : 'bg-hairline')} />
        </li>
      ))}
    </ul>
  )
}

export default function RoomHeader({ room, live, onBriefing }) {
  const toast = useToast()
  async function copy() {
    try {
      await navigator.clipboard.writeText(room.code)
      toast('Room code copied')
    } catch {
      toast(`Copy didn't work. The code is ${room.code}.`, 'warn')
    }
  }
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-hairline bg-soot/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-3 sm:px-6">
          <Link to="/lobby" aria-label="Back to the lobby" className="grid size-9 shrink-0 place-items-center rounded-md text-ash hover:bg-white/5 hover:text-bone">
            <FiChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-medium leading-tight">{room.case.title}</p>
            <p className="text-xs text-ash">{PHASE_LABEL[room.phase]}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block"><PlayerDots players={room.players} host={room.host} /></div>
            <button type="button" onClick={copy} aria-label={`Copy room code ${room.code}`}
              className="inline-flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm hover:border-brass-dim">
              <span className="font-display text-[15px] tracking-[0.2em]">{room.code}</span>
              <FiCopy aria-hidden="true" className="size-3.5 text-ash" />
            </button>
            {onBriefing && (
              <Button variant="ghost" icon={FiBookOpen} onClick={onBriefing} aria-label="Read the case briefing">
                <span className="hidden md:inline">Case briefing</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      {!live && (
        <p role="status" className="border-b border-brass-dim/40 bg-brass/10 px-4 py-2 text-center text-sm">
          Live updates paused. Reconnecting, and your room will catch up on its own.
        </p>
      )}
    </>
  )
}
