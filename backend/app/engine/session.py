"""One player's playthrough of a case. Pure rules: no HTTP, database, or LLM."""

from .case_models import Case, Evidence, Statement

NO_KNOWLEDGE = "I don't know anything about that."
NO_REACTION = "I don't see what that has to do with me."


class GameError(ValueError):
    """An action that the rules do not allow."""


class Session:
    def __init__(self, case: Case):
        self.case = case
        self.restart()

    def restart(self) -> None:
        """Back to a fresh investigation (used by a room's replay)."""
        self.phase = "investigation"  # investigation -> reveal
        self.found: list[str] = []  # evidence ids in discovery order
        self._current: dict[tuple[str, str], Statement] = {}  # statements changed by reactions
        self._heard: list[tuple[str, Statement]] = []  # (suspect id, statement), append-only

    def to_dict(self) -> dict:
        """Everything needed to resume this game later (stored as JSON in the database)."""
        return {
            "phase": self.phase,
            "found": self.found,
            "current": [[s, st.model_dump()] for (s, _), st in self._current.items()],
            "heard": [[s, st.model_dump()] for s, st in self._heard],
        }

    @classmethod
    def from_dict(cls, case: Case, data: dict) -> "Session":
        game = cls(case)
        game.phase = data["phase"]
        game.found = list(data["found"])
        for sid, raw in data["current"]:
            st = Statement.model_validate(raw)
            game._current[(sid, st.topic)] = st
        game._heard = [(sid, Statement.model_validate(raw)) for sid, raw in data["heard"]]
        return game

    def _require_investigating(self) -> None:
        if self.phase != "investigation":
            raise GameError("the investigation is over")

    def _suspect(self, suspect_id: str):
        suspect = self.case.suspect(suspect_id)
        if suspect is None:
            raise GameError(f"unknown suspect '{suspect_id}'")
        return suspect

    def search(self, location: str) -> list[Evidence]:
        """Return evidence newly discovered in a location (empty if nothing new)."""
        self._require_investigating()
        if location not in self.case.locations:
            raise GameError(f"unknown location '{location}'")
        new = [
            e for e in self.case.evidence
            if e.location == location and e.id not in self.found
        ]
        self.found.extend(e.id for e in new)
        return new

    def ask(self, suspect_id: str, topic: str) -> str:
        self._require_investigating()
        suspect = self._suspect(suspect_id)
        if topic not in self.case.topics:
            raise GameError(f"unknown topic '{topic}'")
        statement = self._current.get((suspect_id, topic)) or next(
            (s for s in suspect.statements if s.topic == topic), None
        )
        if statement is None:
            return NO_KNOWLEDGE
        self._heard.append((suspect_id, statement))
        return statement.text

    def present(self, suspect_id: str, evidence_id: str) -> str:
        self._require_investigating()
        suspect = self._suspect(suspect_id)
        if evidence_id not in self.found:
            raise GameError(f"you have not found '{evidence_id}'")
        reaction = next((r for r in suspect.reactions if r.evidence_id == evidence_id), None)
        if reaction is None:
            return NO_REACTION
        if reaction.reveals:
            self._current[(suspect_id, reaction.reveals.topic)] = reaction.reveals
            self._heard.append((suspect_id, reaction.reveals))
        return reaction.text

    def contradictions(self) -> list[dict]:
        """False statements the player has heard AND holds the evidence to refute."""
        out, seen = [], set()
        for suspect_id, st in self._heard:
            key = (suspect_id, st.text)
            if not st.truthful and st.refuted_by in self.found and key not in seen:
                seen.add(key)
                out.append({"suspect": suspect_id, "topic": st.topic,
                            "said": st.text, "refuted_by": st.refuted_by})
        return out

    def journal(self) -> dict:
        return {
            "evidence": [self.case.evidence_item(i).model_dump() for i in self.found],
            "statements": [{"suspect": sid, "topic": st.topic, "text": st.text}
                           for sid, st in self._heard],
            "contradictions": self.contradictions(),
        }

    def accuse(self, suspect_id: str) -> dict:
        self._require_investigating()
        self._suspect(suspect_id)
        sol = self.case.solution
        correct = suspect_id == sol.culprit
        key_found = sum(1 for e in sol.key_evidence if e in self.found)
        self.phase = "reveal"
        return {
            "correct": correct,
            "culprit": sol.culprit,
            "motive": sol.motive,
            "method": sol.method,
            "explanation": sol.explanation,
            "score": (60 if correct else 0) + 10 * key_found,
            "key_evidence_found": f"{key_found}/{len(sol.key_evidence)}",
        }
