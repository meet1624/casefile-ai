"""Request bodies. FastAPI rejects anything that does not match with a 422."""

from pydantic import BaseModel, Field

Short = Field(min_length=1, max_length=50)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class SearchRequest(BaseModel):
    location: str = Short


class AskRequest(BaseModel):
    suspect: str = Short
    topic: str = Short
    question: str | None = Field(default=None, max_length=200)  # flavour only, never changes the facts


class PresentRequest(BaseModel):
    suspect: str = Short
    evidence: str = Short


class AccuseRequest(BaseModel):
    suspect: str = Short


class JoinRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)


class VoteRequest(BaseModel):
    suspect: str = Short


class CreateRoomRequest(BaseModel):
    case_id: str = Short
