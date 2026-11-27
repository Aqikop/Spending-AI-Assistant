# MoMo Auto Spending Categorization: Workload Plan (Draft v1)

Status: draft, Nov 26, 2026. Built from `Workflow_draft.md` (this replaces `architecture.md` as the architecture and flow document), `tech_stack_and_conventions.md`, `agent_io_spec.md` and `agent_context.md`.

Deadline: qualifying round closes **Thu Dec 3**. Plan: feature freeze Tue Dec 1, submit Wed Dec 2 evening, Dec 3 is buffer only.

Items marked **[Confirm]** are assumptions I made where the documents disagree or are silent. Settle them in the Day 1 sync.

---

## 1. Roles (3 people)

Names are placeholders. Assign by strength: the frontend owner is the teammate who owns React.

| Role | Person | Owns | Folders |
|---|---|---|---|
| **A: AI and pipeline lead** (backend owner) | ___ | Contract, models, chain, evidence builder, LLM gateway, engines, tool loop, advice AI call, run modes | `domain/`, `pipeline/` (except guard), `engines/`, `llm/`, `config.py`, `main.py` |
| **B: Frontend lead** | ___ | Whole UI, API client, side panel, demo polish, slides design | `frontend/` |
| **C: Data, services and delivery lead** | ___ | Seed data, repositories, `LabelingService`, policy guard, tap loop, advice flow (non-AI part), tests, Docker, deploy, README | `repositories/`, `services/`, `api/`, `pipeline/guard.py`, `data/seed/`, `scripts/seed.py`, `tests/`, `Dockerfile`, `README.md` |

Why this split: A holds everything non-deterministic and the contract. C holds everything deterministic and testable. B is isolated behind the API, so B never blocks on A or C after Day 1.

Handoffs that matter:

- **A to B:** OpenAPI at `/docs` plus example JSON fixtures (Day 1). B codes against fixtures until real routes work.
- **A to C:** model and `Handler`/`DecisionEngine` signatures (Day 1). C builds the service and guard against them.
- **C to A:** seed data and repositories (Day 2). A needs them to test the evidence builder and the tool.
- **C to B:** working routes (Day 2 onward).

---

## 2. Decisions to lock on Day 1 (30 min, all three)

Most decisions from the first draft of this plan are now applied in `tech_stack_and_conventions.md`. The table shows what that file says today. The sync confirms them and closes the open rows below the table.

| # | Topic | Now in the tech stack | Where | Status |
|---|---|---|---|---|
| 1 | AI step shape (open item 8.1) | **Option 2: tool call.** One tool, `get_receiver_fingerprint`, at most one call per transaction. Up to 2 AI calls per transaction | Sections 1, 7 | Working assumption, **[Confirm]** |
| 2 | Rules fallback | **None.** No `RulesEngine`. Provider chain is Gemini, then Bedrock, then `AIUnavailableError`. Replay mode returns `AI_REQUIRED` for custom input | 5.3 rule 16, 6, 8 | Applied |
| 3 | `on_labeled` hook | **Dropped**, no Observer or Null Object. Flow 2 reads labeled transactions with a query | 4, 5.5 | Applied |
| 4 | New API surface | `POST /advice`, `GET /vouchers`, `PUT /profile`, plus models `AdviceOut`, `VoucherOut`, `ProfileIn/Out`, `CategoryRow`, `ErrorOut`. `AdviceService` added | 12 | Applied as stubs. A publishes the OpenAPI page on Day 1 |
| 5 | Guard reads crowd numbers from the DB | **Yes**, never from the AI answer | 5.2 rule 8, 12.3 guard stub | Applied |
| 6 | `own_label_for_receiver` | **Dropped.** `used_tool` added to `Decision`. `receiver_id` added to the bundle (code side only, used by the tool) | 11, 12.1 | Decided in the tech stack. `agent_io_spec.md` is not updated yet |
| 7 | When AI is unavailable | HTTP 503 with `ErrorOut` (`AI_UNAVAILABLE` or `AI_REQUIRED`). Nothing is saved as a label. UI shows retry. Errors live in `domain/errors.py` | 5.3 rule 16, 12.1, 12.2 | Applied |
| 8 | `SUGGESTED` storage | Flag `is_suggested` on `LabeledTransaction` (stored as `AUTO_LABELED`) | 12.1 | Applied |
| 9 | Fixed costs (not cuttable) | Housing & Rent, Bills & Utilities, Health & Education. Defined once in `domain/categories.py` | 12.1 | Applied |
| 10 | Thresholds | `SCORE_HIGH` 0.80, `SCORE_MEDIUM` 0.50, `MIN_SENDERS_HIGH` 15, `MIN_AGREEMENT_HIGH` 0.60, `ADVICE_MAX_VOUCHERS` 3. Promotion values lowered for the demo | 9 | Draft values. Tune on seed data on Day 4 |
| 11 | Sender name for `strip_sender_name` | Comes from `users.display_name` | 12.3 | Applied |
| 12 | Monthly income | Preset per demo user, editable through `PUT /profile` | 12.1 | Applied. Read path is open (row b below) |
| 13 | Budget alert (<20% left) | **Out of scope.** The advice flow replaces it | 12 | Applied |

