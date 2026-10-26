from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from app.db import Base

BACKEND = Path(__file__).parent.parent


def test_migrations_build_exactly_the_models_schema(tmp_path):
    url = f"sqlite:///{tmp_path / 'test.db'}"
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)

    command.upgrade(cfg, "head")

    engine = create_engine(url)
    assert {"users", "games"} <= set(inspect(engine).get_table_names())
    with engine.connect() as conn:
        # an empty diff means a forgotten migration would fail this test
        assert compare_metadata(MigrationContext.configure(conn), Base.metadata) == []

    command.downgrade(cfg, "base")
    assert "games" not in inspect(create_engine(url)).get_table_names()
