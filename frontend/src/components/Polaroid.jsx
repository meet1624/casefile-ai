import { motion } from 'framer-motion'
import Character from '../characters/Character'
import { cx } from '../lib'

/** A suspect's photograph, pinned up. The face follows the cursor. */
export default function Polaroid({ id, name, caption, rotate = 0, expression = 'neutral', className = '', pin = true, lit = 0.6, children }) {
  return (
    <motion.figure
      className={cx('relative w-[148px] shrink-0 bg-[#e6dec9] p-2 pb-1 shadow-[0_18px_30px_-14px_rgb(0_0_0/.95),0_2px_4px_rgb(0_0_0/.5)]', className)}
      style={{ rotate }}
      whileHover={{ rotate: rotate * 0.4, y: -4 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    >
      {pin && (
        <span aria-hidden="true" className="absolute -top-2 left-1/2 z-10 size-4 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a80,#a82f35_60%,#5a1219)] shadow-[0_3px_5px_rgb(0_0_0/.6)]" />
      )}
      <div className="relative h-[168px] overflow-hidden bg-[#0b0f17]">
        <Character id={id} name={name} expression={expression} look="cursor" lit={lit} crop="portrait" className="absolute inset-x-0 bottom-0 h-[112%] w-full" />
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 10%, rgb(255 196 107 / .12), transparent 60%), linear-gradient(180deg, transparent 60%, rgb(0 0 0 / .45))' }} />
      </div>
      <figcaption className="px-0.5 pb-1 pt-1.5 text-center font-hand text-[19px] leading-none text-[#2b2318]">{caption ?? name}</figcaption>
      {children}
    </motion.figure>
  )
}