**Still open after the sync**

| # | Open item | Plan assumes | Owner, when |
|---|---|---|---|
| a | `agent_io_spec.md` still has `own_label_for_receiver` and no `used_tool` or `receiver_id` | Update it in its own commit | A, Day 1 |
| b | Where the UI reads the current monthly income. Only `PUT /profile` exists | **[Confirm]** add `GET /profile`, so B can show and edit income | A, Day 1 (B needs it on Day 2) |
| c | File names. The tech stack uses `advice/tables.py`, `advice/generator.py`, `engines/tools.py` and `domain/errors.py`, and says `llm` is used by `engines/live.py` and `advice/generator.py` | The tech stack names win. The skeleton and `folder_structure.md` still use older names (`summary.py`, `advisor.py`, `llm/tools.py`, no `errors.py`) and need renaming | A, Day 1 |
| d | Values still marked "to be decided": `ADVICE_MIN_LABELED`, `ADVICE_MAX_UNCLASSIFIED_SHARE`, `UNCLASSIFIED_AGING_DAYS`, `PROMOTION_MIN_SENDERS`, `PROMOTION_MIN_AGREEMENT` | Choose them on Day 4 together with row 10, against the seed data | C, Day 4 |

---

## 3. Milestones

| Milestone | Date | Done when |
|---|---|---|
| **M0: Contract frozen** | Thu Nov 26 | Decisions locked, stubs and models in place, `/docs` shows all routes, UI scaffold runs on fixtures, API keys verified |
| **M1: Deterministic path live** | Fri Nov 27 | A merchant or MCC transaction and a saved-memory transaction go through the real API and show in the UI |
| **M2: Flow 1 with AI** | Sun Nov 29 | All 4 scenarios run live end to end in the UI. Guard unit tests and scenario tests pass |
| **M3: Flow 2 and run modes** | Mon Nov 30 | Advice and vouchers work live. `replay` mode works with zero keys |
| **M4: Freeze and deploy** | Tue Dec 1 | Hosted link works. Docker image builds. Feature freeze |
| **M5: Submission pack** | Wed Dec 2 | README, 1-page guide, slides, video, zip tested on a clean machine. Submitted |
| Buffer | Thu Dec 3 | Confirm submission and link. Fix only critical bugs |

---

## 4. Day-by-day plan

Format per day: tasks per person, then the end-of-day check. Every task ends with a way to verify it (rule 5.5 section 4).

Working rhythm: 10-minute standup at the start of each day, 10-minute check at the end. One feature branch per task, small commits, merge to `main` only when tests pass.

### Day 1: Thu Nov 26 (today, partial day): contract and scaffold

**All, first 30 min:** decisions sync (section 2). Create the repo, branch rules, shared `.env.example`.

**A: AI and pipeline lead**
1. Update the docs for the decisions above: tech stack sections 3, 4, 5, 6, 8, 12 and `agent_io_spec.md` (drop `own_label_for_receiver`, add `used_tool`). Own commit. Also replace every reference to `architecture.md` with `Workflow_draft.md` in all four files. Verify: no doc still mentions `RulesEngine`, the deferred hook or `architecture.md`.
2. Create backend skeleton from section 12: folders, `pyproject.toml` with uv, ruff, mypy, pytest. Models in `domain/models.py`, enums in `categories.py` and `states.py`, all signatures with empty bodies. Verify: `uvicorn` starts and `/docs` lists every route.
3. Export example JSON per route into `frontend/src/mocks/` (copy from workflow sections 2.3, 2.5, 3.3, 3.4). Verify: B can read them.
4. Get one Gemini key and check Bedrock access. Write the exact model IDs, rate limits and expiry into `config.py` and the README notes. Verify: one real JSON call works on each provider.

**B: Frontend lead**
1. Scaffold Vite + React + Tailwind in `frontend/`, dev proxy to the FastAPI port.
2. Build the one-screen layout with five empty blocks: transactions, category table, advice, vouchers, side panel and simulator.
3. Generate a typed API client from the OpenAPI JSON once A publishes it, and wire mock fixtures behind it. Verify: screen renders from fixtures.

