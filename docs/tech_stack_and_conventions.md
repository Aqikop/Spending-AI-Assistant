# MoMo Auto Spending Categorization: Tech Stack and Conventions (Draft v1)

> Companion to `agent_context.md`, `agent_io_spec.md` and `Workflow_draft.md` (which replaces `architecture.md`). Matches `workload_plan_draft.md`. Covers the tech stack, design patterns, folder layout and codebase rules. All data is simulated for the contest demo.

---

## 1. Constraints this document is built around

- Team is comfortable with Python, weak in JS. Backend is Python. The frontend is owned by one teammate and built with React, Vite and Tailwind CSS. Most code will be written with AI assistance.
- Hard deadline: qualifying round closes Dec 3. Fewer moving parts beats elegance.
- LLM cost must stay at zero. Use a cheap, fast model from Gemini free tier or AWS Bedrock free tier. If limits cause problems, revisit.
- Judges open a hosted link and may also run the zip locally without any API key.
- Open item 8.1 (shape of the AI step): the working assumption is option 2, a tool call, to be confirmed in the Day 1 sync. Section 7 shows what changes under the other options.
- There is no rules-based fallback. If AI is unavailable, nothing is labeled and the UI asks the user to try again.

Free-tier terms for both providers change. Check the Bedrock console and the Gemini docs for the current models, limits and expiry before relying on them.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.12 | Team strength, best LLM SDK support |
| API | FastAPI + Pydantic v2 | Typed schemas double as the I/O contract from `agent_io_spec.md` |
| Database | SQLite | Zero ops, fits the per-session sandbox |
| Frontend | React + Vite + Tailwind CSS, in its own `frontend/` folder | AI writes it and one teammate owns it. The build output is served by FastAPI, so there is still one URL. |
| LLM | Behind `LLMGateway`: Gemini (free tier) and Bedrock, cheap fast model on both | Provider chain that ends in an "AI unavailable" error, see section 6 |
| Tests | pytest | The four seeded scenarios are the acceptance tests |
| Tooling | uv, ruff, mypy, Docker; Node and npm for the frontend only | One-command run for `replay` mode |
| Deploy | One container on a small VM or App Runner | Single URL for judges |

**Frontend notes:**

- The frontend talks to the backend only through the routes in section 12. The OpenAPI page at `/docs` is the contract.
- Production: `npm run build` writes `frontend/dist`, and FastAPI mounts it as static files. Same origin, so a strict CSP stays possible.
- Development: Vite dev server with a proxy to the FastAPI port.
- The Docker build is two-stage: a Node stage builds the frontend, a Python stage copies `dist`.
- The submission zip includes the built `frontend/dist`, so a judge running `replay` mode needs Python only, no Node.
- No business logic in the UI. It renders what the API returns.

---

## 3. Folder layout

```
app/
  api/            routes.py, deps.py            # FastAPI, session handling
  services/       labeling_service.py, advice_service.py   # Facades, the only entry for the API
  pipeline/       chain.py, router.py, memory.py, evidence.py, guard.py
  engines/        base.py, live.py, replay.py, tools.py, factory.py
  advice/         tables.py, validator.py, generator.py   # Flow 2 (advice)
  llm/            gateway.py, cache.py, budget.py, providers/{gemini.py,bedrock.py}
  domain/         categories.py, models.py, states.py, errors.py   # enums, Pydantic models, exceptions, no I/O
  repositories/   transactions.py, memory.py, crowd.py, merchants.py, users.py, vouchers.py
  config.py       # all thresholds and env vars
  main.py         # create_app: router + static mount of frontend/dist
data/seed/        merchants, MCC table, crowd aggregates, scenarios
scripts/          seed.py, prewarm.py
tests/            unit/, scenarios/
frontend/         # React + Vite + Tailwind, owned by the frontend teammate
  src/
  dist/           # build output, served by FastAPI, included in the zip
README.md
```

Dependencies point inward only: `api -> services -> pipeline/engines/advice -> domain/repositories`. `llm` is used only by `engines/live.py` and `advice/generator.py`.

---

## 4. Design patterns (used only where they earn their place)

