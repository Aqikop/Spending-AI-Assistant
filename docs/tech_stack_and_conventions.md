# MoMo Auto Spending Categorization: Tech Stack and Conventions (Draft v1)

> Companion to `agent_context.md`, `agent_io_spec.md` and `architecture.md`. Covers the tech stack, design patterns, folder layout and codebase rules. All data is simulated for the contest demo.

---

## 1. Constraints this document is built around

- Team is comfortable with Python, weak in JS. Backend is Python. The frontend is owned by one teammate and built with React, Vite and Tailwind CSS. Most code will be written with AI assistance.
- Hard deadline: qualifying round closes Dec 3. Fewer moving parts beats elegance.
- LLM cost must stay at zero. Use a cheap, fast model from Gemini free tier or AWS Bedrock free tier. If limits cause problems, revisit.
- Judges open a hosted link and may also run the zip locally without any API key.
- Open item 8.1 (shape of the AI step) is undecided. The design keeps all three options open (section 7).

Free-tier terms for both providers change. Check the Bedrock console and the Gemini docs for the current models, limits and expiry before relying on them.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.12 | Team strength, best LLM SDK support |
| API | FastAPI + Pydantic v2 | Typed schemas double as the I/O contract from `agent_io_spec.md` |
| Database | SQLite | Zero ops, fits the per-session sandbox |
| Frontend | React + Vite + Tailwind CSS, in its own `frontend/` folder | AI writes it and one teammate owns it. The build output is served by FastAPI, so there is still one URL. |
| LLM | Behind `LLMGateway`: Gemini (free tier) and Bedrock, cheap fast model on both | Provider chain with fallback, see section 6 |
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
  services/       labeling_service.py           # Facade, the only entry for the API
  pipeline/       chain.py, router.py, memory.py, evidence.py, guard.py
  engines/        base.py, live.py, replay.py, rules.py, factory.py
  llm/            gateway.py, cache.py, budget.py, providers/{gemini.py,bedrock.py}
  domain/         categories.py, models.py, states.py   # enums and Pydantic models, no I/O
  repositories/   transactions.py, memory.py, crowd.py, merchants.py
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

Dependencies point inward only: `api -> services -> pipeline/engines -> domain/repositories`. `llm` is used only by `engines/live.py`.

---

## 4. Design patterns (used only where they earn their place)

| Pattern | Where | Purpose |
|---|---|---|
| Chain of Responsibility | Router -> User memory -> Evidence -> Decision -> Guard | Early exits. Each handler finalizes the transaction or passes it on. |
| Strategy | `DecisionEngine` implementations: `LiveEngine`, `ReplayEngine`, `RulesEngine`. Also `LLMProvider`: `GeminiProvider`, `BedrockProvider` | Run modes and providers are swaps, not scattered `if`s |
| Factory (simple) | `build_engine(RUN_MODE)` | One place reads the env var |
| Builder | `EvidenceBundleBuilder` | Bundle has many optional parts |
| Facade | `LabelingService` | Routes call one method and do not know the pipeline order |
| Proxy / Decorator | Cache, daily budget cap, retry around the LLM provider | Cross-cutting concerns stay out of decision code |

**Deferred until after open item 8.1:** Observer (the `on_labeled(transaction)` hook) and Null Object (a no-op listener). Nothing subscribes to the hook until the Phase 2 budget engine, so neither is built in the core. Add both together when Phase 2 starts.

**Deliberately skipped:** State pattern (an enum plus a transition table is enough for 4 states), Command, Singleton, Abstract Factory. Judges reading the code will notice over-engineering.

If option 2 of item 8.1 is chosen, add a plain dict tool registry (name to function). It does not need to be a formal pattern.

---

## 5. Codebase rules

### 5.1 Architecture

1. Layers are `api -> services -> pipeline -> domain/repositories`. No upward imports.
2. `domain` and the evidence builder are pure functions with no I/O.
3. The AI step is the only non-deterministic component and sits behind one interface: `DecisionEngine.decide(bundle) -> Decision`.
4. The UI lives in `frontend/` and has no business logic. It calls the API in section 12, renders `Decision` objects and sends taps.
5. Every model call goes through `LLMGateway`. Nothing else imports a provider SDK.