**C: Data, services and delivery lead**
1. Design the simulated dataset on paper, then as files in `data/seed/`: about 15 merchants, MCC table, crowd aggregates for the 4 scenario receivers (clear, weak, conflicting, cold start), plenty of genuine personal transfers, about 8 mock vouchers, one demo user with income.
2. Write the 30 to 50 demo transactions for one month, already labeled, spread over categories so the category table looks real.
3. SQLite schema from workflow section 4. Verify: `seed.py` runs twice without error and the row counts match.

**End of day (M0):** `/docs` is live, UI shows fixtures, keys verified, seed files drafted.

---

### Day 2: Fri Nov 27: deterministic path (Flow 1, steps 0 to 3)

**A**
1. `config.py` with all keys from tech stack section 9.
2. `RouterHandler` (merchant, then MCC) and `UserMemoryHandler`. `chain.py` with `run_chain`.
3. Pure functions in `evidence.py`: `strip_sender_name`, `time_features`, `amount_features`, `name_clues`. Unit tests for each.
4. Verify: unit tests green. A merchant transaction returns `AUTO_LABELED` with source `lookup`.

**C**
1. All four repositories with `session_id` on every per-session read and write. `delete_session` on each.
2. Session cookie dependency (`get_session_id`). Load the 30 to 50 demo transactions into a new session.
3. `LabelingService` with `list_transactions`, `spending_summary`, `reset_session`, and `label_transaction` for the lookup and memory paths only.
4. Verify: tests prove two sessions do not see each other's data, and reset removes everything.

**B**
1. Transaction feed with category and state badges (`AUTO_LABELED`, `SUGGESTED`, `UNCLASSIFIED`, `USER_LABELED`).
2. Spend-by-category table with the income field.
3. Simulator: four scenario buttons and the custom form (validation on required fields).
4. Switch from fixtures to real routes as C's routes come up. Verify: reset restores the demo data.

**End of day (M1):** a merchant transaction and a saved-memory transaction work through the real API and show in the UI.

---

### Day 3: Sat Nov 28: the AI core

**A**
1. `LLMGateway`: cache (bundle hash), daily budget cap, provider chain. `GeminiProvider` first, then `BedrockProvider`. Provider chain ends in "unavailable", not in rules.
2. Tool registry (plain dict) with `get_receiver_fingerprint(receiver_id)`. The id comes from code only.
3. `LiveEngine`: build prompt, call 1, handle the tool request, call 2, parse and validate against the schema, retry once, else raise "AI unavailable". Cap at one tool call per transaction.
4. Verify: one real scenario returns a valid `Decision` with `tool_trace`. Invalid JSON test triggers the retry path.

**C**
1. `pipeline/guard.py`: `level_from_score`, `apply_guard` (cutoffs, min senders, min agreement, conflict cap, null category on Low), `should_promote`, `GuardHandler`.
2. Unit tests, one per rule, including "Low forces `category = null`".
3. Scenario tests in `tests/scenarios/` for the 4 cases, using hand-written AI answers so they run without a key. Verify: guard tests green, scenario tests run (they may fail until A wires the chain, that is fine).

**B**
1. Side panel: evidence bundle, reason, `clues_used`, tool-call trace ("AI asked for receiver pattern: 38 senders found"), proposed versus final action.
2. Tap prompt: top candidate buttons and the "Review later" batch from `/pending`.
3. Verify against fixtures for all four outcomes.

**End of day:** one transaction goes through the real LLM and the side panel shows the trace.

---

### Day 4: Sun Nov 29: Flow 1 complete (M2)

**A**
1. `EvidenceHandler`, `DecisionHandler`, `build_chain`, `build_engine`. Wire them into C's service.
2. Run the four scenarios live. Tune the prompt until the results match the expected outcomes: clear gives auto-label, weak gives ask, conflicting does not spread, cold start gives unclassified.
3. Error path: AI unavailable returns the agreed error and saves nothing.
4. Verify: all 4 scenarios correct live, with and without the tool call.

**C**
1. `apply_user_label`: save to user memory, set `USER_LABELED`, add to crowd only through the promotion rule.
2. `list_pending` (most senders first), `age_unclassified` plus `/aging/fast-forward`.
3. Tune thresholds against the seed data. Record final values in `config.py` and the README.
4. Verify: scenario tests pass with real recorded answers from A's live runs. A tap followed by the same receiver again exits at memory.

**B**
1. Wire taps, pending batch, aging button and reset to the real routes.
2. States: loading, "AI unavailable, try again", "AI required".
3. Verify: click through all four scenarios in the browser.

**End of day (M2):** Flow 1 works end to end in the UI. Tests green in `replay`-style fixtures.

---

### Day 5: Mon Nov 30: Flow 2 and run modes (M3)