| Pattern | Where | Purpose |
|---|---|---|
| Chain of Responsibility | Router -> User memory -> Evidence -> Decision -> Guard | Early exits. Each handler finalizes the transaction or passes it on. |
| Strategy | `DecisionEngine`: `LiveEngine`, `ReplayEngine`. `AdviceGenerator`: `LiveAdviceGenerator`, `ReplayAdviceGenerator`. `LLMProvider`: `GeminiProvider`, `BedrockProvider` | Run modes and providers are swaps, not scattered `if`s |
| Factory (simple) | `build_engine(RUN_MODE)`, `build_advice_generator(RUN_MODE)` | One place reads the env var |
| Builder | `EvidenceBundleBuilder` | Bundle has many optional parts |
| Facade | `LabelingService` (Flow 1), `AdviceService` (Flow 2) | Routes call one method and do not know the pipeline order |
| Proxy / Decorator | Cache, daily budget cap, retry around the LLM provider | Cross-cutting concerns stay out of decision code |

**Deliberately skipped:** State pattern (an enum plus a transition table is enough for 4 states), Command, Singleton, Abstract Factory, and Observer with Null Object (Flow 2 reads labeled transactions with a query, so no `on_labeled` hook is needed). Judges reading the code will notice over-engineering.

Option 2 of item 8.1 adds a plain dict tool registry (name to function) in `engines/tools.py`. It does not need to be a formal pattern.

---

## 5. Codebase rules

### 5.1 Architecture

1. Layers are `api -> services -> pipeline -> domain/repositories`. No upward imports.
2. `domain` and the evidence builder are pure functions with no I/O.
3. The AI step is the only non-deterministic component and sits behind one interface: `DecisionEngine.decide(session_id, bundle) -> Decision`.
4. The UI lives in `frontend/` and has no business logic. It calls the API in section 12, renders `Decision` objects and sends taps.
5. Every model call goes through `LLMGateway`. Nothing else imports a provider SDK.

### 5.2 Contract and safety

6. Pydantic models are the single source of truth for the evidence bundle and the decision output. No raw dicts across layer boundaries.
7. Categories live in one enum. `allowed_categories` is generated from it, never retyped.
8. **The LLM proposes, code decides.** All thresholds (score cutoffs 0.80 and 0.50, min senders N, agreement X) live in `config.py`. Only the policy guard assigns the final state, and it reads crowd numbers from the DB, not from the model's answer. The same holds for advice: code validates every advice before it reaches the UI (section 12.3, `validate_advice`).
9. Privacy is structural. The bundle schema has no field that can hold raw messages from other users. The sender name is stripped in the builder, before the AI boundary.
10. Validate LLM output against the schema. On failure, retry once, then raise `AIUnavailableError` (clean error code, nothing saved). Never crash the feed.
11. Low confidence forces `category = null`. Enforced in the guard and covered by a test.
12. A user tap enters crowd aggregates only through the promotion rule, never directly.

### 5.3 Operations

13. No secrets in the repo or the zip. Config comes from env vars only. `replay` mode runs with zero keys.
14. Every decision stores `reason` and `clues_used`. The side panel reads them from there.
15. Per-session sandbox: every read and write of user memory, crowd overlay, profile and transactions is scoped by `session_id`. Reset deletes it. Seed tables are read-only and shared.
16. The gateway enforces a daily call cap from config. When the cap is hit, or every provider fails, it raises `AIUnavailableError`. The route returns a clear error code, nothing is saved as a label and the UI shows a retry. There is no rules-based fallback: a guessed label is worse than a pending one.

### 5.4 Quality

17. The four seeded scenarios (clear, weak, conflicting, cold start) are acceptance tests and must pass in `replay` mode in CI.
18. Type hints everywhere. `ruff` and `mypy` clean. Files under about 300 lines.
19. Names match the specs exactly (`AUTO_LABELED`, `SUGGESTED`, `UNCLASSIFIED`, `USER_LABELED`). Slides and README use the same terms.
20. README declares simulated data, open-source libraries and AI tools used, as the contest requires.
21. One feature branch per build-order step, small commits.

### 5.5 AI-assisted coding guidelines (Karpathy guidelines)

Source: behavioral guidelines derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls (MIT license). They apply to every AI coding session on this repo, whether writing, reviewing or refactoring. Adapted for this project: the "Simplicity first" rules carry project exceptions (marked "Project exception") so they do not conflict with the approved design in sections 3, 4 and 9.

**Tradeoff:** these guidelines bias toward caution over speed. For trivial tasks, use judgment.

#### 1. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them. Don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

#### 2. Simplicity first

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code. *Project exception:* the patterns in section 4 are approved (Chain, Strategy, Factory, Builder, Facade, Proxy/Decorator), as are the optional `used_tool`, `tool_trace` and `proposed_action` fields on `Decision` and the routes and functions listed in section 12. There is no `on_labeled` hook and no Null Object: Flow 2 reads labeled transactions with a query. Do not add others without a stated reason.
- No "flexibility" or "configurability" that wasn't requested. *Project exception:* thresholds and env vars listed in section 9 live in `config.py` by design. Do not add new keys beyond that list without a stated reason.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

