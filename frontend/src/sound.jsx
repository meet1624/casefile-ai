import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { FiVolume2, FiVolumeX } from 'react-icons/fi'

/* Optional sound, generated in the browser (no audio files). Off until the player turns it on,
   and the game is fully playable without it. */

let ctx = null
let on = false
try { on = localStorage.getItem('casefile-sound') === '1' } catch { /* storage unavailable */ }

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noiseBuffer(c, seconds) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function burst(c, { dur, freq, q = 1, type = 'bandpass', gain = 0.1, attack = 0.005 }) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, dur)
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, c.currentTime)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start()
}

function tone(c, { freq, to, dur, type = 'sine', gain = 0.12, delay = 0 }) {
  const o = c.createOscillator(); o.type = type
  const t = c.currentTime + delay
  o.frequency.setValueAtTime(freq, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t); o.stop(t + dur + 0.05)
}

const SFX = {
  paper: (c) => { burst(c, { dur: 0.22, freq: 2600, q: 0.6, gain: 0.07, attack: 0.03 }); burst(c, { dur: 0.12, freq: 5200, q: 0.8, gain: 0.04, attack: 0.02 }) },
  stamp: (c) => { tone(c, { freq: 120, to: 38, dur: 0.28, gain: 0.35 }); burst(c, { dur: 0.1, freq: 700, type: 'lowpass', gain: 0.2 }) },
  tap: (c) => { tone(c, { freq: 210, to: 120, dur: 0.07, gain: 0.14 }); burst(c, { dur: 0.04, freq: 1400, gain: 0.05 }) },
  click: (c) => { tone(c, { freq: 1500, to: 900, dur: 0.03, type: 'square', gain: 0.03 }) },
  chime: (c) => { tone(c, { freq: 784, dur: 0.7, type: 'triangle', gain: 0.07 }); tone(c, { freq: 1175, dur: 0.9, type: 'triangle', gain: 0.05, delay: 0.09 }) },
  lamp: (c) => { tone(c, { freq: 1100, to: 700, dur: 0.04, type: 'square', gain: 0.04 }); tone(c, { freq: 58, dur: 1.2, gain: 0.05 }) },
  sting: (c) => { tone(c, { freq: 55, dur: 1.8, type: 'sawtooth', gain: 0.07 }); tone(c, { freq: 82.4, dur: 1.8, type: 'sawtooth', gain: 0.05 }); tone(c, { freq: 233, to: 220, dur: 1.4, type: 'triangle', gain: 0.04, delay: 0.1 }) },
}

const Ctx = createContext({ enabled: false, toggle() {}, play() {} })

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(on)
  const play = useCallback((name) => {
    if (!on) return
    try { SFX[name]?.(audio()) } catch { /* audio is not essential */ }
  }, [])
  const toggle = useCallback(() => {
    on = !on
    setEnabled(on)
    try { localStorage.setItem('casefile-sound', on ? '1' : '0') } catch { /* storage unavailable */ }
    if (on) try { SFX.click(audio()) } catch { /* audio is not essential */ }
  }, [])
  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useSound = () => useContext(Ctx)

export function SoundToggle({ className = '' }) {
  const { enabled, toggle } = useSound()
  const Icon = enabled ? FiVolume2 : FiVolumeX
  return (
    <button type="button" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
      className={`grid size-9 place-items-center rounded-md text-ash hover:bg-white/5 hover:text-bone ${className}`}>
      <Icon aria-hidden="true" className="size-[18px]" />
    </button>
  )
}