### 5.2 Contract and safety

6. Pydantic models are the single source of truth for the evidence bundle and the decision output. No raw dicts across layer boundaries.
7. Categories live in one enum. `allowed_categories` is generated from it, never retyped.
8. **The LLM proposes, code decides.** All thresholds (score cutoffs 0.80 and 0.50, min senders N, agreement X) live in `config.py`. Only the policy guard assigns the final state.
9. Privacy is structural. The bundle schema has no field that can hold raw messages from other users. The sender name is stripped in the builder, before the AI boundary.
10. Validate LLM output against the schema. On failure, retry once, then fall back to `UNCLASSIFIED`. Never crash the feed.
11. Low confidence forces `category = null`. Enforced in the guard and covered by a test.
12. A user tap enters crowd aggregates only through the promotion rule, never directly.

### 5.3 Operations

13. No secrets in the repo or the zip. Config comes from env vars only. `replay` mode runs with zero keys.
14. Every decision stores `reason` and `clues_used`. The side panel reads them from there.
15. Per-session sandbox: every read and write of user memory, crowd overlay and transactions is scoped by `session_id`. Reset deletes it. Seed tables are read-only and shared.
16. The gateway enforces a daily call cap from config. When the cap is hit, the engine falls through to `RulesEngine`.

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
- No abstractions for single-use code. *Project exception:* the patterns in section 4 are approved (Chain, Strategy, Factory, Builder, Facade, Proxy/Decorator), as are the optional `tool_trace` and `proposed_action` fields on `Decision` and the routes and functions listed in section 12. The `on_labeled` hook and Null Object are deferred until Phase 2 and are not built in the core. Do not add others without a stated reason.
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
- **Seams are built, not extended.** The `tool_trace` and `proposed_action` fields on `Decision` exist because the design needs them for open item 8.1. The `on_labeled` hook and its Null Object listener are deferred until after 8.1 (section 4). Do not add further "just in case" hooks.
- **Success criteria are the scenario tests.** Each build-order step in section 10 should start from a failing test (clear, weak, conflicting, cold start, plus unit tests for the guard rules) and end when it passes in `replay` mode.
- **Surgical changes protect the contract.** Changes to the Pydantic models, the category enum or `config.py` thresholds are never a side effect of another task. Make them in their own commit and update `agent_io_spec.md` if the contract changes.
- **Surface, don't guess, on open items.** When a task touches something listed in section 11, the AI states the assumption it is making and asks rather than silently picking a value.

---

## 6. LLM access: staying free

**LLMGateway** is a decorator chain in front of every call:

```
cache (by bundle hash) -> daily budget cap -> provider chain -> rules fallback
```

- **Provider chain:** Gemini free tier first, then Bedrock free tier, then `RulesEngine`. Each sits behind the same `LLMProvider` interface. If one is rate-limited or errors, the next takes over. A judge never sees a crash.
- **Model choice:** a cheap, fast model on each provider (a Flash-class model on Gemini, a small/lite-class model on Bedrock). Exact model IDs live in `config.py`, not in code. Confirm availability in your account.
- **Cache:** key is a hash of the whole bundle with amount and time bucketed. Repeat clicks cost nothing.
- **Pre-warm:** `scripts/prewarm.py` runs the four seeded scenarios once at deploy and stores the results. Scenario buttons then use zero live quota. This is the same data `replay` mode uses.
- **Small calls:** the bundle is a few hundred tokens. Request JSON output with the schema, set a low `max_output_tokens`.
- **Keep the LLM in the loop:** the contest requires AI as a core component. Do not skip the LLM when evidence looks clear. Use it for the decision and the `reason` text.
- **Revisit trigger:** if the cheap model gives unreliable JSON or poor decisions on the seeded scenarios, or free limits block testing, move to a larger model or revisit the provider choice.

---

## 7. How open item 8.1 affects the design

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

