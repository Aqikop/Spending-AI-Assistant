Simulated data only. Every name, account number and merchant here is invented for the contest demo.

Files
- `merchants.json`: 19 mock MoMo merchants (merchant_id -> category)
- `mcc.json`: 15 MCC codes (mcc -> category)
- `crowd_aggregates.json`: per receiver label COUNTS, one label per distinct sender. `label_distribution` is computed by `CrowdRepo`, never stored
- `demo_transactions.json`: 63 labeled transactions, Oct (25, full month) and Nov (38, through Nov 25). Each row wraps a `TransactionIn` with `state`, `category`, `is_suggested`, `source` (lookup / memory / AI / user), `confidence` and `decision` (null unless source is AI)
- `vouchers.json`: 8 mock vouchers, cuttable categories only. No `why` text: the advice flow writes it
- `scenarios.json`: the 4 acceptance scenarios with expected outcomes. Their receivers never appear in the demo history
- `demo_user.json`, `meta.json`: demo user with income, and `demo_today` (2026-11-25)
- `validate_seed.py`: run it after every edit

Rules seed.py must follow
- Per-session memory = every USER_LABELED transaction's receiver (3 rows)
- Aging demo, with UNCLASSIFIED_AGING_DAYS = 7: unclassified items are 13, 5 and 1 days old, so fast-forward 0 ages 1 item, 3 ages 2, 7 ages all 3
- Channels used: MOMO_MERCHANT, VIETQR_MERCHANT, VIETQR_P2P
