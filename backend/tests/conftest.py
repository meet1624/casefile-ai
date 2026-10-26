import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.ai import get_provider
from app.ai.mock import MockProvider
from app.db import Base, get_db
from app.main import app
from app.ratelimit import login_failures, registrations

PASSWORD = "correct-horse-battery"


@pytest.fixture
def client():
    """A client backed by a fresh in-memory database, so tests never touch casefile.db."""
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    maker = sessionmaker(engine, expire_on_commit=False)

    def override():
        with maker() as db:
            yield db

    login_failures.reset(); registrations.reset()
    app.dependency_overrides[get_db] = override
    app.dependency_overrides[get_provider] = MockProvider
    with TestClient(app) as test_client:  # `with` keeps one event loop, so websockets and REST share it
        yield test_client
    app.dependency_overrides.clear()


def register_and_login(client, username="detective") -> dict:
    """Create a user and return the Authorization header for them."""
    assert client.post("/auth/register", json={"username": username, "password": PASSWORD}).status_code == 201
    r = client.post("/auth/login", data={"username": username, "password": PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth(client):
    return register_and_login(client)
