import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowRight, FiPlus, FiUser, FiUsers } from 'react-icons/fi'
import { errorText, http } from '../api'
import { useAuth } from '../auth'
import CaseCover from '../components/CaseCover'
import SiteHeader from '../components/SiteHeader'
import { Button, Notice, Spinner } from '../components/ui'
import { cx, PHASE_LABEL } from '../lib'
import Backdrop from '../scene/Atmosphere'
import { useSound } from '../sound'
import { useToast } from '../toast'

/** A case as a manila folder on the shelf. */
function Folder({ item, selected, index, onPick }) {
  const r = [-2.2, 1.4, -0.9, 2][index % 4]
  return (
    <motion.button
      type="button" aria-pressed={selected} onClick={onPick}
      className="group relative w-[210px] shrink-0 text-left focus-visible:outline-offset-8"
      initial={{ opacity: 0, y: 30, rotate: r + 4 }}
      animate={{ opacity: 1, y: selected ? -16 : 0, rotate: selected ? 0 : r, scale: selected ? 1.04 : 1 }}
      whileHover={{ y: selected ? -16 : -8, rotate: selected ? 0 : r * 0.4 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20, delay: index * 0.07 }}
    >
      <span aria-hidden="true" className="absolute -top-[18px] left-3 h-[20px] w-[44%] rounded-t-[4px] bg-[#cdb782]" />
      <span className={cx('relative block rounded-[4px] p-3 pb-4 transition-shadow', selected ? 'shadow-[0_0_0_2px_#f0c46c,0_30px_44px_-16px_rgb(0_0_0/.9),0_0_44px_rgb(217_164_65/.28)]' : 'shadow-[0_22px_34px_-16px_rgb(0_0_0/.95)]')}
        style={{ background: 'linear-gradient(135deg,#d6c18f,#bda470 60%,#a98f5c)' }}>
        <span className="block overflow-hidden rounded-[2px] shadow-[inset_0_0_0_2px_rgb(0_0_0/.5)]" style={{ aspectRatio: '4 / 3' }}>
          <CaseCover id={item.id} className="h-full w-full" />
        </span>
        <span className="mt-3 block bg-[#efe6cd] px-2.5 py-2 shadow-sm">
          <span className="block font-type text-[13px] font-bold uppercase leading-tight tracking-wide text-[#241b10]">{item.title}</span>
          <span className="mt-0.5 block font-type text-[11px] text-[#241b10]/70">{item.suspects} suspects</span>
        </span>
        {selected && <span aria-hidden="true" className="absolute -right-2 -top-2 rotate-12 rounded-[3px] border-2 border-[#8a1e2b] bg-[#d6c18f]/80 px-1.5 py-0.5 font-type text-[10px] font-bold tracking-widest text-[#8a1e2b]">OPEN</span>}
      </span>
    </motion.button>
  )
}

