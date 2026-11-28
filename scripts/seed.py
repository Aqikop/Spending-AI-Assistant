"""Create the schema and load data/seed/ into the shared tables. Safe to run twice.

    python -m scripts.seed

Reads the JSON files, validates them (a typo in a category fails here, not in the demo),
then replaces the contents of every shared table in ONE transaction, so a running API never
sees a half-loaded table. Per-session tables are never touched: a session copies the demo
history from `demo_transactions` when it is created.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from app.domain.categories import Category
from app.repositories.db import get_conn, init_schema
from scripts.validate_seed import SEED_DIR, load, validate

SHARED_TABLES = (
    "merchants", "mcc_codes", "crowd_aggregates", "vouchers", "scenarios",
    "demo_user", "seed_meta", "demo_transactions",
)


class SeedError(Exception):
    """The seed files are inconsistent. The message lists every problem."""


def _j(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _demo_row(t: dict[str, Any]) -> tuple[Any, ...]:
    """One demo_transactions row in schema.sql column order, without bundle_json (added as NULL)."""
    x = t["transaction"]
    decision = _j(t["decision"]) if t["decision"] else None
    return (x["transaction_id"], x["timestamp"], x["amount"], x["channel"],
            x["receiver"]["receiver_id"], _j(x), t["state"], t["category"],
            int(t["is_suggested"]), t["source"], t["confidence"], decision)


def seed_database(seed_dir: Path = SEED_DIR, db_path: Path | None = None) -> dict[str, int]:
    """Merchants, MCC table, crowd aggregates, vouchers, scenarios, the demo user and the demo
    history. Returns the row count of every shared table."""
    problems = validate(seed_dir, {c.value for c in Category})
    if problems:
        raise SeedError("seed files are inconsistent:\n- " + "\n- ".join(problems))

    d = {n: load(seed_dir, n) for n in (
        "merchants", "mcc", "crowd_aggregates", "vouchers", "scenarios",
        "demo_user", "meta", "demo_transactions")}
    user, meta = d["demo_user"], d["meta"]

    with get_conn(db_path) as conn:
        init_schema(conn)
        for table in SHARED_TABLES:
            conn.execute(f"DELETE FROM {table}")  # constant names above, not user input

        conn.executemany("INSERT INTO merchants VALUES (?, ?, ?)",
            [(m["merchant_id"], m["name"], m["category"]) for m in d["merchants"]])
        conn.executemany("INSERT INTO mcc_codes VALUES (?, ?, ?)",
            [(m["mcc"], m["description"], m["category"]) for m in d["mcc"]])
        conn.executemany("INSERT INTO crowd_aggregates VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [(r["receiver_id"], r["distinct_senders"], r["unlabeled"], _j(r["label_counts"]),
              r["typical_amount_range"][0], r["typical_amount_range"][1],
              _j(r["peak_hours"]), _j(r["message_keywords"])) for r in d["crowd_aggregates"]])
        conn.executemany("INSERT INTO vouchers VALUES (?, ?, ?, ?, ?, ?)",
            [(v["voucher_id"], v["title"], v["category"], v["merchant_name"],
              v["description"], v["valid_until"]) for v in d["vouchers"]])
        conn.executemany("INSERT INTO scenarios VALUES (?, ?, ?, ?, ?, ?)",
            [(s["scenario_id"], i, s["title"], s["description"],
              _j(s["transaction"]), _j(s["expected"])) for i, s in enumerate(d["scenarios"])])
        conn.execute("INSERT INTO demo_user VALUES (?, ?, ?)",
            (user["user_id"], user["display_name"], user["monthly_income"]))
        conn.executemany("INSERT INTO seed_meta VALUES (?, ?)", list(meta.items()))
        conn.executemany(
            "INSERT INTO demo_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
            [_demo_row(t) for t in d["demo_transactions"]])

        counts = {}
        for table in SHARED_TABLES:
            counts[table] = int(conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
        return counts


def main() -> int:
    try:
        counts = seed_database()
    except SeedError as e:
        print(e, file=sys.stderr)
        return 1
    for table, n in counts.items():
        print(f"{table:20}{n:>5}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