**C**
1. Advice flow non-AI parts: data check (minimum labeled transactions N, unclassified share), category table builder with change vs last month, `cuttable` flags, summary builder.
2. Validator for AI advice (workflow section 3.5): categories allowed and cuttable, voucher ids on the list, at most 3 vouchers, numbers in text must match the summary.
3. Verify: unit tests with bad inputs (invented voucher id, advice targeting rent, wrong number) all rejected.

**A**
1. Advice AI call through the gateway: prompt, JSON schema, one retry, "AI unavailable" on failure. `POST /advice` and `GET /vouchers`.
2. `ReplayEngine` and `scripts/prewarm.py`. Prewarm stores the 4 scenario answers plus the first-load advice.
3. `RUN_MODE` factory. Custom transaction in `replay` returns "AI required".
4. Verify: with no keys set and `RUN_MODE=replay`, all 4 scenarios and the advice block work.

**B**
1. Advice block, voucher cards, "Get advice" button, first-load advice call, "not enough data yet" state.
2. Show the advice only after validation passes (what the API returns is rendered as is, no logic in the UI).
3. Verify: advice appears on first load and refreshes on click.

**End of day (M3):** Flow 2 works live. `replay` mode works with zero keys.

---

### Day 6: Tue Dec 1: deploy and freeze (M4)

**C**
1. Two-stage Dockerfile: Node builds the frontend, Python copies `dist`. Deploy to the VM or App Runner with env vars. Seed on startup.
2. CI-style check script: `ruff`, `mypy`, `pytest` in `replay` mode.
3. Smoke test script against the hosted URL.

**A**
1. Run `prewarm.py` with real keys and commit the recorded answers.
2. Rate limit and spend cap, key stays server-side, no secrets in repo or zip. Check the free-tier numbers again after the tool loop doubles calls.
3. Review the side panel text and `reason` quality across all scenarios.

**B**
1. UI polish for judges: clear labels, readable side panel, mobile width check, empty and error states.
2. `npm run build`, commit `frontend/dist` into the zip path.
3. Full click-through on the hosted link.

**End of day (M4): feature freeze.** Hosted link works. After this, only bug fixes.

---

### Day 7: Wed Dec 2: submission pack (M5)

**C**
1. README: simulated data notice, open-source libraries, AI tools used (including AI coding assistants), run instructions for `live` and `replay`, plain statement that custom transactions in `replay` need AI, and that no rules fallback exists.
2. 1-page guide.
3. Build the submission zip (no secrets, includes `frontend/dist`). Test on a clean machine with Python only.

**B**
1. Slides: problem, workflow, AI decision step, guard, privacy, demo screenshots.
2. Screen-record the demo clips for the video.

**A**
1. Video script and narration. Use the same terms as the code (`AUTO_LABELED`, `SUGGESTED`, `UNCLASSIFIED`, `USER_LABELED`).
2. Check the "agent" claim: under option 2 the AI decides whether to call a tool, so "AI agent" is accurate. Keep it consistent in slides, README and video.
3. Fix critical bugs only.

**All, evening:** one full dry run of both judge paths (hosted link, and zip in `replay`). Submit the same evening if everything passes.

---

### Day 8: Thu Dec 3: buffer

- Confirm the submission went through and the hosted link is up.
- Fix only critical bugs. No new features, no refactors.
- Keep a rollback copy of the Dec 2 build.

---

## 5. Risks and what to cut

| Risk | Mitigation |
|---|---|
| Free-tier limits hit by the tool loop (up to 2 calls per transaction) | Cache, pre-warm, scenario buttons use recorded answers, daily cap in the gateway |
| Cheap model returns bad JSON | Schema validation, one retry, "AI unavailable" state. Revisit the model on Day 4 |
| Bedrock not available in the account | Gemini only. Drop `BedrockProvider` |
| Frontend teammate is the single point for UI | A and C own the API shapes. B starts on fixtures on Day 1 so the UI never waits |
| Judge runs zip with no key | `replay` mode works from Day 5, tested on Day 7 |
| Contract changes late | Contract frozen at M0. Any change is its own commit and updates `agent_io_spec.md` |

**If behind schedule, cut in this order:**

1. `BedrockProvider`
2. Custom form polish
3. Aging fast-forward button
4. Voucher `why` text
5. "Numbers match the summary" check (keep the voucher and category checks)
6. Change vs last month column

**Never cut:** the 4 scenarios, the policy guard, the side panel, `replay` mode, the README declarations.

---

## 6. Open items still needed from the team

1. Confirm the decisions and close the open rows in section 2.
2. Real submission format and time on Dec 3 (the plan submits Dec 2 evening to be safe).
3. Minimum labeled transactions N for advice, and N days for aging.
4. Final thresholds after Day 4 tuning.
5. Privacy review wording for the README (aggregated crowd evidence).