export default function Lobby() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { play } = useSound()
  const [rooms, setRooms] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [cases, setCases] = useState(null)
  const [caseId, setCaseId] = useState('')
  const [busy, setBusy] = useState('')
  const [code, setCode] = useState('')
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    http.get('/rooms').then((r) => setRooms(r.data)).catch((e) => setLoadError(errorText(e)))
    http.get('/cases').then((r) => { setCases(r.data); setCaseId(r.data[0]?.id ?? '') }).catch((e) => { setCases([]); setLoadError(errorText(e)) })
  }, [])
  const chosen = cases?.find((c) => c.id === caseId)

  async function create(solo) {
    setBusy(solo ? 'solo' : 'create')
    play('stamp')
    try {
      const { data } = await http.post('/rooms', caseId ? { case_id: caseId } : undefined)
      if (solo) await http.post(`/rooms/${data.code}/start`)
      navigate(`/room/${data.code}`)
    } catch (e) {
      toast(errorText(e), 'error')
      setBusy('')
    }
  }

  async function join(e) {
    e.preventDefault()
    setBusy('join')
    setJoinError('')
    try {
      const { data } = await http.post('/rooms/join', { code: code.trim() })
      navigate(`/room/${data.code}`)
    } catch (err) {
      setJoinError(err.response?.status === 404 ? `No room has the code ${code.trim().toUpperCase()}. Check it with whoever invited you.` : errorText(err))
      setBusy('')
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Backdrop variant="office" />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-24 pt-2 sm:px-8">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-medium leading-tight tracking-tight text-glow">The archive</h1>
        <p className="mt-1 font-hand text-[26px] text-bone/80">Good evening, {user.username}. Pick a file.</p>

        {/* the shelf */}
        <section aria-label="Cases" className="mt-12">
          {cases === null ? (
            <div className="flex items-center gap-2 text-sm text-ash"><Spinner className="text-brass" />Opening the archive</div>
          ) : (
            <ul className="-mx-5 flex gap-7 overflow-x-auto px-5 pb-6 pt-8 sm:-mx-8 sm:px-8">
              {cases.map((c, i) => <li key={c.id}><Folder item={c} index={i} selected={c.id === caseId} onPick={() => { setCaseId(c.id); play('paper') }} /></li>)}
            </ul>
          )}
        </section>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            {/* the dossier for the chosen case */}
            <AnimatePresence mode="wait">
              {chosen && (
                <motion.article key={chosen.id} initial={{ opacity: 0, y: 12, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -0.4 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
                  className="paper relative px-7 pb-8 pt-9">
                  <span aria-hidden="true" className="absolute -top-2.5 left-9 h-5 w-16 -rotate-2 bg-brass/55" />
                  <p className="font-type text-[11px] font-bold tracking-[0.22em] text-[#2a2218]/65">CASE FILE · {chosen.suspects} SUSPECTS</p>
                  <h2 className="mt-1 font-display text-3xl font-semibold text-[#1b160f]">{chosen.title}</h2>
                  <p className="mt-3 max-w-lg font-type text-[14.5px] leading-relaxed">{chosen.setting}</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button icon={FiUser} busy={busy === 'solo'} disabled={Boolean(busy)} onClick={() => create(true)} className="bg-[#1b160f] text-bone shadow-none hover:bg-[#2d2519]">Play solo</Button>
                    <button type="button" disabled={Boolean(busy)} onClick={() => create(false)} className="inline-flex items-center gap-2 rounded-md border-2 border-[#1b160f]/70 px-4 py-2.5 text-sm font-semibold text-[#1b160f] hover:bg-[#1b160f]/10 disabled:opacity-50">
                      {busy === 'create' ? <Spinner /> : <FiPlus aria-hidden="true" className="size-4" />}Open a room for friends
                    </button>
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
            {loadError && <Notice>{loadError}</Notice>}

            {/* the ticket stub */}
            <form onSubmit={join} className="relative flex flex-wrap items-stretch overflow-hidden rounded-[3px] bg-[#e9dfc2] text-[#1b160f] shadow-[0_18px_30px_-14px_rgb(0_0_0/.9)]" style={{ rotate: '0.4deg' }}>
              <div className="flex-1 border-r-2 border-dashed border-[#1b160f]/35 px-6 py-5">
                <label htmlFor="code" className="font-type text-[11px] font-bold tracking-[0.22em] text-[#2a2218]/70">JOIN WITH A ROOM CODE</label>
                <input id="code" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setJoinError('') }} placeholder="ABC123" maxLength={8}
                  autoComplete="off" autoCapitalize="characters" spellCheck="false" aria-describedby={joinError ? 'join-error' : undefined}
                  className="mt-1 w-full border-0 border-b-2 border-[#1b160f]/40 bg-transparent py-1 font-type text-3xl font-bold uppercase tracking-[0.35em] placeholder:text-[#1b160f]/25 focus:border-[#7a1f2b] focus:outline-none" />
                {joinError && <p id="join-error" role="alert" className="mt-2 font-type text-sm text-[#7a1f2b]">{joinError}</p>}
              </div>
              <button type="submit" disabled={Boolean(busy) || code.trim().length < 4} className="grid min-w-[120px] place-items-center bg-[#1b160f] px-6 py-5 text-sm font-semibold text-bone hover:bg-[#2d2519] disabled:opacity-50">
                <span className="flex items-center gap-2">{busy === 'join' ? <Spinner /> : null}Join<FiArrowRight aria-hidden="true" /></span>
              </button>
            </form>
          </div>

          {/* rooms you are in */}
          <section aria-labelledby="yours">
            <h2 id="yours" className="font-hand text-[30px] leading-none text-bone/90">Cases you're on</h2>
            {rooms === null && !loadError && <div className="mt-4 flex items-center gap-2 text-sm text-ash"><Spinner className="text-brass" />Checking your files</div>}
            {rooms?.length === 0 && (
              <p className="mt-4 rounded-md border border-dashed border-white/15 px-5 py-8 text-center font-hand text-[24px] leading-snug text-ash">The desk is clear. Open a file from the shelf to start your first case.</p>
            )}
            {rooms?.length > 0 && (
              <ul className="mt-4 space-y-3">
                {rooms.map((r, i) => (
                  <motion.li key={r.code} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link to={`/room/${r.code}`} className="group paper relative flex items-center justify-between gap-4 px-5 py-4 transition-transform hover:-translate-y-0.5" style={{ rotate: `${[-0.6, 0.5, -0.3][i % 3]}deg` }}>
                      <div>
                        <p className="font-type text-xl font-bold tracking-[0.25em]">{r.code}</p>
                        <p className="mt-0.5 flex items-center gap-2 font-type text-[12.5px] text-[#2a2218]/75">
                          {PHASE_LABEL[r.phase]}<span aria-hidden="true">·</span><FiUsers aria-hidden="true" className="size-3.5" />{r.players}<span className="sr-only">players</span>
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7a1f2b] group-hover:underline">
                        {r.phase === 'reveal' ? 'View result' : 'Rejoin'}<FiArrowRight aria-hidden="true" />
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