#### 3. Surgical changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it. Don't delete it.

When your changes create orphans:
- Remove imports, variables and functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

#### 4. Goal-driven execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" becomes "Write tests for invalid inputs, then make them pass"
- "Fix the bug" becomes "Write a test that reproduces it, then make it pass"
- "Refactor X" becomes "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

#### How these apply to this project

- **The design is the baseline.** The project exceptions in "Simplicity first" cover the section 4 patterns and the section 9 config keys. Anything beyond them (a new pattern, a new interface, a new config key) needs a stated reason before it is added.
- **Seams are built, not extended.** The `used_tool`, `tool_trace` and `proposed_action` fields on `Decision` exist because the design needs them for open item 8.1. The `on_labeled` hook was dropped (section 4). Do not add further "just in case" hooks.
- **Success criteria are the scenario tests.** Each build-order step in section 10 should start from a failing test (clear, weak, conflicting, cold start, plus unit tests for the guard rules) and end when it passes in `replay` mode.
- **Surgical changes protect the contract.** Changes to the Pydantic models, the category enum or `config.py` thresholds are never a side effect of another task. Make them in their own commit and update `agent_io_spec.md` if the contract changes.
- **Surface, don't guess, on open items.** When a task touches something listed in section 11, the AI states the assumption it is making and asks rather than silently picking a value.

---

## 6. LLM access: staying free

**LLMGateway** is a decorator chain in front of every call:

```
cache (by bundle hash) -> daily budget cap -> provider chain -> AI unavailable
```

- **Provider chain:** Gemini free tier first, then Bedrock free tier, then an `AIUnavailableError`. Each provider sits behind the same `LLMProvider` interface. If one is rate-limited or errors, the next takes over. If all fail, the judge sees a clear "AI unavailable, try again" state, never a crash and never a guessed label.
- **Model choice:** a cheap, fast model on each provider (a Flash-class model on Gemini, a small/lite-class model on Bedrock). Exact model IDs live in `config.py`, not in code. Confirm availability in your account.
- **Cache:** key is a hash of the whole bundle with amount and time bucketed. Repeat clicks cost nothing. Advice uses a hash of its summary.
- **Pre-warm:** `scripts/prewarm.py` runs the four seeded scenarios and the first-load advice once at deploy and stores the results. Scenario buttons then use zero live quota. This is the same data `replay` mode uses.
- **Small calls:** the bundle is a few hundred tokens. Request JSON output with the schema, set a low `max_output_tokens`.
- **Call count:** option 2 can use up to 2 calls per transaction, and each advice request uses 1 (more on a retry). The cache, pre-warm and the daily cap cover both. Re-check the free-tier numbers once the tool loop works.
- **Keep the LLM in the loop:** the contest requires AI as a core component. Do not skip the LLM when evidence looks clear. Use it for the decision and the `reason` text.
- **Revisit trigger:** if the cheap model gives unreliable JSON or poor decisions on the seeded scenarios, or free limits block testing, move to a larger model or revisit the provider choice.

---

## 7. How open item 8.1 affects the design

Working assumption from `workload_plan_draft.md` (decision 1): **option 2**, one tool (`get_receiver_fingerprint`), at most one tool call per transaction. Confirm in the Day 1 sync. The table shows what changes under each option.

| | Option 1: single call | Option 2: tool call | Option 3: agent picks action |
|---|---|---|---|
| LLM calls per transaction | 1 | 1 to 2 | 1 |
| Free-tier pressure | Lowest | Highest, up to double | Same as option 1 |
| New code | None | Tool registry, loop with max iterations | `proposed_action` field, guard mapping |
| Policy guard | Maps score to state | Same | Caps or overrides the model's action |
| Side panel | Bundle, reason, clues | Adds tool-call trace | Adds proposed vs final action |
| Testing | Easiest | Needs loop and failure tests | Needs action-validity tests |
| "Agent" claim | Weak: call it "AI decision step" | Accurate | Accurate, closest to original framing |

Seams that keep every option open:

- `DecisionEngine.decide(session_id, bundle) -> Decision` is the only interface. Option 2's loop lives inside an engine implementation.
- `Decision` carries `used_tool`, `tool_trace` and `proposed_action`. All stay empty under option 1, and `proposed_action` is only used under option 3.
- The guard computes the final state in code, whichever option is picked.
- The gateway cache key covers the whole bundle, so option 2's tool results are cached too.

