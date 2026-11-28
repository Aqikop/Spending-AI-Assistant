# Folder Structure

Status: draft, Nov 26, 2026. Describes the skeleton in the repo. Companion to `Workflow_draft.md` (flow), `tech_stack_and_conventions.md` (rules, API contract) and `workload_plan_draft.md` (who builds what and when).

Owner letters match the workload plan: **A** = AI and pipeline lead, **B** = frontend lead, **C** = data, services and delivery lead.

---

## 1. Top level

```
momo-autolabel/
├── app/              backend (Python 3.12, FastAPI)
├── frontend/         React + Vite + Tailwind CSS
├── data/             simulated seed data and recorded AI answers
├── scripts/          one-off commands: seed, prewarm
├── tests/            unit tests and the 4 scenario tests
├── docs/             project documents
├── pyproject.toml    dependencies and tool config (ruff, mypy, pytest)
├── .env.example      every config key, no secrets
├── .gitignore
└── README.md         contest README, completed on Dec 2
```

| Path             | Owner | Notes                                                                |
| ---------------- | ----- | -------------------------------------------------------------------- |
| `pyproject.toml` | A     | Dependencies are unpinned for now. Pin after the first `uv sync`     |
| `.env.example`   | A     | Keys come from tech stack section 9. Real `.env` is git-ignored      |
| `README.md`      | C     | Must declare simulated data, open-source libraries and AI tools used |

---

## 2. Dependency rules (read before adding an import)

```
api -> services -> pipeline / engines / advice -> domain / repositories
                                  |
                                  '-> llm (only engines/live.py and advice/advisor.py)
```

1. Imports point inward only. `domain` imports nothing from the other app packages.
2. `domain`, `pipeline/evidence.py` functions and `advice/summary.py` are pure. No I/O, no SDK, no database.
3. Only `llm/providers/` imports a provider SDK (Gemini, boto3). Every model call goes through `LLMGateway`.
4. Only `engines/factory.py` reads `RUN_MODE`.
5. Only `pipeline/guard.py` sets the final state of a labeled transaction. The AI proposes, code decides.
6. Routes call exactly one service method. They hold no logic.
7. Every per-session read and write takes `session_id`.
8. Files stay under about 300 lines. Split before they grow past it.

Note: the tech stack says `llm` is used only by `engines/live.py`. Flow 2 adds a second user, `advice/generator.py`. This is a small addition to the approved design **[Confirm]**.

---

## 3. `app/`: backend

### 3.1 `app/api/`: HTTP layer (owner C, stubs by A on Day 1)

| File        | Contains                                                                                          | Does not contain                    |
| ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `routes.py` | The routers from tech stack section 12.2, plus `/advice`, `/vouchers`, `/profile`                 | Business logic, database access     |
| `deps.py`   | `get_session_id` (cookie, created on first request), `get_labeling_service`, `get_advice_service` | Anything about categories or the AI |

### 3.2 `app/services/`: facades (owner C)

| File                  | Contains                                                                                                  | Notes                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `labeling_service.py` | `LabelingService`: scenarios, label a transaction, feed, detail, pending, user tap, summary, aging, reset | The only entry for Flow 1 routes. Knows the chain exists, not its order |
| `advice_service.py`   | `AdviceService`: data check, build summary, call advisor, validate, return advice and vouchers            | The only entry for Flow 2 routes                                        |

### 3.3 `app/pipeline/`: Flow 1 chain (owner A, `guard.py` owner C)

Chain of Responsibility: Router, User memory, Evidence, Decision, Guard. Each handler finalizes the transaction or passes it on.

| File          | Contains                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `chain.py`    | `Handler` protocol, `build_chain`, `run_chain`                                                                                       |
| `router.py`   | `RouterHandler`: `merchant_id`, then MCC lookup. No match passes on                                                                  |
| `memory.py`   | `UserMemoryHandler`: saved label for this receiver exits here                                                                        |
| `evidence.py` | `EvidenceBundleBuilder`, `strip_sender_name`, `time_features`, `amount_features`, `name_clues`, `EvidenceHandler`, `DecisionHandler` |
| `guard.py`    | `level_from_score`, `apply_guard`, `should_promote`, `GuardHandler`. Reads crowd numbers from the database, not from the AI answer   |

