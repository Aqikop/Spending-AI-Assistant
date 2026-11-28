"""Checks the files in data/seed/. Used by scripts/seed.py and runnable on its own.

    python -m scripts.validate_seed      # prints the spend table and the crowd numbers

Categories come from the Category enum (domain/categories.py), never retyped here.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

SEED_DIR = Path(__file__).resolve().parents[1] / "data" / "seed"
STORED_STATES = {"AUTO_LABELED", "USER_LABELED", "UNCLASSIFIED"}
UNCLASSIFIED_LABEL = "(unclassified)"


def load(seed_dir: Path, name: str) -> Any:
    return json.loads((seed_dir / f"{name}.json").read_text(encoding="utf-8"))


def _check_crowd(crowd: list[dict[str, Any]], categories: set[str], err: list[str]) -> None:
    for r in crowd:
        rid = r["receiver_id"]
        if sum(r["label_counts"].values()) + r["unlabeled"] != r["distinct_senders"]:
            err.append(f"crowd {rid}: labeled + unlabeled != distinct_senders")
        if r["unlabeled"] < 0:
            err.append(f"crowd {rid}: negative unlabeled")
        if len(r["peak_hours"]) > 3 or not all(0 <= h <= 23 for h in r["peak_hours"]):
            err.append(f"crowd {rid}: peak_hours must be at most 3 hours in 0-23")
        if not set(r["label_counts"]) <= categories:
            err.append(f"crowd {rid}: unknown category in label_counts")
    if len({r["receiver_id"] for r in crowd}) != len(crowd):
        err.append("duplicate crowd receiver")


def _check_transactions(
    txns: list[dict[str, Any]], merchants: dict[str, str], mcc: dict[str, str],
    categories: set[str], demo_today: str, err: list[str],
) -> None:
    seen: set[str] = set()
    for t in txns:
        x, r = t["transaction"], t["transaction"]["receiver"]
        tid = x["transaction_id"]
        if tid in seen:
            err.append(f"duplicate transaction id {tid}")
        seen.add(tid)
        if x["amount"] <= 0:
            err.append(f"{tid}: amount")
        if not x["timestamp"].endswith("+07:00"):
            err.append(f"{tid}: timezone must be +07:00")
        if x["timestamp"][:10] > demo_today:
            err.append(f"{tid}: dated after demo_today")
        if t["state"] not in STORED_STATES:
            err.append(f"{tid}: state {t['state']}")
        if (t["category"] is None) != (t["state"] == "UNCLASSIFIED"):
            err.append(f"{tid}: category and state disagree")
        if t["category"] is not None and t["category"] not in categories:
            err.append(f"{tid}: unknown category {t['category']}")
        if r["merchant_id"] and merchants.get(r["merchant_id"]) != t["category"]:
            err.append(f"{tid}: merchant lookup mismatch")
        if r["mcc"] and mcc.get(r["mcc"]) != t["category"]:
            err.append(f"{tid}: mcc lookup mismatch")
        if t["source"] == "lookup" and not (r["merchant_id"] or r["mcc"]):
            err.append(f"{tid}: lookup row without merchant info")
        d = t["decision"]
        if t["source"] == "AI":
            if d is None or d["transaction_id"] != tid or d["category"] != t["category"]:
                err.append(f"{tid}: decision missing or inconsistent")
            elif t["is_suggested"] != (d["action"] == "SUGGESTED"):
                err.append(f"{tid}: is_suggested disagrees with the decision")
        elif d is not None:
            err.append(f"{tid}: decision on a non-AI row")


def validate(seed_dir: Path, categories: set[str]) -> list[str]:
    """Return a list of problems. Empty means the seed is consistent."""
    err: list[str] = []
    d = {n: load(seed_dir, n) for n in (
        "merchants", "mcc", "crowd_aggregates", "demo_transactions", "vouchers",
        "scenarios", "demo_user", "meta")}
    merchants = {m["merchant_id"]: m["category"] for m in d["merchants"]}
    mcc = {m["mcc"]: m["category"] for m in d["mcc"]}
    crowd = {r["receiver_id"]: r for r in d["crowd_aggregates"]}
    txns, scenarios = d["demo_transactions"], d["scenarios"]

    for row in d["merchants"] + d["mcc"] + d["vouchers"]:
        if row["category"] not in categories:
            err.append(f"unknown category in {row}")
    if len(merchants) != len(d["merchants"]) or len(mcc) != len(d["mcc"]):
        err.append("duplicate merchant_id or mcc")
    if len({v["voucher_id"] for v in d["vouchers"]}) != len(d["vouchers"]):
        err.append("duplicate voucher id")
    _check_crowd(d["crowd_aggregates"], categories, err)
    _check_transactions(txns, merchants, mcc, categories, d["meta"]["demo_today"], err)

    history_receivers = {t["transaction"]["receiver"]["receiver_id"] for t in txns}
    memory_receivers = {
        t["transaction"]["receiver"]["receiver_id"] for t in txns if t["state"] == "USER_LABELED"}
    by_id = {s["scenario_id"]: s for s in scenarios}
    if set(by_id) != {"clear", "weak", "conflicting", "cold_start"}:
        err.append("scenarios must be exactly clear, weak, conflicting, cold_start")
        return err
    for s in scenarios:
        rid = s["transaction"]["receiver"]["receiver_id"]
        if rid in history_receivers or rid in memory_receivers:
            err.append(f"scenario {s['scenario_id']}: receiver appears in the demo history")
    if by_id["cold_start"]["transaction"]["receiver"]["receiver_id"] in crowd:
        err.append("cold_start receiver must have no crowd data")
    clear = crowd.get(by_id["clear"]["transaction"]["receiver"]["receiver_id"])
    if clear is None:
        err.append("clear scenario has no crowd data")
    else:
        n = clear["distinct_senders"]
        if n < 15:
            err.append("clear scenario needs at least 15 distinct senders")
        if max(clear["label_counts"].values()) / n < 0.60:
            err.append("clear scenario: top category must be at least 60% of ALL distinct senders")
        if 1 - clear["unlabeled"] / n < 0.85:
            err.append("clear scenario: at least 85% of senders must be labeled")
    month = d["meta"]["demo_today"][:7]
    this_month = sum(1 for t in txns if t["transaction"]["timestamp"][:7] == month)
    if not 30 <= this_month <= 50:
        err.append(f"this month has {this_month} transactions, want 30 to 50")
    return err


def report(seed_dir: Path) -> None:
    """Print the spend table and the crowd numbers behind each scenario."""
    txns = load(seed_dir, "demo_transactions")
    crowd = {r["receiver_id"]: r for r in load(seed_dir, "crowd_aggregates")}
    income = load(seed_dir, "demo_user")["monthly_income"]
    today = load(seed_dir, "meta")["demo_today"]
    this_m, last_m = today[:7], f"{today[:5]}{int(today[5:7]) - 1:02d}"
    spend: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for t in txns:
        x = t["transaction"]
        spend[x["timestamp"][:7]][t["category"] or UNCLASSIFIED_LABEL] += x["amount"]
    print(f"{'Category':26}{'This month':>12}{'Last month':>12}{'Change':>9}{'% income':>10}")
    for c in sorted(spend[this_m], key=lambda c: -spend[this_m][c]):
        n, o = spend[this_m][c], spend[last_m][c]
        change = f"{(n - o) / o * 100:+.0f}%" if o else "n/a"
        print(f"{c:26}{n:>12,}{o:>12,}{change:>9}{n / income * 100:>9.1f}%")
    total = sum(spend[this_m].values())
    last_total = sum(spend[last_m].values())
    print(f"{'TOTAL':26}{total:>12,}{last_total:>12,}{'':>9}{total / income * 100:>9.1f}%\n")
    print(f"{'Receiver':24}{'Senders':>8}{'Labeled':>9}{'Top share':>10}{'Top-2 gap':>10}")
    names = {s["transaction"]["receiver"]["receiver_id"]: f"scenario {s['scenario_id']}"
             for s in load(seed_dir, "scenarios")}
    for t in txns:
        if t["state"] == "UNCLASSIFIED":
            names.setdefault(t["transaction"]["receiver"]["receiver_id"], "pending item")
    for rid, label in names.items():
        r = crowd.get(rid)
        if r is None:
            print(f"{label:24}{'0':>8}   (no crowd data)")
            continue
        n = r["distinct_senders"]
        top = sorted((c / n for c in r["label_counts"].values()), reverse=True) + [0.0]
        labeled = 1 - r["unlabeled"] / n
        print(f"{label:24}{n:>8}{labeled:>9.0%}{top[0]:>10.0%}{top[0] - top[1]:>10.0%}")


def main() -> int:
    from app.domain.categories import Category

    problems = validate(SEED_DIR, {c.value for c in Category})
    report(SEED_DIR)
    print("\nOK" if not problems else "\nPROBLEMS:\n" + "\n".join(problems))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