Under option 2 the AI decides whether to call a tool, so "AI agent" is accurate. Slides, README and video use the same term and the same state names.

---

## 8. Run modes

| Mode | Used by | AI step |
|---|---|---|
| `live` | Hosted demo | Real LLM via `LLMGateway` |
| `replay` | Judge running the zip locally | Precomputed outputs for the seeded scenarios and the first-load advice. Custom input returns `AI_REQUIRED` |

Selected by one env var, `RUN_MODE`. Never put an API key in the zip. The README states plainly that custom transactions in `replay` need AI and return an "AI required" message. There is no rules fallback.

---

## 9. Configuration (all in `config.py`, overridable by env)

| Key | Draft value |
|---|---|
| `RUN_MODE` | `live` or `replay` |
| `LLM_PROVIDER_ORDER` | `gemini,bedrock` |
| `GEMINI_MODEL`, `BEDROCK_MODEL_ID` | set after checking the account |
| `LLM_DAILY_CALL_CAP` | set from the real free-tier limit |
| `SCORE_HIGH`, `SCORE_MEDIUM` | 0.80, 0.50 |
| `MIN_SENDERS_HIGH` | 15 |
| `MIN_AGREEMENT_HIGH` | 0.60 |
| `PROMOTION_MIN_SENDERS`, `PROMOTION_MIN_AGREEMENT` | lowered for the demo, stated in README |
| `UNCLASSIFIED_AGING_DAYS` | N, to be decided |
| `ADVICE_MIN_LABELED` | N, to be decided |
| `ADVICE_MAX_UNCLASSIFIED_SHARE` | to be decided |
| `ADVICE_MAX_VOUCHERS` | 3 |

---

## 10. Build order and ownership of files

Dates and owners per step are in `workload_plan_draft.md`.

0. Backend skeleton: the stubs in section 12, all bodies empty, so the frontend teammate can start against the contract.
1. Seed data and the deterministic path, no AI: `domain`, `repositories`, `pipeline/router.py`, `pipeline/memory.py`, sessions.
2. Evidence builder, `LLMGateway` and the decision step with its one tool: `pipeline/evidence.py`, `llm/`, `engines/`.
3. Policy guard and the four scenarios: `pipeline/guard.py`, `tests/scenarios/`. Tune on live runs.
4. Tap loop, pending batch, aging, reset: `services/`, `api/`, and `frontend/` (frontend teammate).
5. Flow 2: `advice/`, `services/advice_service.py`, `/advice`, `/vouchers`, `/profile`.
6. `replay` mode and `prewarm.py` (four scenarios plus the first-load advice).
7. Deploy and feature freeze, then README, 1-page guide, slides and video.

---

## 11. Open items

- Open item 8.1: option 2 is the working assumption, to be confirmed in the Day 1 sync.
- Endpoint list and response shapes in section 12 (including `/advice`, `/vouchers`, `/profile`) to be confirmed with the frontend teammate.
- Where the UI reads the current monthly income: only `PUT /profile` exists, so either add `GET /profile` or return the profile with another response.
- `agent_io_spec.md` must be updated: drop `own_label_for_receiver`, add `used_tool`, and add `receiver_id` to the bundle's transaction block (needed by the tool).
- Exact free-tier models and limits on Gemini and Bedrock.
- Minimum `distinct_senders`, agreement level and score cutoffs, tuned on the seeded data.
- N days before `UNCLASSIFIED` moves to Other.
- Minimum labeled transactions and maximum unclassified share for advice.
- Real transaction input format and which merchant and MCC fields MoMo holds.
- Privacy review of aggregated crowd evidence before any real deployment.

---

## 12. Backend API contract and function stubs

The backend owner defines the interface. The frontend teammate codes against it. **Every route handler and function body below stays empty (`...`) for now.** Signatures, models and names are the contract. FastAPI generates the OpenAPI page at `/docs` from these, so the frontend can read the shapes there. These functions and routes are the approved interface list for rule "No abstractions for single-use code" in section 5.5.

Not stubbed on purpose: `GET /budget` and the budget alert (out of scope, the advice flow replaces it). There is no `on_labeled` hook (section 4).

### 12.1 Models (in `domain/models.py`, no I/O)