### 3.4 `app/engines/`: the AI decision step (owner A)

| File         | Contains                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base.py`    | `DecisionEngine` protocol: `decide(bundle) -> Decision`                                                                                                           |
| `live.py`    | `LiveEngine`: build prompt, AI call 1, run the tool if asked (max one call), AI call 2, validate, retry once, else "AI unavailable"                               |
| `replay.py`  | `ReplayEngine`: recorded answers for the 4 seeded scenarios. Anything else raises "AI required"                                                                   |
| `factory.py` | `build_engine(run_mode)`: the one place that reads `RUN_MODE`                                                                                                     |
| `tools.py`   | `Plain dict registry: tool name to function. First entry: `get_receiver_fingerprint`. The AI sends no arguments. The engine passes `receiver_id` from the bundle` |

There is no rules engine. When the AI is unavailable, nothing is labeled.

### 3.5 `app/llm/`: model access (owner A)

| File                   | Contains                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `gateway.py`           | `LLMProvider` protocol and `LLMGateway`: cache, then daily cap, then provider chain (Gemini, then Bedrock) |
| `cache.py`             | `bundle_cache_key` (amount and time bucketed), `ResponseCache`                                             |
| `budget.py`            | `DailyBudget.try_consume`                                                                                  |
| `providers/gemini.py`  | `GeminiProvider`                                                                                           |
| `providers/bedrock.py` | `BedrockProvider`                                                                                          |

Model IDs and limits live in `config.py`, never in these files.

### 3.6 `app/advice/`: Flow 2 building blocks (owner C, `advisor.py` owner A)

| File           | Contains                                                                                                                         | Pure? |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `summary.py`   | Category table (spent, share of spending, share of income, change vs last month), `cuttable` flags, compact summary for the AI   | Yes   |
| `validator.py` | Checks on the AI answer: categories allowed and cuttable, voucher ids on the list, at most 3 vouchers, numbers match the summary | Yes   |
| `advisor.py`   | The AI call for advice and voucher picks, through `LLMGateway`. One retry, then "AI unavailable"                                 | No    |

Fixed costs (not cuttable): Housing & Rent, Bills & Utilities, Health & Education **[Confirm]**.

### 3.7 `app/domain/`: types only, no I/O (owner A)

| File            | Contains                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories.py` | The `Category` enum, the single source of the 10 labels. `allowed_categories` is generated from it                                          |
| `states.py`     | `AUTO_LABELED`, `SUGGESTED`, `UNCLASSIFIED`, `USER_LABELED`, and the transition table                                                       |
| `models.py`     | Pydantic v2 models: `TransactionIn`, `EvidenceBundle`, `CrowdStats`, `Decision`, `LabeledTransaction`, API in/out models, `PipelineContext` |

Changes to this folder are never a side effect of another task. Make them in their own commit and update `agent_io_spec.md`.

### 3.8 `app/repositories/`: data access (owner C)

All use SQLite. Per-session data takes `session_id` on every call.

| File              | Class                                                    | Scope                               |
| ----------------- | -------------------------------------------------------- | ----------------------------------- |
| `db.py`           | Connection and schema                                    | Shared                              |
| `transactions.py` | `TransactionRepo`                                        | Per session                         |
| `memory.py`       | `MemoryRepo` (receiver to saved category)                | Per session                         |
| `crowd.py`        | `CrowdRepo`: seed aggregates plus this session's overlay | Seed read-only, overlay per session |
| `users.py`        | `UserRepo`: demo user, display name, monthly income      | Per session                         |
| `merchants.py`    | `MerchantRepo`: merchant and MCC lookup                  | Read-only, shared                   |
| `vouchers.py`     | `VoucherRepo`: mock voucher list                         | Read-only, shared                   |

Reset deletes a session's rows in the per-session tables. Seed tables are never written.

