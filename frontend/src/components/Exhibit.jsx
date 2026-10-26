import { motion } from 'framer-motion'
import { cx, tiltFor } from '../lib'

/** A piece of evidence, as a typed card on warm paper. It is the lightest thing on screen on purpose. */
export default function Exhibit({ item, letter, index = 0, isNew = false, selected = false, className = '' }) {
  const tilt = tiltFor(index)
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -26, rotate: tilt - 5, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={cx('paper relative rounded-[3px] px-4 pb-4 pt-5 font-type', selected && 'ring-2 ring-brass', className)}
    >
      <span aria-hidden="true" className="absolute -top-2 left-7 h-4 w-14 -rotate-3 bg-brass/45 shadow-sm" />
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-bold leading-snug">{item.name}</h3>
        <span className="shrink-0 rounded-[2px] border border-paper-ink/55 px-1.5 py-px text-[11px] font-bold">Exhibit {letter}</span>
      </div>
      <p className="mt-0.5 text-xs italic opacity-70">
        Found in the {item.location}
        {isNew && <span className="ml-2 rounded-[2px] bg-oxblood-deep px-1.5 py-px text-[10px] font-bold not-italic text-paper">New</span>}
      </p>
      <p className="mt-2.5 text-[13.5px] leading-relaxed">{item.description}</p>
    </motion.article>
  )
}
