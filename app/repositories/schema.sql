-- SQLite schema. Loaded by app/repositories/db.py:init_schema, safe to run twice.
-- Rules:
--   * Shared seed tables are written only by scripts/seed.py and are read-only at runtime.
--   * Per-session tables carry session_id and cascade from `sessions`, so deleting the
--     sessions row removes everything a session owns (reset = delete, then reload demo).
--   * Categories are NOT checked here. They live in one enum (domain/categories.py),
--     validated by scripts/seed.py and by Pydantic.
--   * Timestamps are ISO 8601 text with the +07:00 offset. Same offset everywhere,
--     so text order equals time order.
--   * JSON columns hold whole Pydantic models, so a model tweak needs no schema change.

-- ---------------------------------------------------------------- shared seed tables

CREATE TABLE IF NOT EXISTS merchants (
    merchant_id TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcc_codes (
    mcc         TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category    TEXT NOT NULL
);

-- Crowd data per receiver (last 30 days), describing OTHER senders.
-- distinct_senders = sum(label_counts) + unlabeled. Shares are computed by CrowdRepo
-- as count / distinct_senders, so the unlabeled share is implied.
CREATE TABLE IF NOT EXISTS crowd_aggregates (
    receiver_id        TEXT PRIMARY KEY,
    distinct_senders   INTEGER NOT NULL CHECK (distinct_senders >= 0),
    unlabeled          INTEGER NOT NULL CHECK (unlabeled >= 0),
    label_counts       TEXT NOT NULL,   -- JSON object: category -> number of senders
    typical_amount_min INTEGER NOT NULL,
    typical_amount_max INTEGER NOT NULL,
    peak_hours         TEXT NOT NULL,   -- JSON array, at most 3 hours (0-23)
    message_keywords   TEXT NOT NULL,   -- JSON object: keyword -> count
    CHECK (typical_amount_min <= typical_amount_max)
);

CREATE TABLE IF NOT EXISTS vouchers (
    voucher_id    TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    category      TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    description   TEXT NOT NULL,
    valid_until   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenarios (
    scenario_id      TEXT PRIMARY KEY,
    position         INTEGER NOT NULL,   -- display order
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    transaction_json TEXT NOT NULL,      -- TransactionIn
    expected_json    TEXT NOT NULL       -- acceptance test: state, category, confidence
);

-- The demo user. Each session gets its own editable copy in `profiles`.
CREATE TABLE IF NOT EXISTS demo_user (
    user_id        TEXT PRIMARY KEY,
    display_name   TEXT NOT NULL,
    monthly_income INTEGER NOT NULL CHECK (monthly_income >= 0)
);

-- Facts about the dataset itself, for example demo_today (the fixed "now" of the demo).
CREATE TABLE IF NOT EXISTS seed_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- The demo history. A new session copies these rows into `transactions`.
-- Same columns as `transactions`, minus session_id.
CREATE TABLE IF NOT EXISTS demo_transactions (
    transaction_id   TEXT PRIMARY KEY,
    timestamp        TEXT NOT NULL,
    amount           INTEGER NOT NULL CHECK (amount > 0),
    channel          TEXT NOT NULL,
    receiver_id      TEXT NOT NULL,
    transaction_json TEXT NOT NULL,                       -- TransactionIn
    state            TEXT NOT NULL CHECK (state IN ('AUTO_LABELED', 'USER_LABELED', 'UNCLASSIFIED')),
    category         TEXT,
    is_suggested     INTEGER NOT NULL DEFAULT 0 CHECK (is_suggested IN (0, 1)),
    source           TEXT NOT NULL CHECK (source IN ('lookup', 'memory', 'AI', 'user')),
    confidence       TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    decision_json    TEXT,                                -- Decision, only when source is AI
    bundle_json      TEXT,                                -- EvidenceBundle, null for demo history
    CHECK (state = 'UNCLASSIFIED' OR category IS NOT NULL)
);

-- ---------------------------------------------------------------- per-session tables

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS profiles (
    session_id     TEXT PRIMARY KEY REFERENCES sessions(session_id) ON DELETE CASCADE,
    user_id        TEXT NOT NULL,
    display_name   TEXT NOT NULL,
    monthly_income INTEGER NOT NULL CHECK (monthly_income >= 0)
);

CREATE TABLE IF NOT EXISTS transactions (
    session_id       TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    transaction_id   TEXT NOT NULL,
    timestamp        TEXT NOT NULL,
    amount           INTEGER NOT NULL CHECK (amount > 0),
    channel          TEXT NOT NULL,
    receiver_id      TEXT NOT NULL,
    transaction_json TEXT NOT NULL,
    state            TEXT NOT NULL CHECK (state IN ('AUTO_LABELED', 'USER_LABELED', 'UNCLASSIFIED')),
    category         TEXT,    -- null only while UNCLASSIFIED and not yet aged. An aged item has 'Other'
    is_suggested     INTEGER NOT NULL DEFAULT 0 CHECK (is_suggested IN (0, 1)),
    source           TEXT NOT NULL CHECK (source IN ('lookup', 'memory', 'AI', 'user')),
    confidence       TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    decision_json    TEXT,
    bundle_json      TEXT,
    PRIMARY KEY (session_id, transaction_id),
    CHECK (state = 'UNCLASSIFIED' OR category IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_transactions_time     ON transactions (session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_state    ON transactions (session_id, state);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions (session_id, receiver_id);

-- User memory: the category this user chose for a receiver. Private to the session.
CREATE TABLE IF NOT EXISTS user_memory (
    session_id  TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL,
    category    TEXT NOT NULL,
    PRIMARY KEY (session_id, receiver_id)
);

-- Promoted taps only. A tap lands here only when the promotion rule passes.
-- CrowdRepo.get_stats = crowd_aggregates + these rows (one extra sender, one label each).
CREATE TABLE IF NOT EXISTS crowd_overlay (
    session_id  TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL,
    sender_id   TEXT NOT NULL,
    category    TEXT NOT NULL,
    PRIMARY KEY (session_id, receiver_id, sender_id)
);