### 3.9 `app/config.py` and `app/main.py` (owner A)

| File        | Contains                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `config.py` | `Settings` and `get_settings()`. All thresholds and env vars. Adding a key outside tech stack section 9 needs a stated reason |
| `main.py`   | `create_app()`: includes the router and mounts `frontend/dist` as static files, so there is one URL                           |

---

## 4. `frontend/` (owner B)

Scaffolded by B with Vite. Only `README.md` exists for now.

| Path    | Purpose                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| `src/`  | React source. Suggested subfolders: `api/` (typed client), `components/`, `mocks/` (fixtures for early work) |
| `dist/` | Build output. Served by FastAPI, committed, included in the submission zip so judges need Python only        |

Rules: no business logic in the UI. It renders what the API returns and sends taps. It talks to the backend only through the routes at `/docs`.

---

## 5. `data/`

| Path        | Contents                                                                                                                                                   | Owner |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `seed/`     | Simulated merchants, MCC table, crowd aggregates for the 4 scenario receivers, 30 to 50 demo transactions, mock vouchers, scenario definitions. JSON files | C     |
| `recorded/` | AI answers recorded once with a real key by `scripts/prewarm.py`, for `replay` mode. Committed                                                             | A     |

All data is simulated. Say so in the README.

---

## 6. `scripts/`

| File         | Command                     | Does                                                                                                                                            |
| ------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `seed.py`    | `python -m scripts.seed`    | Creates the schema and loads `data/seed/`. Safe to run twice                                                                                    |
| `prewarm.py` | `python -m scripts.prewarm` | Runs the 4 scenarios and the first-load advice once with real keys, stores results in `data/recorded/`. Scenario buttons then use no live quota |

---

## 7. `tests/` (owner C, A writes the evidence tests)

| File                            | Checks                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `unit/test_guard.py`            | One test per guard rule: cutoffs, min senders, min agreement, conflict cap, Low forces `category = null` |
| `unit/test_evidence.py`         | `strip_sender_name`, `time_features`, `amount_features`, `name_clues`                                    |
| `unit/test_repositories.py`     | Two sessions do not see each other's data. Reset removes everything                                      |
| `unit/test_advice_validator.py` | Invented voucher id, advice targeting rent, wrong number, more than 3 vouchers                           |
| `scenarios/test_scenarios.py`   | Clear, weak, conflicting, cold start. These are the acceptance tests and must pass in `replay` mode      |

Each build step starts from a failing test and ends when it passes.

---

## 8. `docs/`

| File                            | What it is                                                 |
| ------------------------------- | ---------------------------------------------------------- |
| `README.md`                     | Index                                                      |
| `agent_context.md`              | Problem, goal, transaction groups, original workflow       |
| `agent_io_spec.md`              | Evidence bundle, decision output, categories, thresholds   |
| `Workflow_draft.md`             | Current architecture and flow (replaces `architecture.md`) |
| `tech_stack_and_conventions.md` | Stack, rules, API contract and stubs                       |
| `workload_plan_draft.md`        | Roles, milestones, day-by-day plan                         |
| `folder_structure.md`           | This file                                                  |

---

## 9. Where does new code go? (quick lookup)

| I am adding...                  | Put it in                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| A new route                     | `api/routes.py`, calling one service method. Add its models to `domain/models.py` first          |
| A new category                  | `domain/categories.py` only. Nothing else lists categories. Update `agent_io_spec.md`            |
| A new guard rule or threshold   | Rule in `pipeline/guard.py`, value in `config.py` and `.env.example`. Add a unit test            |
| A new AI tool                   | Function plus entry in `llm/tools.py`. State the reason first, it is outside the approved design |
| A new LLM provider              | `llm/providers/`, added to `LLM_PROVIDER_ORDER`. Never import its SDK elsewhere                  |
| A new database table            | `repositories/db.py` schema plus a repo class. Per-session tables take `session_id`              |
| A new seed receiver or merchant | `data/seed/`, then rerun `scripts/seed.py`                                                       |
| A new UI block                  | `frontend/src/`. Logic stays in the API                                                          |
