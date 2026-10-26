import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiMinus, FiPlus, FiRotateCcw, FiX } from 'react-icons/fi'
import { LuMapPin } from 'react-icons/lu'
import { errorText } from '../api'
import Polaroid from '../components/Polaroid'
import { cx, exhibitLetter, titleCase } from '../lib'
import { useSound } from '../sound'
import { useToast } from '../toast'

const SUS = { w: 148, h: 215 }
const EXH = { w: 176, h: 124 }
const size = (k) => (k === 's' ? SUS : EXH)

const read = (key) => { try { return JSON.parse(localStorage.getItem(key)) ?? {} } catch { return {} } }
const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private mode: layout just won't persist */ } }

/** Default spot for an item: suspects in an arc along the top, exhibits in rows beneath. */
function slot(kind, i, n) {
  if (kind === 's') return { x: 90 + i * 200, y: 40 + (i % 2) * 28 }
  return { x: 70 + (i % 4) * 216, y: 360 + Math.floor(i / 4) * 170 + (i % 2) * 14 }
}

export default function Board({ room, rt }) {
  const toast = useToast()
  const { play } = useSound()
  const key = `casefile-board-${room.code}`
  const [pos, setPos] = useState(() => read(key + '-pos'))
  const [view, setView] = useState(() => ({ x: 0, y: 0, k: 1, ...read(key + '-view') }))
  const [inspect, setInspect] = useState(null)
  const [busy, setBusy] = useState('')
  const wrap = useRef(null)
  const drag = useRef(null)
  const { journal } = room
  const suspects = room.case.suspects
  const exhibits = journal.evidence
  const searched = useMemo(() => new Set([...rt.searched, ...exhibits.map((e) => e.location)]), [rt.searched, exhibits])

  const items = useMemo(() => [
    ...suspects.map((s, i) => ({ id: `s:${s.id}`, kind: 's', raw: s, i })),
    ...exhibits.map((e, i) => ({ id: `e:${e.id}`, kind: 'e', raw: e, i })),
  ], [suspects, exhibits])
  const at = useCallback((it) => pos[it.id] ?? slot(it.kind, it.i), [pos])
  const mid = (id) => { const it = items.find((x) => x.id === id); if (!it) return null; const p = at(it), z = size(it.kind); return { x: p.x + z.w / 2, y: p.y + z.h / 2 - (it.kind === 's' ? 40 : 0) } }

  // Threads exist only where the game has a real relationship.
  const threads = useMemo(() => {
    const out = []
    journal.contradictions.forEach((c) => out.push({ id: `c-${c.suspect}-${c.refuted_by}`, a: `s:${c.suspect}`, b: `e:${c.refuted_by}`, kind: 'contra', said: c.said }))
    const seen = new Set(out.map((t) => `${t.a}|${t.b}`))
    rt.transcript.filter((m) => m.kind === 'present' && m.evidence).forEach((m) => {
      const k = `s:${m.suspect}|e:${m.evidence}`
      if (!seen.has(k)) { seen.add(k); out.push({ id: `p-${k}`, a: `s:${m.suspect}`, b: `e:${m.evidence}`, kind: 'shown' }) }
    })
    return out
  }, [journal.contradictions, rt.transcript])

  useEffect(() => { write(key + '-pos', pos) }, [pos, key])
  useEffect(() => { write(key + '-view', view) }, [view, key])

  // Wheel zoom around the pointer. Attached natively so it can prevent page scroll.
  useEffect(() => {
    const el = wrap.current
    const onWheel = (e) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      setView((v) => {
        const k = Math.min(1.8, Math.max(0.45, v.k * (e.deltaY < 0 ? 1.1 : 0.9)))
        const px = e.clientX - r.left, py = e.clientY - r.top
        return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoom = (f) => setView((v) => ({ ...v, k: Math.min(1.8, Math.max(0.45, v.k * f)) }))

  function down(e, it) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = at(it)
    drag.current = { it, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false }
  }
  function move(e) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
    if (d.moved) setPos((p) => ({ ...p, [d.it.id]: { x: d.ox + dx / view.k, y: d.oy + dy / view.k } }))
  }
  function up() {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) { play('tap'); setInspect(d.it) }
  }
  function panDown(e) {
    drag.current = { pan: true, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function panMove(e) {
    const d = drag.current
    if (d?.pan) setView((v) => ({ ...v, x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy }))
  }

  async function search(place) {
    setBusy(place)
    try {
      const found = await rt.actions.search(place)
      if (found.length) play('chime')
      toast(found.length ? `Found ${found.map((e) => e.name).join(' and ')}` : `Nothing new in the ${place}.`)
    } catch (e) { toast(errorText(e), 'error') } finally { setBusy('') }
  }

  const reset = () => { setPos({}); setView({ x: 0, y: 0, k: 1 }) }
  const inspected = inspect && (inspect.kind === 's' ? suspects.find((s) => `s:${s.id}` === inspect.id) : exhibits.find((e) => `e:${e.id}` === inspect.id))

  return (
    <section aria-label="Evidence board" className="relative">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <span className="mr-1 font-hand text-[24px] leading-none text-bone/85">Search the scene</span>
        {room.case.locations.map((p) => (
          <button key={p} type="button" disabled={Boolean(busy)} onClick={() => search(p)}
            className={cx('inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-1.5 font-type text-[12px] font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-60',
              searched.has(p) ? 'bg-[#b9ab87] text-[#3a3120]' : 'bg-[#eadfc6] text-[#241b10] shadow-[0_0_14px_rgb(240_196_108/.35)]')}>
            <LuMapPin aria-hidden="true" className="size-3.5" />{titleCase(p)}{busy === p ? '…' : searched.has(p) ? ' ✓' : ''}
          </button>
        ))}
      </div>

      <div ref={wrap} onPointerDown={panDown} onPointerMove={panMove} onPointerUp={() => { drag.current = null }}
        className="relative h-[calc(100dvh-14rem)] min-h-[460px] cursor-grab touch-none overflow-hidden border-y border-black/60 active:cursor-grabbing"
        style={{ background: 'radial-gradient(ellipse at 50% 20%, #7a5a38, #4a3420 70%, #2c1e12), #4a3420', boxShadow: 'inset 0 0 120px rgb(0 0 0/.75)' }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-35 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(#1a0f06 1px, transparent 1.4px)', backgroundSize: '5px 5px' }} />
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1" aria-hidden="true">
            {threads.map((t) => {
              const A = mid(t.a), B = mid(t.b)
              if (!A || !B) return null
              const sag = Math.min(60, Math.hypot(B.x - A.x, B.y - A.y) * 0.12)
              const d = `M${A.x} ${A.y}Q${(A.x + B.x) / 2} ${(A.y + B.y) / 2 + sag} ${B.x} ${B.y}`
              return (
                <g key={t.id}>
                  <motion.path d={d} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth={t.kind === 'contra' ? 5 : 3} transform="translate(2 4)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
                  <motion.path d={d} fill="none" stroke={t.kind === 'contra' ? '#c4473f' : '#d9a441'} strokeWidth={t.kind === 'contra' ? 3 : 2} strokeDasharray={t.kind === 'contra' ? undefined : '7 6'} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
                </g>
              )
            })}
          </svg>
          {items.map((it) => {
            const p = at(it)
            const fresh = it.kind === 'e' && rt.fresh.has(it.raw.id)
            const dragging = drag.current?.it?.id === it.id
            return (
              <motion.div key={it.id} className="absolute cursor-pointer select-none" style={{ left: p.x, top: p.y, width: size(it.kind).w, zIndex: dragging ? 30 : 5 }}
                onPointerDown={(e) => down(e, it)} onPointerMove={move} onPointerUp={up}
                initial={{ opacity: 0, scale: 0.7, y: -40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                role="button" tabIndex={0} aria-label={`Inspect ${it.raw.name}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setInspect(it) }}>
                {it.kind === 's'
                  ? <Polaroid id={it.raw.id} name={it.raw.name} caption={it.raw.name.split(' ').slice(-1)[0]} rotate={[-2, 1.5, -1, 2][it.i % 4]} />
                  : (
                    <article className={cx('paper relative px-3 pb-3 pt-4 font-type', fresh && 'ring-2 ring-brass-light')} style={{ rotate: `${[-1.4, 1, -0.6, 1.6][it.i % 4]}deg`, minHeight: EXH.h }}>
                      <span aria-hidden="true" className="absolute -top-2 left-1/2 size-3.5 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe08a,#c9922a_60%,#5a3a0a)] shadow-[0_3px_5px_rgb(0_0_0/.6)]" />
                      <p className="text-[11px] font-bold">Exhibit {exhibitLetter(it.i)}{fresh && <span className="ml-1.5 rounded-[2px] bg-oxblood-deep px-1 text-[9px] text-paper">NEW</span>}</p>
                      <p className="mt-0.5 text-[13px] font-bold leading-tight">{it.raw.name}</p>
                      <p className="mt-1 text-[11px] italic opacity-70">{titleCase(it.raw.location)}</p>
                    </article>
                  )}
              </motion.div>
            )
          })}
        </div>

        {exhibits.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-10 text-center font-hand text-[26px] text-[#e6d3a8]/90 [text-shadow:0_2px_6px_#000]">The board is bare. Search a place above and what you find gets pinned here.</p>
        )}

        <div className="absolute bottom-3 right-3 z-40 flex flex-col overflow-hidden rounded-md border border-black/50 bg-black/65 backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
          {[[FiPlus, 'Zoom in', () => zoom(1.2)], [FiMinus, 'Zoom out', () => zoom(1 / 1.2)], [FiRotateCcw, 'Reset the board layout', reset]].map(([I, l, f]) => (
            <button key={l} type="button" aria-label={l} onClick={f} className="grid size-10 place-items-center text-bone hover:bg-white/10"><I aria-hidden="true" /></button>
          ))}
        </div>
        <div className="absolute bottom-3 left-3 z-40 flex items-center gap-4 rounded-md bg-black/60 px-3 py-1.5 text-xs text-bone/80 backdrop-blur">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-oxblood" />Contradiction</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-brass" />Shown to</span>
        </div>
      </div>

      <AnimatePresence>
        {inspected && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setInspect(null)}>
            <motion.div role="dialog" aria-modal="true" aria-label={inspected.name} onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, rotate: -3, y: 30 }} animate={{ scale: 1, rotate: -0.6, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="paper relative max-h-[85vh] w-full max-w-md overflow-y-auto px-7 pb-7 pt-8">
              <button type="button" autoFocus aria-label="Close" onClick={() => setInspect(null)} className="absolute right-3 top-3 grid size-9 place-items-center rounded-md hover:bg-black/10"><FiX aria-hidden="true" /></button>
              {inspect.kind === 'e' ? (
                <>
                  <p className="font-type text-[11px] font-bold tracking-[0.2em] text-paper-ink/65">EXHIBIT {exhibitLetter(inspect.i)} · FOUND IN THE {inspected.location.toUpperCase()}</p>
                  <h2 className="mt-1 font-display text-3xl font-semibold">{inspected.name}</h2>
                  <p className="mt-3 font-type text-[15px] leading-relaxed">{inspected.description}</p>
                  {threads.filter((t) => t.b === inspect.id).map((t) => {
                    const s = suspects.find((x) => `s:${x.id}` === t.a)
                    return <p key={t.id} className={cx('mt-3 font-type text-sm', t.kind === 'contra' ? 'font-bold text-oxblood-deep' : 'text-paper-ink/80')}>{t.kind === 'contra' ? `Contradicts ${s?.name}: “${t.said}”` : `Shown to ${s?.name}.`}</p>
                  })}
                </>
              ) : (
                <>
                  <p className="font-type text-[11px] font-bold tracking-[0.2em] text-paper-ink/65">{inspected.role.toUpperCase()}</p>
                  <h2 className="mt-1 font-display text-3xl font-semibold">{inspected.name}</h2>
                  <p className="mt-1 font-type text-sm italic text-paper-ink/80">{inspected.personality}</p>
                  <ul className="mt-4 space-y-3 border-l-2 border-paper-ink/30 pl-4">
                    {journal.statements.filter((st) => st.suspect === inspected.id).filter((st, i, a) => a.findIndex((o) => o.text === st.text) === i).map((st, i) => (
                      <li key={i}><p className="font-type text-[11px] font-bold text-paper-ink/60">{room.case.topic_labels?.[st.topic] ?? st.topic}</p><p className="font-type text-[14px] leading-snug">{st.text}</p></li>
                    ))}
                    {!journal.statements.some((st) => st.suspect === inspected.id) && <li className="font-hand text-[22px] text-paper-ink/70">Nothing on record yet. Go and talk to them.</li>}
                  </ul>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