| Model | Holds | Source |
|---|---|---|
| `TransactionIn` | Raw transaction JSON | `agent_context.md` section 5 |
| `EvidenceBundle` | Clues built by code, including `receiver_id` for the tool (code side only) | `agent_io_spec.md` section 2 |
| `CrowdStats` | `distinct_senders`, `label_distribution`, `typical_amount_range`, `peak_hours`, `message_keywords` | `agent_io_spec.md` section 2 |
| `Decision` | Category, confidence, score, action, reason, `clues_used`, alternatives, buttons, optional `used_tool`, `tool_trace` and `proposed_action` | `agent_io_spec.md` section 3 |
| `LabeledTransaction` | Transaction, final state, final category, `is_suggested`, `Decision` | `states.py` for the four states |
| `TransactionDetailOut` | `LabeledTransaction` plus its `EvidenceBundle` (side panel) | New |
| `PendingItemOut` | Unclassified transaction, `suggested_buttons`, receiver sender count | New |
| `CategoryTotalOut` | Category, total amount, count | New |
| `ScenarioOut` | Scenario id, title, description, sample transaction | New |
| `LabelIn` | `transaction_id`, `category` (a tap) | New |
| `AgingIn` | `days` (demo fast-forward) | New |
| `HealthOut` | Status, `run_mode` | New |
| `ErrorOut` | `code` (`AI_UNAVAILABLE` or `AI_REQUIRED`), `message` | New |
| `ProfileIn` | `monthly_income` | New |
| `ProfileOut` | `display_name`, `monthly_income` | New |
| `VoucherOut` | Voucher id, title, category, `why` text | New |
| `CategoryRow` | Category, total, share of income, change vs last month, `cuttable` flag | New |
| `AdviceOut` | `status` (`ok` or `not_enough_data`), category table (`CategoryRow` list), advice items, up to 3 vouchers | New |
| `AdviceSummary` | Internal: the numbers the advice text must match | New, never sent to the UI |
| `AdviceDraft` | Internal: the AI's advice before validation | New, never sent to the UI |
| `PipelineContext` | Internal: session id, transaction, bundle, decision, result | New, never sent to the UI |

Fixed costs (not cuttable): Housing & Rent, Bills & Utilities, Health & Education. Defined once in `domain/categories.py` and used for the `cuttable` flag.

Exceptions in `domain/errors.py`: `AIUnavailableError` and `AIRequiredError`. `create_app` registers handlers that turn them into HTTP 503 with an `ErrorOut` body.

### 12.2 Routes (in `api/routes.py`)

| Method | Path | Handler | Calls | Purpose |
|---|---|---|---|---|
| GET | `/health` | `health` | none | Status and `run_mode` |
| GET | `/categories` | `list_categories` | none | Category list from the enum |
| GET | `/scenarios` | `list_scenarios` | `LabelingService.list_scenarios` | Four preset scenario buttons |
| POST | `/scenarios/{scenario_id}/run` | `run_scenario` | `LabelingService.run_scenario` | Run a preset |
| POST | `/transactions` | `submit_transaction` | `LabelingService.label_transaction` | Custom form submit |
| GET | `/transactions` | `list_transactions` | `LabelingService.list_transactions` | Feed for this session |
| GET | `/transactions/{transaction_id}` | `get_transaction_detail` | `LabelingService.get_transaction_detail` | Side panel: bundle, reason, clues, tool trace |
| GET | `/pending` | `list_pending` | `LabelingService.list_pending` | "Review later" batch, most senders first |
| POST | `/labels` | `submit_label` | `LabelingService.apply_user_label` | User tap |
| GET | `/summary` | `spending_summary` | `LabelingService.spending_summary` | Running total per category |
| POST | `/aging/fast-forward` | `fast_forward_aging` | `LabelingService.age_unclassified` | Demo button, moves old items to Other |
| POST | `/reset` | `reset_session` | `LabelingService.reset_session` | Delete this session's data |
| POST | `/advice` | `request_advice` | `AdviceService.get_advice` | Generate or refresh advice (first load and "Get advice" button) |
| GET | `/vouchers` | `list_vouchers` | `AdviceService.list_vouchers` | Mock voucher list |
| PUT | `/profile` | `update_profile` | `AdviceService.update_profile` | Set monthly income |

Session: a cookie holds `session_id`. `get_session_id` creates it on the first request.

Errors: when AI is unavailable or required, the route returns HTTP 503 with `ErrorOut`. Nothing is saved as a label, and the frontend shows a retry (or "AI required" in `replay`). Routes that can fail this way declare it with `AI_ERRORS`, so it shows in OpenAPI.

### 12.3 Stubs

