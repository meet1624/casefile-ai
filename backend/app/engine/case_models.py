"""Case data models and consistency checks.

Pure Python + Pydantic. No HTTP, database, or LLM imports allowed here.
"""

import json
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


class Statement(BaseModel):
    topic: str
    text: str
    truthful: bool = True
    refuted_by: str | None = None  # evidence id that exposes a false statement

    @model_validator(mode="after")
    def _check_proof(self):
        if not self.truthful and not self.refuted_by:
            raise ValueError(f"false statement on '{self.topic}' needs refuted_by")
        if self.truthful and self.refuted_by:
            raise ValueError(f"true statement on '{self.topic}' cannot be refuted")
        return self


class Reaction(BaseModel):
    """What a suspect says when shown a piece of evidence."""

    evidence_id: str
    text: str
    reveals: Statement | None = None  # replaces the suspect's old statement on that topic


class Suspect(BaseModel):
    id: str
    name: str
    role: str
    personality: str
    background: str
    motive: str
    secret: str
    statements: list[Statement]
    reactions: list[Reaction] = Field(default_factory=list)


class Evidence(BaseModel):
    id: str
    name: str
    location: str
    description: str


class TimelineEvent(BaseModel):
    time: str = Field(pattern=TIME_PATTERN)
    text: str


class Solution(BaseModel):
    culprit: str
    motive: str
    method: str
    key_evidence: list[str]
    explanation: str


class Case(BaseModel):
    id: str
    title: str
    setting: str
    victim: str
    briefing: str
    locations: list[str]
    topics: list[str]
    topic_labels: dict[str, str]  # the question a player asks for each topic
    suspects: list[Suspect]
    evidence: list[Evidence]
    timeline: list[TimelineEvent]  # private ground truth
    solution: Solution  # private

    def suspect(self, suspect_id: str) -> Suspect | None:
        return next((s for s in self.suspects if s.id == suspect_id), None)

    def evidence_item(self, evidence_id: str) -> Evidence | None:
        return next((e for e in self.evidence if e.id == evidence_id), None)

    def public_briefing(self) -> dict:
        """The only view of the case a player may see before the reveal."""
        return {
            "id": self.id,
            "title": self.title,
            "setting": self.setting,
            "victim": self.victim,
            "briefing": self.briefing,
            "locations": self.locations,
            "topics": self.topics,
            "topic_labels": self.topic_labels,
            "suspects": [
                {"id": s.id, "name": s.name, "role": s.role, "personality": s.personality}
                for s in self.suspects
            ],
        }

    def problems(self) -> list[str]:
        """Return a list of logical problems; an empty list means the case is consistent."""
        out: list[str] = []
        suspect_ids = [s.id for s in self.suspects]
        evidence_ids = [e.id for e in self.evidence]

        if not 3 <= len(self.suspects) <= 5:
            out.append("a case needs 3 to 5 suspects")
        if len(set(suspect_ids)) != len(suspect_ids):
            out.append("duplicate suspect ids")
        if len(set(evidence_ids)) != len(evidence_ids):
            out.append("duplicate evidence ids")

        if set(self.topic_labels) != set(self.topics):
            out.append("every topic needs exactly one label in topic_labels")

        for e in self.evidence:
            if e.location not in self.locations:
                out.append(f"evidence '{e.id}' is in unknown location '{e.location}'")

        times = [t.time for t in self.timeline]
        if times != sorted(times):
            out.append("timeline is not in chronological order")

        sol = self.solution
        if sol.culprit not in suspect_ids:
            out.append(f"culprit '{sol.culprit}' is not a suspect")
        for ev in sol.key_evidence:
            if ev not in evidence_ids:
                out.append(f"key evidence '{ev}' does not exist")

        for s in self.suspects:
            topics = [st.topic for st in s.statements]
            if "whereabouts" not in topics:
                out.append(f"suspect '{s.id}' has no whereabouts statement")
            for st in s.statements:
                if st.topic not in self.topics:
                    out.append(f"'{s.id}' talks about unknown topic '{st.topic}'")
                if st.refuted_by and st.refuted_by not in evidence_ids:
                    out.append(f"'{s.id}' statement refuted by unknown evidence '{st.refuted_by}'")
            for r in s.reactions:
                if r.evidence_id not in evidence_ids:
                    out.append(f"'{s.id}' reacts to unknown evidence '{r.evidence_id}'")
                if r.reveals and r.reveals.topic not in topics:
                    out.append(f"'{s.id}' reveal replaces unknown topic '{r.reveals.topic}'")

        culprit = self.suspect(sol.culprit)
        if culprit:
            exposed = [
                st for st in culprit.statements
                if not st.truthful and st.refuted_by in sol.key_evidence
            ]
            if not exposed:
                out.append("culprit has no lie that key evidence can expose (airtight alibi)")
        return out


def load_case(path: str | Path) -> Case:
    case = Case.model_validate(json.loads(Path(path).read_text(encoding="utf-8")))
    problems = case.problems()
    if problems:
        raise ValueError("inconsistent case: " + "; ".join(problems))
    return case
