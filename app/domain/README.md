# Domain Layer and Docs Update

Status: Nov 28, 2026. Owner: A (AI and pipeline lead). Suggested location: `app/domain/README.md`.

## What the domain layer is

`app/domain/` is the shared vocabulary of the backend: the categories, the states, the data shapes and the errors. It has **no I/O**: no database, no AI call, no HTTP. Everyone codes against it, so B and C can build in parallel.

| File | What it holds |
|---|---|
| `categories.py` | The `Category` enum (10 labels), `FIXED_COSTS`, `allowed_categories()`, `is_cuttable()` |
| `states.py` | `State`, `Action`, `Confidence`, `Source`, the transition table, `action_to_state()` |
| `models.py` | Pydantic models for the transaction, the evidence bundle, the AI decision, and all API inputs and outputs |
| `errors.py` | `AIUnavailableError` and `AIRequiredError` (both become HTTP 503) |

Tests: `tests/unit/test_domain.py`.

## Things to know before you use it

- **Categories live in one place.** Add or change one in `categories.py` only. `allowed_categories()` is generated from the enum, never retyped.
- **`SUGGESTED` is an action, not a stored state.** It is stored as `AUTO_LABELED` with `is_suggested = true`. Use `action_to_state()` to convert.
- **Fixed costs are not cuttable** in advice: Housing & Rent, Bills & Utilities, Health & Education.
- **`receiver_id` is never sent to the AI.** It is excluded from the prompt output of `TransactionBlock`.
- **`CrowdStats` holds aggregates only.** The model rejects extra fields, so it cannot carry another user's raw message.
- **`Decision` is permissive.** The AI fills category, score and reason. The guard fills `confidence` and `action`.

## What changed in this update

| Change | Where | Why |
|---|---|---|
| Domain layer added | `app/domain/`, `tests/unit/test_domain.py` | Shared contract for the whole team |
| Aging transition | `states.py`, `agent_io_spec.md` section 7 | `UNCLASSIFIED` can now move to `AUTO_LABELED` (category Other, `is_suggested = true`) after N days. A user edit then makes it `USER_LABELED` |
| `GET /profile` | `tech_stack_and_conventions.md` section 12, workload plan row b | The UI needs to read the monthly income, not only set it |
| Earlier doc conflicts resolved | `docs/` | No rules fallback, no `on_labeled` hook, advice routes in the contract, `agent_io_spec.md` at v2 |

## For each role

- **B (frontend):** the API shapes are in `models.py`. `GET /profile` is now part of the contract.
- **C (data and services):** use `can_transition()` and `action_to_state()`. `age_unclassified` should set category Other, state `AUTO_LABELED`, `is_suggested = true`.
- **A (me):** routes and service skeleton, file renames, and `create_app()` come next. Then the Day 2 pipeline work.

## Rules for changing this folder

Changes to `app/domain/` are never a side effect of another task. Make them in their own commit and update `docs/agent_io_spec.md` if the contract changes.
