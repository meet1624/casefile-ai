import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { errorText } from '../api'
import { useAuth } from '../auth'
import Polaroid from '../components/Polaroid'
import SiteHeader from '../components/SiteHeader'
import Backdrop from '../scene/Atmosphere'
import { Button, Notice, inputClass } from '../components/ui'

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const register = params.get('mode') === 'register'
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/lobby'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to={from} replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await (register ? signUp : signIn)(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full border-0 border-b-2 border-[#2a2218]/55 bg-transparent px-1 py-2 font-type text-[17px] text-[#1b160f] placeholder:text-[#2a2218]/40 transition-colors hover:border-[#2a2218] focus:border-[#7a1f2b] focus:outline-none'
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Backdrop variant="quiet" />
      <SiteHeader />
      <main className="relative z-10 mx-auto grid max-w-[1050px] gap-12 px-5 pb-20 pt-4 sm:px-8 md:grid-cols-[1fr_410px] md:items-center md:pt-10">
        <div className="max-md:order-2">
          <h1 className="font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-medium leading-[1.05] tracking-tight text-glow">
            {register ? 'Start your first case file.' : 'Your cases are waiting.'}
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-bone/75">
            {register
              ? 'An account lets you leave a room and come back to it, and lets friends find you by your name in the room.'
              : 'Log in to rejoin a room you were in, or open a new one.'}
          </p>
          <div className="mt-10 hidden gap-5 md:flex">
            <Polaroid id="elena" name="Elena Voss" caption="She saw it" rotate={-4} />
            <Polaroid id="marcus" name="Marcus Hale" caption="He lied" rotate={3} className="mt-6" />
          </div>
        </div>

        <form onSubmit={submit} className="paper relative rounded-[3px] px-7 pb-8 pt-9 sm:px-8" style={{ rotate: '0.6deg' }} noValidate>
          <span aria-hidden="true" className="absolute -top-2.5 left-10 h-5 w-16 -rotate-2 bg-brass/55" />
          <p className="font-type text-[11px] font-bold tracking-[0.22em] text-[#2a2218]/70">{register ? 'NEW INVESTIGATOR' : 'RETURNING INVESTIGATOR'}</p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-[#1b160f]">{register ? 'Open your file' : 'Sign in'}</h2>
          <div className="mt-7 space-y-6">
            <div>
              <label htmlFor="username" className="font-type text-[13px] font-bold text-[#2a2218]">Username</label>
              <input id="username" className={field} value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" autoCapitalize="none" spellCheck="false" required minLength={register ? 3 : 1} maxLength={30} aria-describedby={register ? 'username-help' : undefined} />
              {register && <p id="username-help" className="mt-1.5 font-type text-xs text-[#2a2218]/70">3 to 30 letters, numbers or underscores.</p>}
            </div>
            <div>
              <label htmlFor="password" className="font-type text-[13px] font-bold text-[#2a2218]">Password</label>
              <div className="relative">
                <input id="password" className={`${field} pr-10`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : 1} maxLength={128} aria-describedby={register ? 'password-help' : undefined} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                  className="absolute right-0 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-[#2a2218]/70 hover:text-[#1b160f]">
                  {show ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
              {register && <p id="password-help" className="mt-1.5 font-type text-xs text-[#2a2218]/70">At least 8 characters.</p>}
            </div>
            {error && <p role="alert" className="border-l-4 border-[#7a1f2b] bg-[#7a1f2b]/10 px-3 py-2 font-type text-sm text-[#5a1420]">{error}</p>}
            <Button type="submit" busy={busy} className="w-full bg-[#1b160f] py-3 text-bone shadow-none hover:bg-[#2d2519]">{register ? 'Create account' : 'Log in'}</Button>
          </div>
          <p className="mt-6 text-center font-type text-sm text-[#2a2218]/80">
            {register ? 'Already have an account?' : 'New here?'}{' '}
            <Link to={register ? '/auth' : '/auth?mode=register'} state={{ from }} onClick={() => setError('')} className="font-bold text-[#7a1f2b] underline underline-offset-4">
              {register ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
