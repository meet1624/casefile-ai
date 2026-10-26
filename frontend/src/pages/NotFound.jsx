import { Link } from 'react-router-dom'
import Backdrop from '../scene/Atmosphere'
import SiteHeader from '../components/SiteHeader'

export default function NotFound() {
  return (
    <div className="relative min-h-dvh">
      <Backdrop variant="quiet" />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-xl px-5 pt-20 text-center">
        <h1 className="font-display text-5xl font-medium">This file is missing.</h1>
        <p className="mt-4 text-ash">There is no page at this address. It may have been moved, or the link may be wrong.</p>
        <Link to="/" className="mt-8 inline-flex rounded-md bg-brass px-5 py-3 text-sm font-semibold text-soot hover:bg-brass-light">Back to the start</Link>
      </main>
    </div>
  )
}
