# Casefile AI: Project Status

## Architecture
Deterministic engine (`backend/app/engine`) owns all facts. LLM (later) only phrases answers; output is validated.
Engine has no HTTP, DB, or LLM imports. `app/api` is a thin HTTP layer; `app/models.py` + `app/db.py` hold persistence.

## Done
- Milestone 1: case models + consistency checks, "The Midnight Gala" case, Session rules, terminal CLI.
- Milestone 2: FastAPI server (new game, search, ask, present, journal, accuse), input validation.
- Milestone 3: SQLite + SQLAlchemy 2.x, Alembic migration, register/login (scrypt + JWT), games owned by users and saved in the database.
- Milestone 4: AI provider layer (mock + Ollama), reply validator, automatic fallback to the case file, /ai/status.
- Milestone 5: multiplayer rooms (room codes, up to 6 players), shared investigation, voting with ties and scoring, replay, WebSocket live updates with presence and reconnect. 152 tests.

## Current state
Single-player games and multiplayer rooms over HTTP, with live WebSocket events for rooms. Games and rooms survive restarts. Suspects can be reworded by a local model (off by default). No frontend yet.

## Commands (from `backend/`, conda env `casefile`)
- First time and after pulling changes: `alembic upgrade head`  (creates/updates casefile.db)
- Run server: `python -m uvicorn app.main:app --reload`  (docs at http://127.0.0.1:8000/docs)
- Test: `python -m pytest -q`
- Play in terminal (no login, no DB): `python -m app.cli`

## API
Public: GET /health, GET /case, POST /auth/register, POST /auth/login
Public: GET /ai/status (which provider, is it ready)
Needs login: GET /auth/me, POST /games, POST /games/{id}/search|ask|present|accuse, GET /games/{id}/journal
Rooms (all need login): POST /rooms, GET /rooms (mine), POST /rooms/join {code}, GET /rooms/{code},
  host only: POST /rooms/{code}/start | voting | reveal | replay
  members: POST /rooms/{code}/search | ask | present (investigation phase), POST /rooms/{code}/vote (voting phase)
Errors: 400 rule violation, 401 not logged in, 403 host-only action, 404 unknown game or room (also other people's), 409 wrong phase / already voted / room full / username taken, 422 malformed body.

## Rooms
- Phases: lobby -> investigation -> voting -> reveal; replay goes reveal -> lobby (same players, fresh case, votes cleared).
- The team shares one investigation. Votes are secret until the reveal; everyone voting reveals automatically, or the host can close voting early.
- Verdict = most votes. A tie for first (or no votes) gives no group verdict. Scores are per player: 10 for voting + 10 per key clue the team found + 50 for a correct vote (max 100); no vote scores 0.
- Concurrency: the room row has a version column (optimistic locking). If two players act at the same moment, the loser's change is redone on top of the winner's, up to 5 times, then 409.

## WebSocket: /ws/rooms/{code}
Connect, then send {"token": "<login token>"} as the first message (5 second limit). Refused with close code 4401 (not logged in) or 4403 (no such room / not a member).
You first get {"type":"state","room":{...}} (full state, same as GET /rooms/{code}) then events:
player_joined, presence {online:[...]}, phase {phase, result on reveal}, evidence_found, statement, vote_cast (count only, never who for).
Reconnecting is always safe: you start from a fresh full state.

## Config (environment variables, all optional locally)
- SECRET_KEY: signs login tokens. If unset, one is generated once into backend/.secret_key (git-ignored).
- DATABASE_URL: defaults to SQLite file backend/casefile.db.
- TOKEN_MINUTES: login lifetime, default 60.
- AI_PROVIDER: `mock` (default, scripted) or `ollama`. OLLAMA_MODEL (default llama3.2:3b), OLLAMA_URL (default http://127.0.0.1:11434), OLLAMA_TIMEOUT (default 30 seconds).

## AI design
- The engine picks the line a suspect says. The model only rewords it, and is never given secrets, motives, or the solution.
- Every model reply is checked (`app/ai/validator.py`): times/numbers unchanged, same meaning, no new names, no leaked hidden text, no banned phrases, no markdown, max length. Any failure, timeout, or outage falls back to the case-file line (`source: scripted`).
- The journal and contradiction detection always use the official wording, never the AI's.
- Player question text is untrusted: fenced off in the prompt, and the validator is the safety net.

## Decisions
- SQLite first, PostgreSQL later (change DATABASE_URL; Alembic and SQLAlchemy stay the same).
- Passwords hashed with stdlib scrypt (no extra dependency). Usernames are case-insensitive.
- Game state stored as one JSON column for now.
- Mock AI provider is the default; Ollama is optional and was tested only against a fake server so far, not a real model. Hardware: GTX 1650, 4 GB VRAM, 7.9 GB RAM.

## Known issues
- Single-player games (/games) can still lose an update if two requests hit the same game at once; rooms are protected.
- No leave-room or kick yet. The connection hub is in memory, so it works for one server process only.
- A very slow WebSocket client can delay events to others in its room (no send timeout yet).
- Tokens cannot be revoked before they expire; there is no logout endpoint (client just discards the token).
- Frontend verified in headless Chromium (full flow, 2 players, desktop + phone width), not by hand on your machine yet.

## Milestone 6: React frontend (done)
Screens: landing, log in / register, lobby (play solo, create room, join by code), waiting room, case briefing, suspect selection, interrogation, evidence and journal, voting, reveal and scores.
Run (two terminals):
- Backend, in `backend`: `conda activate casefile`, `pip install -r requirements.txt`, `alembic upgrade head`, `python -m uvicorn app.main:app --port 8000`
- Frontend, in `frontend`: `npm install`, `npm run dev`, then open http://127.0.0.1:5173
Use two browser windows (one private) to play as two people.

## Phase 7: hardening (done so far)
- Login lockout (5 failures per username+address per 5 minutes, 429 with Retry-After) and registration cap (10 per hour per address). In memory, resets on restart. 160 tests pass.
- README.md added with run steps, Ollama steps, settings, security notes.

## Admin case management (done)
- Admins add cases as JSON on the Cases page (header link, admins only). Every case is checked before saving (`Case.problems()`), with the reasons shown. Cases can be disabled or deleted (not while rooms use them). The built-in case can't be changed.
- Rooms remember their case (`rooms.case_id`, migration 0003, new `cases` table). The lobby shows a case picker once there is more than one. Run `alembic upgrade head` after updating.
- Who is admin: the usernames in `ADMIN_USERNAMES` (comma separated), or if unset, the first account ever created.
- No editing of a saved case (live rooms depend on its exact ids); copy it under a new id instead. 169 tests pass.

## More cases (done)
- `cases/` holds two extra cases: *The Vanishing Violin* (3 suspects, easier) and *Death on the Blackwater Express* (5 suspects, harder). Add them on the Cases page with "Open a .json file", then Check case and Save case.
- A test plays each case through the engine: every exhibit is findable, the culprit can always be caught in a lie, and a perfect game scores exactly 100.
- Typed questions now match a topic (a typed question used to always get the "where were you" answer).

## Next
Try a real Ollama model and tune the validator; send timeout for slow WebSocket clients.


## Cinematic frontend (latest)

The frontend is a game, not a dashboard: intro, archive of case folders, suspect lineup, interrogation room, evidence board, voting and a staged reveal.

- **Characters** (`frontend/src/characters/`): 12 hand-specified suspects keyed by stable suspect id, plus a seeded generator for admin-added cases. Layered SVG; blink, breathing, gaze, head tilt and mouth are animated individually. Gallery at `/cast`.
- **Expressions never leak the truth.** They come from each suspect's public personality line and from what the player just did (asking, presenting an exhibit, waiting), never from whether the answer was true.
- **Evidence board:** threads are drawn only for real relationships: contradictions in the journal and exhibits you showed to a suspect. Layout and zoom are saved per room in localStorage.
- **Reveal** uses only the server's `result`. It has a Skip button and is skipped automatically under reduced motion.
- **Sound** is synthesized in the browser, off by default, toggle in the header. The intro plays once per browser session.
- Limitations: portraits are stylized vector art, not painted; the board has no pinch-zoom (use the zoom buttons on touch); AI-worded answers are unchanged.
