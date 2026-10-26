/** One shared pointer listener for every face on screen, so eyes can follow the cursor without each adding its own. */
const subs = new Set()
let frame = 0
let last = { x: typeof window === 'undefined' ? 0 : window.innerWidth / 2, y: typeof window === 'undefined' ? 0 : window.innerHeight / 2 }

function onMove(e) {
  last = { x: e.clientX, y: e.clientY }
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    subs.forEach((fn) => fn(last))
  })
}

export function subscribePointer(fn) {
  if (subs.size === 0) window.addEventListener('pointermove', onMove, { passive: true })
  subs.add(fn)
  fn(last)
  return () => {
    subs.delete(fn)
    if (subs.size === 0) window.removeEventListener('pointermove', onMove)
  }
}
