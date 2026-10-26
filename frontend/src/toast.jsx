import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cx } from './lib'

const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const next = useRef(0)

  const toast = useCallback((text, tone = 'info') => {
    const id = next.current++
    setItems((all) => [...all.slice(-3), { id, text, tone }])
    setTimeout(() => setItems((all) => all.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className={cx(
                'pointer-events-auto max-w-md rounded-md border px-4 py-2.5 text-sm shadow-2xl backdrop-blur',
                t.tone === 'error' && 'border-oxblood-deep bg-[#2a1614]/95 text-bone',
                t.tone === 'warn' && 'border-brass-dim bg-[#2a2415]/95 text-bone',
                t.tone === 'info' && 'border-hairline bg-slate/95 text-bone',
              )}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