- `DecisionEngine.decide(bundle) -> Decision` is the only interface. Option 2's loop lives inside an engine implementation.
- `Decision` already has two optional fields, `tool_trace` and `proposed_action`. Both stay empty under option 1.
- The guard computes the final state in code, whichever option is picked.
- The gateway cache key covers the whole bundle, so option 2's tool results are cached too.

Whichever option is chosen, the naming in slides and README must match what the system does.

---

## 8. Run modes

| Mode | Used by | AI step |
|---|---|---|
| `live` | Hosted demo | Real LLM via `LLMGateway` |
| `replay` | Judge running the zip locally | Precomputed outputs for seeded scenarios, `RulesEngine` for custom input |

Selected by one env var, `RUN_MODE`. Never put an API key in the zip. The README states plainly that custom transactions in `replay` use the rules fallback, not the LLM.

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

---

## 10. Build order and ownership of files

0. Backend skeleton: the stubs in section 12, all bodies empty, so the frontend teammate can start against the contract.
1. Seed data and pipeline lookup paths, no AI: `domain`, `repositories`, `pipeline/router.py`, `pipeline/memory.py`.
2. Evidence builder and decision step: `pipeline/evidence.py`, `engines/`, `llm/`.
3. Policy guard and the four scenarios: `pipeline/guard.py`, `tests/scenarios/`.
4. Tap loop, per-session sandbox, reset: `services/`, `api/`, and `frontend/` (frontend teammate).
5. `replay` mode and `prewarm.py`.
6. Deploy, README, then the 1-page guide, slides and video.
7. Phase 2: add the `on_labeled` hook and a Null Object listener (deferred, see section 4), then the budget engine through it, only if time allows before Dec 3.

---

## 11. Open items

- Open item 8.1: AI step shape (section 7).
- Endpoint list and response shapes in section 12 to be confirmed with the frontend teammate.
- Where the sender's name comes from for `strip_sender_name` (the input JSON has only `user_id`).
- Exact free-tier models and limits on Gemini and Bedrock.
- Minimum `distinct_senders`, agreement level and score cutoffs, tuned on the seeded data.
- Whether `SUGGESTED` stays a separate action or becomes a flag on `AUTO_LABELED`.
- Whether to drop `own_label_for_receiver` from the bundle (always null at the AI step).
- N days before `UNCLASSIFIED` moves to Other.
- Real transaction input format and which merchant and MCC fields MoMo holds.
- Privacy review of aggregated crowd evidence before any real deployment.

---

## 12. Backend API contract and function stubs

The backend owner defines the interface. The frontend teammate codes against it. **Every route handler and function body below stays empty (`...`) for now.** Signatures, models and names are the contract. FastAPI generates the OpenAPI page at `/docs` from these, so the frontend can read the shapes there. These functions and routes are the approved interface list for rule "No abstractions for single-use code" in section 5.5.

Not stubbed on purpose: the `on_labeled` hook and Null Object (deferred, section 4) and `GET /budget` (Phase 2).

### 12.1 Models (in `domain/models.py`, no I/O)

| Model | Holds | Source |
|---|---|---|
| `TransactionIn` | Raw transaction JSON | `agent_context.md` section 5 |
| `EvidenceBundle` | Clues built by code | `agent_io_spec.md` section 2 |
| `CrowdStats` | `distinct_senders`, `label_distribution`, `typical_amount_range`, `peak_hours`, `message_keywords` | `agent_io_spec.md` section 2 |
| `Decision` | Category, confidence, score, action, reason, `clues_used`, alternatives, buttons, optional `tool_trace` and `proposed_action` | `agent_io_spec.md` section 3 |
| `LabeledTransaction` | Transaction, final state, final category, `Decision` | `states.py` for the four states |
| `TransactionDetailOut` | `LabeledTransaction` plus its `EvidenceBundle` (side panel) | New |
| `PendingItemOut` | Unclassified transaction, `suggested_buttons`, receiver sender count | New |
| `CategoryTotalOut` | Category, total amount, count | New |
| `ScenarioOut` | Scenario id, title, description, sample transaction | New |
| `LabelIn` | `transaction_id`, `category` (a tap) | New |
| `AgingIn` | `days` (demo fast-forward) | New |
| `HealthOut` | Status, `run_mode` | New |
| `PipelineContext` | Internal: session id, transaction, bundle, decision, result | New, never sent to the UI |

