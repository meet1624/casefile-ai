import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCheck, FiTrash2 } from 'react-icons/fi'
import { errorText, http } from '../api'
import { useAuth } from '../auth'
import SiteHeader from '../components/SiteHeader'
import { Button, Empty, FullPageSpinner, Notice, Panel } from '../components/ui'
import { cx } from '../lib'
import { useToast } from '../toast'

export default function Admin() {
  const { user } = useAuth()
  const toast = useToast()
  const [cases, setCases] = useState(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [problems, setProblems] = useState([])
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    http.get('/admin/cases').then((r) => setCases(r.data)).catch((e) => setError(errorText(e)))
  }, [])
  useEffect(() => { if (user.is_admin) load() }, [user.is_admin, load])

  if (!user.is_admin) {
    return (
      <div><SiteHeader />
        <main className="mx-auto max-w-md px-5 py-20 text-center">
          <h1 className="font-display text-3xl">Admins only</h1>
          <p className="mt-3 text-ash">Your account can't manage cases.</p>
          <Link to="/lobby" className="mt-6 inline-block text-brass-light underline">Back to the lobby</Link>
        </main></div>
    )
  }

  const parse = () => {
    try { return JSON.parse(text) } catch (e) { setOk(false); setProblems([`That isn't valid JSON: ${e.message}`]); return null }
  }
  async function run(name, fn) {
    setBusy(name)
    try { await fn() } catch (e) { toast(errorText(e), 'error') } finally { setBusy('') }
  }
  const validate = () => run('validate', async () => {
    const c = parse(); if (!c) return
    const { data } = await http.post('/admin/cases/validate', { case: c })
    setOk(data.ok); setProblems(data.problems)
  })
  const save = () => run('save', async () => {
    const c = parse(); if (!c) return
    try {
      await http.post('/admin/cases', { case: c })
    } catch (e) {
      const d = e.response?.data?.detail
      if (d?.problems) { setOk(false); setProblems(d.problems); return }
      throw e
    }
    setOk(false); setProblems([]); setText(''); toast('Case added'); load()
  })
  const template = () => run('template', async () => {
    const { data } = await http.get('/admin/cases/midnight-gala')
    setText(JSON.stringify({ ...data, id: 'my-new-case', title: 'My new case' }, null, 2)); setProblems([]); setOk(false)
  })
  async function openFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 100_000) { toast('That file is too large for a case.', 'error'); return }
    setText(await file.text()); setProblems([]); setOk(false)
  }
  const toggle = (c) => run(c.id, async () => { await http.patch(`/admin/cases/${c.id}`, { enabled: !c.enabled }); load() })
  const remove = (c) => run(c.id, async () => {
    if (!window.confirm(`Delete "${c.title}"? This can't be undone.`)) return
    await http.delete(`/admin/cases/${c.id}`); toast('Case deleted'); load()
  })

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-5 pb-24 pt-4 sm:px-8">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-medium tracking-tight">Cases</h1>
        <p className="mt-2 max-w-xl text-ash">Add your own mysteries. Every case is checked before it can be saved: every suspect needs a whereabouts statement, every lie needs proof, and the culprit must be catchable.</p>

        {error && <Notice className="mt-6">{error}</Notice>}
        {!cases && !error ? <FullPageSpinner label="Loading cases…" /> : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Your cases">
              {cases?.length ? (
                <ul className="divide-y divide-hairline">
                  {cases.map((c) => (
                    <li key={c.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xl leading-tight">{c.title}</p>
                          <p className="text-sm text-ash">{c.id} · {c.builtin ? 'Built in' : c.enabled ? 'Open for new rooms' : 'Disabled'} · {c.rooms} {c.rooms === 1 ? 'room' : 'rooms'}</p>
                        </div>
                        {!c.builtin && (
                          <div className="flex shrink-0 gap-2">
                            <Button variant="ghost" busy={busy === c.id} onClick={() => toggle(c)}>{c.enabled ? 'Disable' : 'Enable'}</Button>
                            <Button variant="danger" icon={FiTrash2} aria-label={`Delete ${c.title}`} disabled={c.rooms > 0} title={c.rooms > 0 ? 'Rooms use this case. Disable it instead.' : undefined} onClick={() => remove(c)} />
                          </div>
                        )}
                      </div>
                      {c.problems.length > 0 && <Notice className="mt-3">{c.problems.join(' ')}</Notice>}
                    </li>
                  ))}
                </ul>
              ) : <Empty>No cases yet.</Empty>}
            </Panel>

            <Panel title="Add a case" bodyClassName="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ash">Paste a case as JSON, or start from a copy of The Midnight Gala and change it.</p>
                <Button variant="ghost" busy={busy === 'template'} onClick={template}>Use a template</Button>
              </div>
              <div className="mt-3">
                <label htmlFor="case-file" className="inline-flex cursor-pointer rounded-md border border-hairline px-4 py-2.5 text-sm font-semibold hover:border-brass-dim">Open a .json file</label>
                <input id="case-file" type="file" accept=".json,application/json" onChange={openFile} className="sr-only" />
              </div>
              <label htmlFor="case-json" className="sr-only">Case JSON</label>
              <textarea id="case-json" value={text} onChange={(e) => { setText(e.target.value); setOk(false) }} spellCheck="false" rows={16}
                placeholder='{ "id": "my-new-case", "title": "...", ... }'
                className="mt-3 w-full rounded-md border border-hairline bg-soot/70 p-3 font-type text-[13px] leading-relaxed focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass" />
              {problems.length > 0 && (
                <ul className="mt-3 space-y-1.5" role="alert">
                  {problems.map((p, i) => <li key={i}><Notice>{p}</Notice></li>)}
                </ul>
              )}
              {ok && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-sage"><FiCheck aria-hidden="true" />This case is consistent. You can save it.</p>}
              <div className={cx('mt-4 flex gap-3')}>
                <Button variant="ghost" busy={busy === 'validate'} disabled={!text.trim()} onClick={validate}>Check case</Button>
                <Button busy={busy === 'save'} disabled={!text.trim()} onClick={save}>Save case</Button>
              </div>
              <p className="mt-4 text-xs text-ash">Admins can see every case's answers here, so don't play a case you wrote or reviewed.</p>
            </Panel>
          </div>
        )}
      </main>
    </div>
  )
}
