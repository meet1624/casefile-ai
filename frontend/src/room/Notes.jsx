import { Empty } from '../components/ui'
import Seal from '../components/Seal'
import { cx, exhibitLetter } from '../lib'

/** What the team has established: contradictions first, then every statement, then recent activity. */
export default function Notes({ room, feed, showFeed = true }) {
  const { journal } = room
  const labels = room.case.topic_labels ?? {}
  const suspects = room.case.suspects
  const nameOf = (id) => suspects.find((s) => s.id === id)?.name ?? id
  const said = journal.statements.filter((st, i, a) => a.findIndex((o) => o.suspect === st.suspect && o.text === st.text) === i)
  const exhibitIndex = (id) => journal.evidence.findIndex((e) => e.id === id)

  return (
    <div className="space-y-7 p-4">
      <section aria-labelledby="notes-contradictions">
        <h3 id="notes-contradictions" className="font-hand text-[28px] leading-none text-brass-light">Contradictions</h3>
        {journal.contradictions.length === 0 ? (
          <Empty className="px-0 pb-0 text-left">None yet. Ask a suspect where they were, then find evidence that says otherwise.</Empty>
        ) : (
          <ul className="mt-3 space-y-3">
            {journal.contradictions.map((c) => {
              const i = exhibitIndex(c.refuted_by)
              return (
                <li key={`${c.suspect}-${c.refuted_by}`} className="rounded-md border border-oxblood-deep bg-oxblood-deep/15 p-3.5">
                  <p className="font-hand text-[28px] leading-none text-brass-light">{nameOf(c.suspect)} said</p>
                  <blockquote className="mt-1 border-l-2 border-oxblood pl-3 text-[15px] italic leading-snug">“{c.said}”</blockquote>
                  <p className="mt-2 text-sm text-ash">
                    But Exhibit {exhibitLetter(i)}, <span className="text-bone">{journal.evidence[i]?.name}</span>, says otherwise.
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="notes-statements">
        <h3 id="notes-statements" className="font-hand text-[28px] leading-none text-brass-light">What they have told you</h3>
        {said.length === 0 ? (
          <Empty className="px-0 pb-0 text-left">Nothing yet. Interview a suspect and their answers are logged here.</Empty>
        ) : (
          <div className="mt-3 space-y-5">
            {suspects.filter((s) => said.some((st) => st.suspect === s.id)).map((s) => (
              <div key={s.id}>
                <p className="flex items-center gap-2 font-display text-lg"><Seal id={s.id} name={s.name} size={24} />{s.name}</p>
                <ul className="mt-2 space-y-2.5 border-l border-hairline pl-4">
                  {said.filter((st) => st.suspect === s.id).map((st, i) => (
                    <li key={i}>
                      <p className="text-xs text-ash">{labels[st.topic] ?? st.topic}</p>
                      <p className="text-[14.5px] leading-snug">{st.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {showFeed && (
        <section aria-labelledby="notes-activity">
          <h3 id="notes-activity" className="font-hand text-[28px] leading-none text-brass-light">Room activity</h3>
          {feed.length === 0 ? (
            <Empty className="px-0 pb-0 text-left">What you and your teammates do shows up here.</Empty>
          ) : (
            <ul className="mt-3 space-y-2" aria-live="polite" aria-relevant="additions">
              {[...feed].reverse().slice(0, 25).map((f) => (
                <li key={f.id} className="flex gap-3 text-sm">
                  <time className="w-11 shrink-0 text-ash tabular-nums">{f.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  <span className={cx(f.kind === 'phase' && 'font-semibold text-brass-light')}>{f.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