```python
# app/main.py
def create_app() -> FastAPI:
    """Build the app, include the router, register the AI error handlers, mount frontend/dist as static files."""
    ...

# app/config.py
def get_settings() -> Settings:
    """Read env vars and defaults. Keys are listed in section 9."""
    ...

# app/domain/errors.py
class AIUnavailableError(Exception): ...   # every provider failed, cap hit, or output invalid after one retry
class AIRequiredError(Exception): ...       # replay mode, no stored answer for this input

# app/api/deps.py
def get_session_id(request: Request, response: Response) -> str: ...
def get_labeling_service() -> LabelingService: ...
def get_advice_service() -> AdviceService: ...

# app/api/routes.py
router = APIRouter()
SessionId = Annotated[str, Depends(get_session_id)]
Labeling = Annotated[LabelingService, Depends(get_labeling_service)]
Advice = Annotated[AdviceService, Depends(get_advice_service)]
AI_ERRORS = {503: {"model": ErrorOut}}

@router.get("/health")
def health() -> HealthOut: ...

@router.get("/categories")
def list_categories() -> list[str]: ...

@router.get("/scenarios")
def list_scenarios(service: Labeling) -> list[ScenarioOut]: ...

@router.post("/scenarios/{scenario_id}/run", responses=AI_ERRORS)
def run_scenario(scenario_id: str, session_id: SessionId, service: Labeling) -> LabeledTransaction: ...

@router.post("/transactions", responses=AI_ERRORS)
def submit_transaction(body: TransactionIn, session_id: SessionId, service: Labeling) -> LabeledTransaction: ...

@router.get("/transactions")
def list_transactions(session_id: SessionId, service: Labeling) -> list[LabeledTransaction]: ...

@router.get("/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: str, session_id: SessionId, service: Labeling) -> TransactionDetailOut: ...

@router.get("/pending")
def list_pending(session_id: SessionId, service: Labeling) -> list[PendingItemOut]: ...

@router.post("/labels")
def submit_label(body: LabelIn, session_id: SessionId, service: Labeling) -> LabeledTransaction: ...

@router.get("/summary")
def spending_summary(session_id: SessionId, service: Labeling) -> list[CategoryTotalOut]: ...

@router.post("/aging/fast-forward")
def fast_forward_aging(body: AgingIn, session_id: SessionId, service: Labeling) -> list[LabeledTransaction]: ...

@router.post("/reset")
def reset_session(session_id: SessionId, service: Labeling) -> None: ...

@router.post("/advice", responses=AI_ERRORS)
def request_advice(session_id: SessionId, service: Advice) -> AdviceOut: ...

@router.get("/vouchers")
def list_vouchers(service: Advice) -> list[VoucherOut]: ...

@router.put("/profile")
def update_profile(body: ProfileIn, session_id: SessionId, service: Advice) -> ProfileOut: ...
```

```python
# app/services/labeling_service.py  (Facade for Flow 1)
class LabelingService:
    def __init__(self, handlers: list[Handler], transactions: TransactionRepo,
                 memory: MemoryRepo, crowd: CrowdRepo, users: UserRepo) -> None: ...

    def list_scenarios(self) -> list[ScenarioOut]: ...
    def run_scenario(self, session_id: str, scenario_id: str) -> LabeledTransaction: ...
    def label_transaction(self, session_id: str, txn: TransactionIn) -> LabeledTransaction:
        """Run the chain. Raises AIUnavailableError or AIRequiredError, and saves nothing in that case."""
        ...
    def list_transactions(self, session_id: str) -> list[LabeledTransaction]: ...
    def get_transaction_detail(self, session_id: str, transaction_id: str) -> TransactionDetailOut: ...
    def list_pending(self, session_id: str) -> list[PendingItemOut]: ...
    def apply_user_label(self, session_id: str, label: LabelIn) -> LabeledTransaction:
        """Save to user memory, set USER_LABELED, add to crowd only through the promotion rule."""
        ...
    def spending_summary(self, session_id: str) -> list[CategoryTotalOut]: ...
    def age_unclassified(self, session_id: str, days: int) -> list[LabeledTransaction]: ...
    def reset_session(self, session_id: str) -> None:
        """Delete this session's transactions, memory, crowd overlay and profile."""
        ...

# app/services/advice_service.py  (Facade for Flow 2)
class AdviceService:
    def __init__(self, transactions: TransactionRepo, users: UserRepo, vouchers: VoucherRepo,
                 generator: AdviceGenerator, settings: Settings) -> None: ...

    def get_advice(self, session_id: str) -> AdviceOut:
        """Data check, build table and summary, generate, validate. If validation rejects,
        generate once more, then raise AIUnavailableError."""
        ...
    def list_vouchers(self) -> list[VoucherOut]: ...
    def update_profile(self, session_id: str, profile: ProfileIn) -> ProfileOut: ...
```

