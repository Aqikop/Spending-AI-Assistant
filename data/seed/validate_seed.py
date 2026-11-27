"""Checks the seed files. Run: python validate_seed.py [seed_dir]. Exit code 1 on any problem."""
import json, sys
from collections import defaultdict
from pathlib import Path

D = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent)
load = lambda n: json.loads((D / f"{n}.json").read_text(encoding="utf-8"))
CATS = {"Food & Drink","Groceries & Market","Transport","Shopping","Entertainment & Outdoor",
        "Bills & Utilities","Housing & Rent","Health & Education","Personal transfer","Other"}
FIXED = {"Housing & Rent","Bills & Utilities","Health & Education"}
STATES = {"AUTO_LABELED","USER_LABELED","UNCLASSIFIED"}
errors = []
def check(ok, msg):
    if not ok: errors.append(msg)

merchants, mcc, crowd = load("merchants"), load("mcc"), load("crowd_aggregates")
txns, vouchers, scenarios = load("demo_transactions"), load("vouchers"), load("scenarios")
user, meta = load("demo_user"), load("meta")
M = {m["merchant_id"]: m["category"] for m in merchants}
C = {m["mcc"]: m["category"] for m in mcc}
CR = {r["receiver_id"]: r for r in crowd}

for m in merchants + mcc + vouchers: check(m["category"] in CATS, f"bad category in {m}")
check(len(M) == len(merchants), "duplicate merchant_id")
for r in crowd:
    check(sum(r["label_counts"].values()) == r["distinct_senders"], f"label_counts != distinct_senders for {r['receiver_id']}")
    check(all(k in CATS for k in r["label_counts"]), f"bad label in crowd {r['receiver_id']}")
check(len(CR) == len(crowd), "duplicate crowd receiver")
check(len({v["voucher_id"] for v in vouchers}) == len(vouchers), "duplicate voucher id")
check(all(v["category"] not in FIXED | {"Personal transfer", "Other"} for v in vouchers), "voucher on a non-cuttable category")

ids = set(); month = defaultdict(lambda: defaultdict(int)); count = defaultdict(int); unclassified = defaultdict(int)
for t in txns:
    x = t["transaction"]; r = x["receiver"]; tid = x["transaction_id"]
    check(tid not in ids, f"duplicate transaction id {tid}"); ids.add(tid)
    check(x["amount"] > 0, f"{tid}: amount")
    check(x["timestamp"].endswith("+07:00"), f"{tid}: timezone")
    check(t["state"] in STATES, f"{tid}: state")
    check((t["category"] is None) == (t["state"] == "UNCLASSIFIED"), f"{tid}: category/state mismatch")
    check(t["category"] is None or t["category"] in CATS, f"{tid}: category")
    check(x["timestamp"][:10] <= meta["demo_today"], f"{tid}: dated after demo_today")
    if r["merchant_id"]: check(M.get(r["merchant_id"]) == t["category"], f"{tid}: merchant lookup mismatch")
    if r["mcc"]:         check(C.get(r["mcc"]) == t["category"], f"{tid}: mcc lookup mismatch")
    if t["source"] == "lookup": check(r["merchant_id"] or r["mcc"], f"{tid}: lookup without merchant info")
    if t["source"] == "AI":
        d = t["decision"]; check(d is not None and d["transaction_id"] == tid, f"{tid}: decision missing")
        check(d["category"] == t["category"], f"{tid}: decision/category mismatch")
        check(t["is_suggested"] == (d["action"] == "SUGGESTED"), f"{tid}: suggested flag")
    else: check(t["decision"] is None, f"{tid}: unexpected decision")
    m = x["timestamp"][:7]; count[m] += 1
    if t["state"] == "UNCLASSIFIED": unclassified[m] += 1
    month[m][t["category"] or "Other"] += x["amount"]

for s in scenarios:
    check(s["transaction"]["receiver"]["receiver_id"] not in {t["transaction"]["receiver"]["receiver_id"] for t in txns},
          f"scenario {s['scenario_id']} receiver appears in demo history (would break the scenario)")
check(len(scenarios) == 4, "need exactly 4 scenarios")
check(CR[scenarios[0]["transaction"]["receiver"]["receiver_id"]]["distinct_senders"] >= 15, "clear scenario needs >= 15 senders")
check(scenarios[3]["transaction"]["receiver"]["receiver_id"] not in CR, "cold start receiver must have no crowd data")
check(30 <= count["2026-11"] <= 50, f"this month has {count['2026-11']} transactions, want 30 to 50")

# memory that seed.py must create per session: every USER_LABELED receiver
memory = {t["transaction"]["receiver"]["receiver_id"]: t["category"] for t in txns if t["state"] == "USER_LABELED"}
check(not any(s["transaction"]["receiver"]["receiver_id"] in memory for s in scenarios), "scenario receiver in user memory")

income = user["monthly_income"]
print(f"transactions: Nov {count['2026-11']} ({unclassified['2026-11']} unclassified), Oct {count['2026-10']}")
print(f"memory rows to create: {len(memory)}\n")
print(f"{'Category':26}{'Nov':>11}{'Oct':>11}{'Change':>9}{'% income':>10}")
for c in sorted(CATS, key=lambda c: -month['2026-11'][c]):
    n, o = month['2026-11'][c], month['2026-10'][c]
    ch = f"{(n-o)/o*100:+.0f}%" if o else "n/a"
    print(f"{c:26}{n:>11,}{o:>11,}{ch:>9}{n/income*100:>9.1f}%")
tn, to = sum(month['2026-11'].values()), sum(month['2026-10'].values())
print(f"{'TOTAL':26}{tn:>11,}{to:>11,}{'':>9}{tn/income*100:>9.1f}%")
print("\nOK" if not errors else "\nPROBLEMS:\n" + "\n".join(errors))
sys.exit(1 if errors else 0)
