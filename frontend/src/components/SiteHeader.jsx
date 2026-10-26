import { Link, useNavigate } from 'react-router-dom'
import { FiLogOut } from 'react-icons/fi'
import { useAuth } from '../auth'
import Logo from '../brand/Logo'
import { SoundToggle } from '../sound'
import { Button } from './ui'

export function Wordmark({ className = '' }) {
  return (
    <Link to="/" aria-label="Casefile home" className={className}>
      <Logo size={42} />
    </Link>
  )
}

export default function SiteHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="relative z-20 mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
      <Wordmark />
      <nav className="flex items-center gap-1.5">
        <Link to="/cast" className="hidden rounded-md px-3 py-2 text-sm text-ash hover:text-bone sm:inline">The suspects</Link>
        {user ? (
          <>
            <Link to="/lobby" className="rounded-md px-3 py-2 text-sm text-ash hover:text-bone">Cases</Link>
            {user.is_admin && <Link to="/admin" className="rounded-md px-3 py-2 text-sm text-ash hover:text-bone">Manage</Link>}
            <span className="hidden text-sm text-ash md:inline">{user.username}</span>
            <SoundToggle />
            <Button variant="ghost" icon={FiLogOut} onClick={() => { signOut(); navigate('/') }}>Log out</Button>
          </>
        ) : (
          <>
            <SoundToggle />
            <Link to="/auth" className="rounded-md px-3 py-2 text-sm text-ash hover:text-bone">Log in</Link>
            <Link to="/auth?mode=register" className="inline-flex rounded-md bg-brass px-4 py-2.5 text-sm font-semibold text-soot hover:bg-brass-light">Create account</Link>
          </>
        )}
      </nav>
    </header>
  )
}