```python
# app/pipeline/chain.py
class Handler(Protocol):
    def handle(self, ctx: PipelineContext) -> PipelineContext:
        """Finalize ctx.result to stop the chain, or return ctx to pass it on."""
        ...

def build_chain(settings: Settings, engine: DecisionEngine, builder: EvidenceBundleBuilder,
                merchants: MerchantRepo, memory: MemoryRepo, crowd: CrowdRepo) -> list[Handler]: ...
def run_chain(ctx: PipelineContext, handlers: list[Handler]) -> LabeledTransaction: ...

# app/pipeline/router.py
class RouterHandler:       # merchant_id, then mcc
    def handle(self, ctx: PipelineContext) -> PipelineContext: ...

# app/pipeline/memory.py
class UserMemoryHandler:   # saved label for this receiver
    def handle(self, ctx: PipelineContext) -> PipelineContext: ...

# app/pipeline/evidence.py
class EvidenceBundleBuilder:
    def __init__(self, crowd: CrowdRepo, transactions: TransactionRepo, users: UserRepo) -> None: ...
    def build(self, session_id: str, txn: TransactionIn) -> EvidenceBundle: ...

def strip_sender_name(message: str, sender_name: str | None) -> str:
    """sender_name comes from users.display_name."""
    ...
def time_features(timestamp: datetime) -> TimeFeatures: ...
def amount_features(amount: int, user_median: float, crowd: CrowdStats | None) -> AmountFeatures: ...
def name_clues(display_name: str) -> list[str]: ...

class EvidenceHandler:
    def handle(self, ctx: PipelineContext) -> PipelineContext: ...

class DecisionHandler:
    def handle(self, ctx: PipelineContext) -> PipelineContext: ...

# app/pipeline/guard.py
def level_from_score(score: float) -> Confidence: ...
def apply_guard(decision: Decision, crowd: CrowdStats | None) -> Decision:
    """Final state in code. Reads distinct_senders and agreement from crowd (the DB), never from the
    model's answer. Score cutoffs, min senders, min agreement, conflict cap, null category on Low."""
    ...
def should_promote(stats: CrowdStats) -> bool:
    """Promotion rule for taps entering crowd aggregates."""
    ...

class GuardHandler:
    def handle(self, ctx: PipelineContext) -> PipelineContext:
        """Load crowd stats from the DB and pass them to apply_guard."""
        ...
```

```python
# app/engines/base.py
class DecisionEngine(Protocol):
    def decide(self, session_id: str, bundle: EvidenceBundle) -> Decision: ...

# app/engines/live.py
class LiveEngine:
    def __init__(self, gateway: LLMGateway,
                 tools: dict[str, Callable[..., CrowdStats | None]]) -> None: ...
    def decide(self, session_id: str, bundle: EvidenceBundle) -> Decision:
        """Call 1, at most one tool step, call 2, parse. Fills used_tool and tool_trace.
        Retry once on invalid output, then raise AIUnavailableError."""
        ...
    def _build_prompt(self, bundle: EvidenceBundle, tool_result: CrowdStats | None = None) -> str: ...
    def _run_tool(self, session_id: str, bundle: EvidenceBundle, name: str) -> CrowdStats | None:
        """Run an allowed tool. The receiver id comes from the bundle, never from the model."""
        ...
    def _parse_decision(self, raw: dict) -> Decision | None:
        """Validate against the schema. None means invalid."""
        ...

# app/engines/tools.py
def get_receiver_fingerprint(crowd: CrowdRepo, session_id: str, receiver_id: str) -> CrowdStats | None: ...
def build_tool_registry(crowd: CrowdRepo) -> dict[str, Callable[..., CrowdStats | None]]:
    """Plain dict, name to function. Only get_receiver_fingerprint."""
    ...

# app/engines/replay.py
class ReplayEngine:
    def __init__(self, fixtures_path: Path) -> None: ...
    def decide(self, session_id: str, bundle: EvidenceBundle) -> Decision:
        """Stored answer for a seeded scenario. Raises AIRequiredError for anything else."""
        ...

# app/engines/factory.py
def build_engine(run_mode: str) -> DecisionEngine: ...
```

