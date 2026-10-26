import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import Seal from '../components/Seal'

export default function Briefing({ open, onClose, data }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); previous?.focus?.() }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="briefing-title"
            initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
            className="relative w-full max-w-2xl rounded-md border border-hairline border-t-brass bg-charcoal p-6 shadow-2xl sm:p-9">
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close the briefing" className="absolute right-3 top-3 grid size-9 place-items-center rounded-md text-ash hover:bg-white/5 hover:text-bone">
              <FiX aria-hidden="true" className="size-5" />
            </button>
            <h2 id="briefing-title" className="font-display text-4xl font-medium leading-tight tracking-tight">{data.title}</h2>
            <p className="mt-2 font-display text-lg italic text-ash">{data.setting}</p>
            <p className="mt-6 leading-relaxed">{data.briefing}</p>
            <p className="mt-4 text-sm text-ash">The victim: {data.victim}.</p>
            <h3 className="mt-8 text-sm font-semibold">Persons of interest</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {data.suspects.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-md border border-hairline p-3">
                  <Seal id={s.id} name={s.name} size={40} />
                  <div><p className="font-display text-lg leading-tight">{s.name}</p><p className="text-sm text-ash">{s.role}</p></div>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
