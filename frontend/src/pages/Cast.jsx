import { useState } from 'react'
import Character from '../characters/Character'
import { CAST_IDS } from '../characters/specs'
import { EXPRESSIONS } from '../characters/expressions'
import SiteHeader from '../components/SiteHeader'
import { cx } from '../lib'

/** Every drawn suspect and every expression, side by side. */
export default function Cast() {
  const [expression, setExpression] = useState('neutral')
  const [speaking, setSpeaking] = useState(false)
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-[1300px] px-5 pb-20 sm:px-8">
        <h1 className="font-display text-4xl font-medium">The cast</h1>
        <p className="mt-2 max-w-xl text-ash">Twelve suspects, each drawn from their own face, hair, clothes and props. Pick an expression to see every face move.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {Object.keys(EXPRESSIONS).map((e) => (
            <button key={e} type="button" onClick={() => setExpression(e)} className={cx('rounded-full border px-4 py-1.5 text-sm', expression === e ? 'border-brass bg-brass/15' : 'border-hairline hover:border-brass-dim')}>{e}</button>
          ))}
          <button type="button" aria-pressed={speaking} onClick={() => setSpeaking((s) => !s)} className={cx('rounded-full border px-4 py-1.5 text-sm', speaking ? 'border-brass bg-brass/15' : 'border-hairline')}>speaking</button>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CAST_IDS.map((id) => (
            <li key={id} className="rounded-md border border-hairline bg-charcoal/80 p-3">
              <div className="h-[300px]"><Character id={id} name={id} expression={expression} speaking={speaking} look="cursor" lit={0.6} crop="portrait" className="h-full w-full" /></div>
              <p className="mt-2 text-center font-display text-lg capitalize">{id}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