```python
# app/advice/tables.py  (pure functions, no I/O)
def has_enough_data(transactions: list[LabeledTransaction], min_labeled: int,
                    max_unclassified_share: float) -> bool: ...
def build_category_table(this_month: list[LabeledTransaction], last_month: list[LabeledTransaction],
                         monthly_income: int) -> list[CategoryRow]:
    """Totals, share of income, change vs last month, cuttable flag (fixed costs are not cuttable)."""
    ...
def build_advice_summary(table: list[CategoryRow], monthly_income: int) -> AdviceSummary: ...

# app/advice/validator.py
def validate_advice(draft: AdviceDraft, summary: AdviceSummary, vouchers: list[VoucherOut],
                    max_vouchers: int) -> AdviceOut | None:
    """None means rejected: category not allowed or not cuttable, voucher id not on the list,
    more than max_vouchers vouchers, or a number in the text that does not match the summary."""
    ...

# app/advice/generator.py
class AdviceGenerator(Protocol):
    def generate(self, summary: AdviceSummary, vouchers: list[VoucherOut]) -> AdviceDraft: ...

class LiveAdviceGenerator:
    def __init__(self, gateway: LLMGateway) -> None: ...
    def generate(self, summary: AdviceSummary, vouchers: list[VoucherOut]) -> AdviceDraft:
        """One call through the gateway, schema-checked, one retry on bad JSON, then AIUnavailableError."""
        ...

class ReplayAdviceGenerator:
    def __init__(self, fixtures_path: Path) -> None: ...
    def generate(self, summary: AdviceSummary, vouchers: list[VoucherOut]) -> AdviceDraft:
        """Stored first-load advice. Raises AIRequiredError for anything else."""
        ...

def build_advice_generator(run_mode: str) -> AdviceGenerator: ...
```

```python
# app/llm/gateway.py
class LLMProvider(Protocol):
    name: str
    def generate_json(self, prompt: str, schema: dict, max_output_tokens: int) -> dict: ...

class LLMGateway:
    def __init__(self, providers: list[LLMProvider], cache: ResponseCache, budget: DailyBudget) -> None: ...
    def generate_json(self, prompt: str, schema: dict, cache_key: str) -> dict:
        """Raises AIUnavailableError when every provider failed or the daily cap is hit."""
        ...

# app/llm/cache.py
def bundle_cache_key(bundle: EvidenceBundle) -> str:
    """Hash of the whole bundle with amount and time bucketed."""
    ...
class ResponseCache:
    def get(self, key: str) -> dict | None: ...
    def put(self, key: str, value: dict) -> None: ...

# app/llm/budget.py
class DailyBudget:
    def try_consume(self) -> bool: ...

# app/llm/providers/gemini.py and bedrock.py
class GeminiProvider:
    def generate_json(self, prompt: str, schema: dict, max_output_tokens: int) -> dict: ...
class BedrockProvider:
    def generate_json(self, prompt: str, schema: dict, max_output_tokens: int) -> dict: ...
```

```python
# app/repositories (session_id on every read and write of per-session data)
class TransactionRepo:
    def save(self, session_id: str, item: LabeledTransaction) -> None: ...
    def get(self, session_id: str, transaction_id: str) -> LabeledTransaction | None: ...
    def list(self, session_id: str) -> list[LabeledTransaction]: ...
    def list_labeled(self, session_id: str) -> list[LabeledTransaction]: ...
    def list_unclassified(self, session_id: str) -> list[LabeledTransaction]: ...
    def delete_session(self, session_id: str) -> None: ...

class MemoryRepo:
    def get_label(self, session_id: str, receiver_id: str) -> Category | None: ...
    def set_label(self, session_id: str, receiver_id: str, category: Category) -> None: ...
    def delete_session(self, session_id: str) -> None: ...

class CrowdRepo:
    def get_stats(self, session_id: str, receiver_id: str) -> CrowdStats | None:
        """Seed data plus this session's overlay."""
        ...
    def add_tap(self, session_id: str, receiver_id: str, sender_id: str, category: Category) -> None: ...
    def delete_session(self, session_id: str) -> None: ...

class UserRepo:
    def get_profile(self, session_id: str) -> ProfileOut: ...
    def set_monthly_income(self, session_id: str, monthly_income: int) -> ProfileOut: ...
    def delete_session(self, session_id: str) -> None: ...

class MerchantRepo:        # read-only, shared seed tables
    def lookup_merchant(self, merchant_id: str) -> Category | None: ...
    def lookup_mcc(self, mcc: str) -> Category | None: ...

class VoucherRepo:         # read-only, shared seed table
    def list_all(self) -> list[VoucherOut]: ...
```

```python
# scripts/seed.py and scripts/prewarm.py
def seed_database() -> None:
    """Merchants, MCC table, crowd aggregates, vouchers, the demo user with income, and the demo month of labeled transactions."""
    ...
def prewarm_scenarios() -> None:
    """Run the four seeded scenarios and the first-load advice once and store the results for replay mode."""
    ...
```