import { Component } from 'react'

/** If a screen crashes, say so and show why, instead of leaving a black page. */
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Something broke on this screen.</h1>
        <p className="mt-3 text-ash">Reload to get back to the game. Your room and progress are saved on the server.</p>
        <pre className="mt-4 overflow-auto rounded-md bg-black/50 p-3 text-left text-xs text-oxblood">{String(this.state.error?.stack || this.state.error).slice(0, 600)}</pre>
        <button type="button" onClick={() => { window.location.href = '/lobby' }} className="mt-6 rounded-md bg-brass px-5 py-2.5 text-sm font-semibold text-soot">Back to the lobby</button>
      </main>
    )
  }
}
