import { useCallback, useEffect, useRef, useState } from 'react'
import { WS, errorText, getToken, http } from './api'

/**
 * Everything a room screen needs: the room, a live connection that heals itself,
 * the interview transcript, an activity feed, and the actions a player can take.
 *
 * The server is the source of truth. Every event just triggers a fresh read of the room,
 * so a missed event can never leave the screen wrong for long.
 */
export function useRoom(code, me, onEvent) {
  const [room, setRoom] = useState(null)
  const [problem, setProblem] = useState(null) // 'missing' | a message
  const [live, setLive] = useState(false)
  const [feed, setFeed] = useState([])
  const [transcript, setTranscript] = useState([])
  const [fresh, setFresh] = useState(() => new Set()) // exhibits that just arrived
  const [searched, setSearched] = useState(() => new Set()) // places searched this session

  const roomRef = useRef(null)
  const seeded = useRef(false)
  const seq = useRef(0)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const nameOfSuspect = (id) => roomRef.current?.case.suspects.find((s) => s.id === id)?.name ?? id
  const labelOfTopic = (t) => roomRef.current?.case.topic_labels?.[t] ?? t
  const nameOfExhibit = (id) => roomRef.current?.journal?.evidence.find((e) => e.id === id)?.name ?? id

  const addFeed = useCallback((text, kind = 'info') => {
    setFeed((f) => [...f.slice(-59), { id: seq.current++, text, kind, at: new Date() }])
  }, [])

  const addMessage = useCallback((m) => {
    setTranscript((t) => [...t, { id: `m${seq.current++}`, ...m }])
  }, [])

  const markFresh = useCallback((ids) => {
    setFresh((s) => new Set([...s, ...ids]))
    setTimeout(() => setFresh((s) => new Set([...s].filter((i) => !ids.includes(i)))), 5000)
  }, [])

  const applyRoom = useCallback((data) => {
    roomRef.current = data
    setRoom(data)
    setProblem(null)
    if (!seeded.current) {
      seeded.current = true
      // Coming back to a room: rebuild the conversation from the official statement log.
      const heard = data.journal?.statements ?? []
      if (heard.length) {
        setTranscript(heard.map((s) => ({
          id: `r${seq.current++}`, kind: 'record', by: null, suspect: s.suspect,
          prompt: data.case.topic_labels?.[s.topic] ?? s.topic, answer: s.text, source: 'record',
        })))
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      applyRoom((await http.get(`/rooms/${code}`)).data)
    } catch (err) {
      if (err.response?.status === 404) setProblem('missing')
      else if (!roomRef.current) setProblem(errorText(err))
    }
  }, [code, applyRoom])

  useEffect(() => {
    let stopped = false
    let ws
    let retry = 0
    let reconnect
    let pending

    const scheduleRefresh = () => { clearTimeout(pending); pending = setTimeout(refresh, 120) }

    const handle = (msg) => {
      onEventRef.current?.(msg)
      switch (msg.type) {
        case 'state':
          retry = 0
          setLive(true)
          applyRoom(msg.room)
          break
        case 'presence':
          setRoom((r) => r && { ...r, players: r.players.map((p) => ({ ...p, online: msg.online.includes(p.username) })) })
          break
        case 'player_joined':
          addFeed(`${msg.username} joined the room`)
          scheduleRefresh()
          break
        case 'phase':
          addFeed(
            { investigation: 'The investigation began', voting: 'Voting is open', reveal: 'Voting closed. The case is solved.', lobby: 'The host reopened the case' }[msg.phase],
            'phase',
          )
          scheduleRefresh()
          break
        case 'evidence_found':
          addFeed(`${msg.by} found ${msg.evidence.map((e) => e.name).join(' and ')}`, 'evidence')
          if (msg.by !== me) markFresh(msg.evidence.map((e) => e.id))
          scheduleRefresh()
          break
        case 'statement': {
          const subject = nameOfSuspect(msg.suspect)
          addFeed(
            msg.evidence
              ? `${msg.by} showed ${nameOfExhibit(msg.evidence)} to ${subject}`
              : `${msg.by} asked ${subject}: ${labelOfTopic(msg.topic)}`,
            'statement',
          )
          if (msg.by !== me) {
            addMessage({
              kind: msg.evidence ? 'present' : 'ask', by: msg.by, suspect: msg.suspect, evidence: msg.evidence ?? null,
              prompt: msg.evidence ? `Showed ${nameOfExhibit(msg.evidence)}` : labelOfTopic(msg.topic),
              answer: msg.answer, source: msg.source,
            })
          }
          scheduleRefresh()
          break
        }
        case 'vote_cast':
          addFeed(`${msg.username} voted (${msg.votes_cast} of ${msg.players})`, 'vote')
          scheduleRefresh()
          break
        default:
      }
    }

    const open = () => {
      ws = new WebSocket(`${WS}/ws/rooms/${code}`)
      ws.onopen = () => ws.send(JSON.stringify({ token: getToken() }))
      ws.onmessage = (e) => {
        try { handle(JSON.parse(e.data)) } catch { /* ignore a malformed message */ }
      }
      ws.onclose = (e) => {
        setLive(false)
        if (stopped || e.code === 4401) return
        if (e.code === 4403) { setProblem('missing'); return }
        retry += 1
        reconnect = setTimeout(open, Math.min(1000 * 2 ** retry, 10_000))
      }
    }

    refresh()
    open()
    return () => { stopped = true; clearTimeout(reconnect); clearTimeout(pending); ws?.close() }
  }, [code, me, refresh, applyRoom, addFeed, addMessage, markFresh])

  const post = useCallback(async (path, body) => (await http.post(`/rooms/${code}/${path}`, body)).data, [code])

  const actions = {
    refresh,
    async search(location) {
      const data = await post('search', { location })
      setSearched((s) => new Set([...s, location]))
      if (data.found.length) markFresh(data.found.map((e) => e.id))
      await refresh()
      return data.found
    },
    async ask(suspect, topic, question) {
      const data = await post('ask', { suspect, topic, question: question || null })
      addMessage({ kind: 'ask', by: me, suspect, prompt: question || labelOfTopic(topic), answer: data.answer, source: data.source })
      await refresh()
    },
    async present(suspect, evidence) {
      const data = await post('present', { suspect, evidence })
      addMessage({ kind: 'present', by: me, suspect, evidence, prompt: `Showed ${nameOfExhibit(evidence)}`, answer: data.answer, source: data.source })
      await refresh()
    },
    async start() { await post('start'); await refresh() },
    async openVoting() { await post('voting'); await refresh() },
    async closeVoting() { await post('reveal'); await refresh() },
    async replay() {
      await post('replay')
      setTranscript([]); setSearched(new Set()); setFresh(new Set()); seeded.current = true
      await refresh()
    },
    async vote(suspect) { await post('vote', { suspect }); await refresh() },
    async join() { await http.post('/rooms/join', { code }); await refresh() },
  }

  return { room, problem, live, feed, transcript, fresh, searched, actions }
}
