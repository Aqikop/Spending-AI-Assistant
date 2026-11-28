"""Schema and seed loading. Needs the Category enum from app/domain/categories.py (owner A)."""

from __future__ import annotations

import json
import shutil
import sqlite3
from pathlib import Path

import pytest

from app.repositories.db import get_conn, init_schema
from scripts.seed import SEED_DIR, SeedError, seed_database

PER_SESSION = ("profiles", "transactions", "user_memory", "crowd_overlay")
TXN_COLS = (
    "transaction_id, timestamp, amount, channel, receiver_id, transaction_json, state, "
    "category, is_suggested, source, confidence, decision_json, bundle_json"
)


def new_session(conn: sqlite3.Connection, sid: str) -> None:
    """Reference copy of what ensure_session must do: demo history, profile, memory."""
    conn.execute("INSERT INTO sessions (session_id) VALUES (?)", (sid,))
    conn.execute(
        "INSERT INTO profiles SELECT ?, user_id, display_name, monthly_income FROM demo_user",
        (sid,))
    conn.execute(
        f"INSERT INTO transactions (session_id, {TXN_COLS}) "
        f"SELECT ?, {TXN_COLS} FROM demo_transactions", (sid,))
    conn.execute(  # latest USER_LABELED row per receiver wins
        "INSERT OR REPLACE INTO user_memory SELECT ?, receiver_id, category FROM demo_transactions "
        "WHERE state = 'USER_LABELED' ORDER BY timestamp", (sid,))


def count(conn: sqlite3.Connection, table: str, sid: str | None = None) -> int:
    sql = f"SELECT COUNT(*) FROM {table}" + (" WHERE session_id = ?" if sid else "")
    return int(conn.execute(sql, (sid,) if sid else ()).fetchone()[0])


def test_seed_twice_gives_same_counts(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    first, second = seed_database(db_path=db), seed_database(db_path=db)
    assert first == second
    assert first["demo_transactions"] == 63
    assert first["scenarios"] == 4 and first["demo_user"] == 1


def test_sessions_are_isolated_and_reset_cascades(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    seed_database(db_path=db)
    with get_conn(db) as conn:
        new_session(conn, "a")
        new_session(conn, "b")
        assert count(conn, "transactions", "a") == count(conn, "transactions", "b") == 63
        conn.execute("DELETE FROM sessions WHERE session_id = 'a'")
        assert all(count(conn, t, "a") == 0 for t in PER_SESSION)
        assert count(conn, "transactions", "b") == 63 and count(conn, "user_memory", "b") == 3
        assert count(conn, "demo_transactions") == 63  # shared table untouched


def test_memory_is_the_user_labeled_receivers(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    seed_database(db_path=db)
    with get_conn(db) as conn:
        new_session(conn, "a")
        memory = {r["receiver_id"]: r["category"]
                  for r in conn.execute("SELECT * FROM user_memory")}
        rows = conn.execute(
            "SELECT transaction_json FROM transactions WHERE state = 'USER_LABELED'").fetchall()
    names = {json.loads(r["transaction_json"])["receiver"]["display_name"] for r in rows}
    assert names == {"LE VAN BAO", "PHAM THI LAN", "TRAN BICH NGOC"} and len(memory) == 3


def test_labeled_row_without_category_is_rejected(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    seed_database(db_path=db)
    with get_conn(db) as conn:
        new_session(conn, "a")
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                "UPDATE transactions SET category = NULL "
                "WHERE session_id = 'a' AND state = 'AUTO_LABELED'")


def test_unknown_session_is_rejected(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    seed_database(db_path=db)
    with get_conn(db) as conn, pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO user_memory VALUES ('nobody', 'R1', 'Transport')")


def test_seed_rejects_unknown_category_before_touching_the_database(tmp_path: Path) -> None:
    bad = tmp_path / "seed"
    shutil.copytree(SEED_DIR, bad)
    merchants = json.loads((bad / "merchants.json").read_text(encoding="utf-8"))
    merchants[0]["category"] = "Food and Drink"  # typo
    (bad / "merchants.json").write_text(json.dumps(merchants), encoding="utf-8")
    db = tmp_path / "t.db"
    with pytest.raises(SeedError, match="unknown category"):
        seed_database(seed_dir=bad, db_path=db)
    assert not db.exists()


def test_schema_version_mismatch_is_a_clear_error(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    with get_conn(db) as conn:
        conn.execute("PRAGMA user_version = 99")
    with get_conn(db) as conn, pytest.raises(RuntimeError, match="Delete the database file"):
        init_schema(conn)
