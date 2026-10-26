import { cx } from '../lib'

export function Spinner({ className = '' }) {
  return (
    <svg className={cx('size-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const LOOKS = {
  primary: 'bg-brass text-soot hover:bg-brass-light shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]',
  ghost: 'border border-hairline text-bone hover:border-brass-dim hover:bg-white/[0.03]',
  quiet: 'text-ash hover:text-bone',
  danger: 'border border-oxblood-deep text-bone hover:bg-oxblood-deep/30',
}

export function Button({ variant = 'primary', busy = false, icon: Icon, className = '', children, ...props }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        LOOKS[variant],
        className,
      )}
    >
      {busy ? <Spinner /> : Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
      {children}
    </button>
  )
}

export const inputClass =
  'w-full rounded-md border border-hairline bg-soot/70 px-3.5 py-2.5 text-[15px] text-bone placeholder:text-ash/70 ' +
  'transition-colors hover:border-brass-dim/70 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass'

/** A framed section with a title bar. */
export function Panel({ title, aside, children, className = '', bodyClassName = '' }) {
  return (
    <section className={cx('flex min-h-0 flex-col rounded-md border border-hairline bg-charcoal/85', className)}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <h2 className="text-sm font-semibold text-bone">{title}</h2>
          {aside}
        </header>
      )}
      <div className={cx('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Notice({ tone = 'error', children, className = '' }) {
  const tones = {
    error: 'border-oxblood bg-oxblood-deep/20',
    warn: 'border-brass-dim bg-brass/10',
    info: 'border-hairline bg-white/[0.03]',
  }
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-md border-l-2 px-3.5 py-2.5 text-sm', tones[tone], className)}>
      {children}
    </p>
  )
}

export function Empty({ children, className = '' }) {
  return <p className={cx('px-4 py-6 text-center text-sm leading-relaxed text-ash', className)}>{children}</p>
}

export function FullPageSpinner({ label }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-ash" role="status">
      <div className="flex items-center gap-3 text-sm"><Spinner className="size-5 text-brass" />{label}</div>
    </div>
  )
}
