Simulated data only. Every name, account number and merchant here is invented for the contest demo.

## Files
- `merchants.json`: 19 mock MoMo merchants (merchant_id -> category). Merchants have no crowd data
- `mcc.json`: 15 MCC codes (mcc -> category)
- `crowd_aggregates.json`: crowd data per receiver over the last 30 days. `label_counts` holds the number of senders who assigned each category, `unlabeled` the senders who assigned none, so `sum(label_counts) + unlabeled = distinct_senders`. Shares are computed by `CrowdRepo` as count / distinct_senders (an "unlabeled" share is therefore implied). At most 3 `peak_hours`
- `demo_transactions.json`: 63 labeled transactions, Oct (25, full month) and Nov (38, through Nov 25). Each row wraps a `TransactionIn` with `state`, `category`, `is_suggested`, `source` (lookup / memory / AI / user), `confidence` and `decision` (null unless source is AI)
- `vouchers.json`: 8 mock vouchers, cuttable categories only. No `why` text: the advice flow writes it
- `scenarios.json`: the 4 acceptance scenarios with expected outcomes. Their receivers never appear in the demo history
- `demo_user.json`, `meta.json`: demo user with income, and `demo_today` (2026-11-25)
- `validate_seed.py`: run it after every edit. It also prints the spend table and the crowd numbers behind each scenario

## Rules seed.py must follow
- Per-session memory = every USER_LABELED transaction's receiver (3 rows)
- The seed crowd data describes OTHER senders. A user's tap adds one sender with one label (see promotion below)
- Channels used: MOMO_MERCHANT, VIETQR_MERCHANT, VIETQR_P2P
- Aging demo, with UNCLASSIFIED_AGING_DAYS = 7: unclassified items are 13, 5 and 1 days old, so fast-forward 0 ages 1 item, 3 ages 2, 7 ages all 3. An aged item gets category `Other` and stays UNCLASSIFIED

## Decisions this seed follows
- Established receivers are 90%+ labeled and the clear scenario has 71% of all 38 senders on Food & Drink, so the guard rule "agreement >= 60% of all distinct senders" can be met. Weak and new receivers have many unlabeled senders on purpose
- A receiver with no crowd row (cold start, third pending item) is capped at Low
- The AI decisions inside the demo history are hand-written, not logged engine runs. The README of the submission must say the demo history is pre-seeded and simulated
- Peak-hour clue: a payment is at a peak hour when its hour is within 1 hour of a peak hour (wrapping past midnight). Every AI row in the demo history is at a peak hour (the generator asserts it)

## Promotion demo (draft thresholds: at least 6 senders and at least 60% agreement, NOT final)
- `DO THI NGOC` (pending item, 5 senders, 3 labeled Food & Drink): tap Food & Drink -> 6 senders, 67% -> promoted into the crowd data
- `NGUYEN THANH SON` (2 senders, both Personal transfer): a mistaken Food & Drink tap -> 3 senders, 33% -> stays in the user's memory only
