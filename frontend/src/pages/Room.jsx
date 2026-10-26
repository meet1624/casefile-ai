import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorText } from '../api'
import { useAuth } from '../auth'
import { Button, FullPageSpinner, Notice } from '../components/ui'
import { useToast } from '../toast'
import { useRoom } from '../useRoom'
import Briefing from '../room/Briefing'
import Investigation from '../room/Investigation'
import Reveal from '../room/Reveal'
import RoomHeader from '../room/RoomHeader'
import Voting from '../room/Voting'
import WaitingRoom from '../room/WaitingRoom'

export default function Room() {
  const { code: raw } = useParams()
  const code = raw.toUpperCase()
  const { user } = useAuth()
  const toast = useToast()
  const rt = useRoom(code, user.username)
  const [brief, setBrief] = useState(false)
  const [joining, setJoining] = useState(false)
  const { room, problem } = rt

  if (problem === 'missing') {
    return (
      <main className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Room {code}</h1>
        <p className="mt-3 text-ash">This room doesn't exist, or you haven't joined it yet. If a friend gave you this code, join with it.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button busy={joining} onClick={async () => { setJoining(true); try { await rt.actions.join() } catch (e) { toast(errorText(e), 'error') } finally { setJoining(false) } }}>Join this room</Button>
          <Link to="/lobby" className="rounded-md border border-hairline px-4 py-2.5 text-sm font-semibold hover:border-brass-dim">Back to the lobby</Link>
        </div>
      </main>
    )
  }
  if (problem && !room) return <main className="mx-auto max-w-md px-5 py-24"><Notice>{problem}</Notice></main>
  if (!room) return <FullPageSpinner label="Opening the case file…" />

  const me = user.username
  return (
    <>
      <RoomHeader room={room} live={rt.live} onBriefing={room.phase === 'lobby' ? null : () => setBrief(true)} />
      {room.phase === 'lobby' && <WaitingRoom room={room} me={me} actions={rt.actions} />}
      {room.phase === 'investigation' && <Investigation room={room} me={me} rt={rt} />}
      {room.phase === 'voting' && <Voting room={room} me={me} rt={rt} />}
      {room.phase === 'reveal' && room.result && <Reveal room={room} me={me} rt={rt} />}
      <Briefing open={brief} onClose={() => setBrief(false)} data={room.case} />
    </>
  )
}
