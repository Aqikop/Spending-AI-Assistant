"""SQLite connection and schema. Shared by every repository.

One connection per call, opened and closed by `get_conn`. WAL mode lets the API read while
a write is in progress. Foreign keys are on, so deleting a `sessions` row removes every
row that session owns.
"""

from __future__ import annotations

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = Path(__file__).with_name("schema.sql")

# Bump when schema.sql changes an existing table. IF NOT EXISTS would otherwise skip the
# change silently on a database file created earlier.
SCHEMA_VERSION = 1


def db_path() -> Path:
    """Database file. TEMPORARY: reads DB_PATH here until Settings.DB_PATH exists in config.py."""
    return Path(os.environ.get("DB_PATH", REPO_ROOT / "data" / "app.db"))


def _open(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=5)  # wait up to 5 s if another writer holds the lock
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_conn(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    """Open a connection. Commit on success, roll back on error, always close."""
    conn = _open(path or db_path())
    try:
        yield conn
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema(conn: sqlite3.Connection) -> None:
    """Create every table that does not exist yet. Safe to run twice."""
    current = int(conn.execute("PRAGMA user_version").fetchone()[0])
    if current not in (0, SCHEMA_VERSION):
        raise RuntimeError(
            f"{db_path()} has schema version {current}, the code expects {SCHEMA_VERSION}. "
            "Delete the database file and run `python -m scripts.seed` again."
        )
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