### 12.2 Routes (in `api/routes.py`)

| Method | Path | Handler | Calls | Purpose |
|---|---|---|---|---|
| GET | `/health` | `health` | none | Status and `run_mode` |
| GET | `/categories` | `list_categories` | none | Category list from the enum |
| GET | `/scenarios` | `list_scenarios` | `LabelingService.list_scenarios` | Four preset scenario buttons |
| POST | `/scenarios/{scenario_id}/run` | `run_scenario` | `LabelingService.run_scenario` | Run a preset |
| POST | `/transactions` | `submit_transaction` | `LabelingService.label_transaction` | Custom form submit |
| GET | `/transactions` | `list_transactions` | `LabelingService.list_transactions` | Feed for this session |
| GET | `/transactions/{transaction_id}` | `get_transaction_detail` | `LabelingService.get_transaction_detail` | Side panel: bundle, reason, clues |
| GET | `/pending` | `list_pending` | `LabelingService.list_pending` | "Review later" batch, most senders first |
| POST | `/labels` | `submit_label` | `LabelingService.apply_user_label` | User tap |
| GET | `/summary` | `spending_summary` | `LabelingService.spending_summary` | Running total per category |
| POST | `/aging/fast-forward` | `fast_forward_aging` | `LabelingService.age_unclassified` | Demo button, moves old items to Other |
| POST | `/reset` | `reset_session` | `LabelingService.reset_session` | Delete this session's data |

Session: a cookie holds `session_id`. `get_session_id` creates it on the first request.

### 12.3 Stubs

```python
# app/main.py
def create_app() -> FastAPI:
    """Build the app, include the router, mount frontend/dist as static files."""
    ...

# app/config.py
def get_settings() -> Settings:
    """Read env vars and defaults. Keys are listed in section 9."""
    ...

# app/api/deps.py
def get_session_id(request: Request, response: Response) -> str: ...
def get_labeling_service() -> LabelingService: ...

# app/api/routes.py
router = APIRouter()
SessionId = Annotated[str, Depends(get_session_id)]
Service = Annotated[LabelingService, Depends(get_labeling_service)]

@router.get("/health")
def health() -> HealthOut: ...

@router.get("/categories")
def list_categories() -> list[str]: ...

@router.get("/scenarios")
def list_scenarios(service: Service) -> list[ScenarioOut]: ...

@router.post("/scenarios/{scenario_id}/run")
def run_scenario(scenario_id: str, session_id: SessionId, service: Service) -> LabeledTransaction: ...

@router.post("/transactions")
def submit_transaction(body: TransactionIn, session_id: SessionId, service: Service) -> LabeledTransaction: ...

@router.get("/transactions")
def list_transactions(session_id: SessionId, service: Service) -> list[LabeledTransaction]: ...

@router.get("/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: str, session_id: SessionId, service: Service) -> TransactionDetailOut: ...

@router.get("/pending")
def list_pending(session_id: SessionId, service: Service) -> list[PendingItemOut]: ...

@router.post("/labels")
def submit_label(body: LabelIn, session_id: SessionId, service: Service) -> LabeledTransaction: ...

@router.get("/summary")
def spending_summary(session_id: SessionId, service: Service) -> list[CategoryTotalOut]: ...

@router.post("/aging/fast-forward")
def fast_forward_aging(body: AgingIn, session_id: SessionId, service: Service) -> list[LabeledTransaction]: ...

@router.post("/reset")
def reset_session(session_id: SessionId, service: Service) -> None: ...
```

```python
# app/services/labeling_service.py  (Facade, the only entry for the API)
class LabelingService:
    def __init__(self, handlers: list[Handler], transactions: TransactionRepo,
                 memory: MemoryRepo, crowd: CrowdRepo) -> None: ...

    def list_scenarios(self) -> list[ScenarioOut]: ...
    def run_scenario(self, session_id: str, scenario_id: str) -> LabeledTransaction: ...
    def label_transaction(self, session_id: str, txn: TransactionIn) -> LabeledTransaction: ...
    def list_transactions(self, session_id: str) -> list[LabeledTransaction]: ...
    def get_transaction_detail(self, session_id: str, transaction_id: str) -> TransactionDetailOut: ...
    def list_pending(self, session_id: str) -> list[PendingItemOut]: ...
    def apply_user_label(self, session_id: str, label: LabelIn) -> LabeledTransaction:
        """Save to user memory, set USER_LABELED, add to crowd only through the promotion rule."""
        ...
    def spending_summary(self, session_id: str) -> list[CategoryTotalOut]: ...
    def age_unclassified(self, session_id: str, days: int) -> list[LabeledTransaction]: ...
    def reset_session(self, session_id: str) -> None: ...
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
    def build(self, session_id: str, txn: TransactionIn) -> EvidenceBundle: ...

def strip_sender_name(message: str, sender_name: str | None) -> str: ...
def time_features(timestamp: datetime) -> TimeFeatures: ...
def amount_features(amount: int, user_median: float, crowd: CrowdStats | None) -> AmountFeatures: ...
def name_clues(display_name: str) -> list[str]: ...

class EvidenceHandler:
    def handle(self, ctx: PipelineContext) -> PipelineContext: ...

class DecisionHandler:
    def handle(self, ctx: PipelineContext) -> PipelineContext: ...

# app/pipeline/guard.py
def level_from_score(score: float) -> Confidence: ...
def apply_guard(decision: Decision, bundle: EvidenceBundle) -> Decision:
    """Final state in code: score cutoffs, min senders, min agreement, conflict cap, null category on Low."""
    ...
def should_promote(stats: CrowdStats) -> bool:
    """Promotion rule for taps entering crowd aggregates."""
    ...

class GuardHandler:
    def handle(self, ctx: PipelineContext) -> PipelineContext: ...
```

```python
# app/engines/base.py
class DecisionEngine(Protocol):
    def decide(self, bundle: EvidenceBundle) -> Decision: ...

# app/engines/live.py
class LiveEngine:
    def __init__(self, gateway: LLMGateway, fallback: DecisionEngine) -> None: ...
    def decide(self, bundle: EvidenceBundle) -> Decision: ...
    def _build_prompt(self, bundle: EvidenceBundle) -> str: ...
    def _parse_decision(self, raw: dict) -> Decision | None:
        """Validate against the schema. None means retry once, then UNCLASSIFIED."""
        ...

# app/engines/replay.py
class ReplayEngine:
    def __init__(self, fixtures_path: Path, fallback: DecisionEngine) -> None: ...
    def decide(self, bundle: EvidenceBundle) -> Decision: ...

# app/engines/rules.py
class RulesEngine:
    def decide(self, bundle: EvidenceBundle) -> Decision: ...

# app/engines/factory.py
def build_engine(run_mode: str) -> DecisionEngine: ...
```

```python
# app/llm/gateway.py
class LLMProvider(Protocol):
    name: str
    def generate_json(self, prompt: str, schema: dict, max_output_tokens: int) -> dict: ...

class LLMGateway:
    def __init__(self, providers: list[LLMProvider], cache: ResponseCache, budget: DailyBudget) -> None: ...
    def generate_json(self, prompt: str, schema: dict, cache_key: str) -> dict | None:
        """None means every provider failed or the cap is hit. Caller falls back to RulesEngine."""
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

class MerchantRepo:        # read-only, shared seed tables
    def lookup_merchant(self, merchant_id: str) -> Category | None: ...
    def lookup_mcc(self, mcc: str) -> Category | None: ...
```

```python
# scripts/seed.py and scripts/prewarm.py
def seed_database() -> None: ...
def prewarm_scenarios() -> None:
    """Run the four seeded scenarios once and store the results for replay mode."""
    ...
```
