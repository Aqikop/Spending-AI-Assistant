# MoMo Auto Spending Categorization Agent: Input/Output Spec (Draft v2)

> Companion to `agent_context.md`, `Workflow_draft.md` (replaces `architecture.md`), `tech_stack_and_conventions.md` and `workload_plan_draft.md`. This file records the contract for the AI decision step: what goes in, what the AI returns, and what the code turns it into. All data is simulated for the contest demo.
>
> v2 aligns this file with the decisions already applied in the other docs. See section 9 for the list of changes from v1.

---

## 1. Agreed category list (10 labels)

Clothing was merged into Shopping. The list is kept short because weak clues in group 3 cannot separate close labels. The list lives in one enum (`domain/categories.py`), and `allowed_categories` is generated from it, never retyped.

| # | Label | Notes |
|---|---|---|
| 1 | Food & Drink | Meals, street food, cafes, milk tea |
| 2 | Groceries & Market | Chợ, tạp hóa, supermarkets |
| 3 | Transport | Grab, fuel, parking, bus and train tickets |
| 4 | Shopping | Online and general retail, including clothing |
| 5 | Entertainment & Outdoor | Film, games, karaoke, travel activities |
| 6 | Bills & Utilities | Electricity, water, internet, phone top-up |
| 7 | Housing & Rent | Rent and building fees |
| 8 | Health & Education | Pharmacy, clinic, tuition, courses |
| 9 | Personal transfer | Genuine person-to-person money |
| 10 | Other | Fallback, and where stale UNCLASSIFIED items land after N days |

For group 3 (personal QR / P2P), the realistic outputs are Food & Drink, Groceries & Market, Transport, Housing & Rent, and Personal transfer. The other labels mostly arrive through merchant and MCC lookups (groups 1 and 2).

Fixed costs (not cuttable in the advice flow): Housing & Rent, Bills & Utilities, Health & Education. Defined once in `domain/categories.py`.

---

## 2. How the AI step works

The AI step has two calls at most per transaction:

1. **Call 1** receives a **small first package** (section 3) and a tool definition.
2. The AI either answers directly, or asks for the tool `get_receiver_fingerprint`.
3. If it asks, code runs the tool and sends the result in **call 2** (section 4). The tool may be used **at most once** per transaction.
4. The AI returns a **proposal** (section 5). It does **not** set the final action.
5. The **policy guard** (section 6) in code decides the final level and action.

The AI proposes, code decides. The only interface is `DecisionEngine.decide(session_id, bundle) -> Decision`.

---

## 3. Input: the small first package

The AI does not query raw data. Plain code builds an **evidence bundle** first, so the AI only weighs the clues.

### Layer 1: raw transaction

The JSON from `agent_context.md` section 5, with one change: **the sender's name is stripped from `transfer_message` before the AI sees it** (privacy, and it carries no signal). `"TRAN MINH TRAC chuyen tien"` becomes `"chuyen tien"`. The sender name comes from `users.display_name`.

### Layer 2: evidence bundle (built by code)

The first package does **not** contain crowd evidence. That detail is fetched only when the AI asks for it (section 4).

```json
{
  "transaction": {
    "transaction_id": "TXN_20261125_000182",
    "amount": 45000,
    "channel": "VIETQR_P2P",
    "receiver_display_name": "NGUYEN THI HOA",
    "account_type_hint": "PERSONAL",
    "transfer_message_clean": "chuyen tien"
  },
  "time_features": { "hour": 12, "weekday": "Wednesday", "is_meal_window": true },
  "amount_features": { "vs_user_median": 0.9 },
  "name_clues": [],
  "user_context": { "top_categories_this_month": ["Food & Drink", "Shopping"] },
  "allowed_categories": [
    "Food & Drink", "Groceries & Market", "Transport", "Shopping",
    "Entertainment & Outdoor", "Bills & Utilities", "Housing & Rent",
    "Health & Education", "Personal transfer", "Other"
  ]
}
```

### Input design notes

- **`receiver_id` is in the `EvidenceBundle` model but only on the code side.** It is used by the tool and the guard, and it is not part of the text the AI reads. The id always comes from code, never from text inside the message or name (protection against prompt injection).
- **Time and amount are precomputed** (`is_meal_window`, `vs_user_median`), so the LLM does no arithmetic.
- **`allowed_categories` is passed on every call**, so the AI cannot invent labels.
- **`own_label_for_receiver` is dropped.** It was always null at this step, because a saved user label exits at the user memory handler before the AI runs.
- **`vs_receiver_typical_range` moved out of the first package.** It needs crowd data, so it now comes with the tool result.

---

## 4. The tool: `get_receiver_fingerprint`

The AI may call this tool only once per transaction. The tool takes no free-text argument: code supplies the `receiver_id` from the bundle.

Tool result (`CrowdStats`, aggregates only, never raw messages from other users):

```json
{
  "distinct_senders": 38,
  "label_distribution": { "Food & Drink": 0.71, "Shopping": 0.05, "Personal transfer": 0.24 },
  "typical_amount_range": [30000, 60000],
  "peak_hours": [11, 12, 18],
  "message_keywords": { "com": 14, "tra sua": 6, "cafe": 3 }
}
```

Rules:

- **Aggregated only.** Counts, shares and keyword frequencies. The schema has no field that can hold another user's raw message.
- **`distinct_senders` is required.** It separates "71% of 38 senders" from "71% of 3 senders".
- **No crowd data (cold start):** the tool returns nothing, treated as `distinct_senders = 0`.
- **If the first package is already enough**, the AI may answer without calling the tool.
- Every tool call is shown in the side panel ("AI asked for receiver pattern: 38 senders found") through `tool_trace`.

---

## 5. Output of the AI step: the proposal

The AI returns a category and a score. It does **not** return the final confidence level or action.

```json
{
  "transaction_id": "TXN_20261125_000182",
  "category": "Food & Drink",
  "confidence_score": 0.86,
  "reason": "38 senders paid this receiver and 71% labeled it Food & Drink. The amount and time fit a meal.",
  "clues_used": [
    { "clue": "crowd_labels", "detail": "71% Food & Drink across 38 distinct senders", "weight": "strong" },
    { "clue": "time_and_amount", "detail": "Meal window, within the receiver's typical 30k-60k range", "weight": "supporting" },
    { "clue": "message_keywords", "detail": "Other senders often mention 'com' (rice) and 'tra sua' (milk tea)", "weight": "supporting" }
  ],
  "alternatives": [
    { "category": "Personal transfer", "score": 0.10 },
    { "category": "Groceries & Market", "score": 0.02 }
  ],
  "suggested_buttons": [],
  "used_tool": true
}
```

The engine validates this against the `Decision` schema:

- The category must be one of the 10 labels, or null.
- If the output is invalid, the engine retries **once**. After that it raises `AIUnavailableError` (see section 8).
- The `Decision` model stays permissive. For example, it accepts a low score with a non-null category, and the guard corrects it. This keeps a slightly wrong answer on the guard path instead of the retry path.
- Optional fields `tool_trace` and `proposed_action` exist for open item 8.1 and stay empty unless that option needs them. `proposed_action` is only used under option 3.

---

## 6. Policy guard: code has the last word

The guard assigns the final level and action. It reads `distinct_senders` and crowd agreement **from the database**, never from the AI's answer. Reason: the AI may answer without calling the tool, but the guard still needs those numbers.

| Rule | Effect |
|---|---|
| Score 0.80 or above | Candidate for High |
| Score 0.50 to 0.79 | Medium: `SUGGESTED` |
| Score below 0.50 | Low: `UNCLASSIFIED`, category forced to `null` |
| `distinct_senders` below `MIN_SENDERS_HIGH` (15) | Cannot be High |
| Crowd agreement below `MIN_AGREEMENT_HIGH` (0.60) | Cannot be High |
| Conflicting crowd labels | Capped at Low |

All thresholds live in `config.py`. Draft values are tuned on the seed data on Day 4.

---

## 7. Final output (after the guard)

### High confidence: label silently

```json
{
  "transaction_id": "TXN_20261125_000182",
  "category": "Food & Drink",
  "confidence": "high",
  "confidence_score": 0.86,
  "action": "AUTO_LABELED",
  "reason": "38 senders paid this receiver and 71% labeled it Food & Drink. The amount and time fit a meal.",
  "clues_used": [ "...same as section 5..." ],
  "alternatives": [ "...same as section 5..." ],
  "suggested_buttons": [],
  "used_tool": true,
  "tool_trace": [
    { "tool": "get_receiver_fingerprint", "result_summary": "38 senders found" }
  ]
}
```

### Medium confidence: label as editable suggestion

Fields that change:

```json
{
  "category": "Food & Drink",
  "confidence": "medium",
  "confidence_score": 0.62,
  "action": "SUGGESTED",
  "reason": "Only 9 senders, 58% say Food & Drink. Time and amount fit a meal, but the evidence is thin.",
  "suggested_buttons": []
}
```

UI: "Looks like Food & Drink, correct me" with a one-tap edit. Stored as `AUTO_LABELED` with `is_suggested = true`.

### Low confidence: leave unclassified, ask later

Fields that change:

```json
{
  "category": null,
  "confidence": "low",
  "confidence_score": 0.31,
  "action": "UNCLASSIFIED",
  "reason": "Only 2 senders and their labels disagree. Message and name give no clue.",
  "suggested_buttons": ["Food & Drink", "Groceries & Market", "Personal transfer"]
}
```

The buttons are the top candidates, not all 10 labels, so the tap is quick. `category` is `null` because the guard forbids guessing at low confidence.

### Output field reference

| Field | Meaning |
|---|---|
| `category` | One of the 10 labels, or `null` when confidence is low |
| `confidence` | `high`, `medium` or `low`, set by the guard from the score and the crowd numbers |
| `confidence_score` | 0 to 1 number from the AI, used by the guard and shown in the demo |
| `action` | `AUTO_LABELED`, `SUGGESTED` or `UNCLASSIFIED`, set by the guard |
| `reason` | Short explanation shown to judges and, in simple form, to users |
| `clues_used` | Which evidence the AI relied on and how strongly |
| `alternatives` | Runner-up categories with scores |
| `suggested_buttons` | Top candidate labels for the tap prompt |
| `used_tool` | Whether the AI called `get_receiver_fingerprint` |
| `tool_trace` | Log of the tool call, shown in the side panel |
| `proposed_action` | Optional, empty unless open item 8.1 goes to option 3 |

`ask_user` from v1 is removed: a transaction needs a tap prompt exactly when its state is `UNCLASSIFIED`, so a separate flag only repeats that. **[Confirm]**

### State mapping

| `action` | Stored state | Notes |
|---|---|---|
| `AUTO_LABELED` | `AUTO_LABELED` | `is_suggested = false` |
| `SUGGESTED` | `AUTO_LABELED` | `is_suggested = true`, shown as editable. A user edit becomes `USER_LABELED` |
| `UNCLASSIFIED` | `UNCLASSIFIED` | Ask later, in a batch sorted by receivers with the most senders. A tap becomes `USER_LABELED` |

`SUGGESTED` is a display action, not a stored state. Storage uses the flag `is_suggested` on `LabeledTransaction`.

The old "budget check" step is **out of scope**. Labeled transactions are read by the advice flow (Flow 2) with a query. Unclassified items count under Other in the advice table, with a note.

---

## 8. When the AI is unavailable

There is **no rules-based fallback**. A guessed label is worse than a pending one.

| Situation | Result |
|---|---|
| Every provider failed, daily cap hit, or output still invalid after one retry | `AIUnavailableError`, HTTP 503, `ErrorOut` with code `AI_UNAVAILABLE`. Nothing is saved as a label. The UI shows "AI unavailable, try again" |
| `replay` mode with a custom transaction (no stored answer) | `AIRequiredError`, HTTP 503, code `AI_REQUIRED`. Nothing is saved |
| `replay` mode with one of the 4 seeded scenarios | Recorded AI answer is returned |

---

## 9. Changes from v1

| # | Change | Reason |
|---|---|---|
| 1 | `crowd_evidence` removed from the first package and moved to the tool result | Decision 2 in `Workflow_draft.md`: small first package, detail on request |
| 2 | `vs_receiver_typical_range` moved with it | It needs crowd data |
| 3 | `own_label_for_receiver` dropped | Always null at this step |
| 4 | `used_tool` and `tool_trace` added, `receiver_id` added to the bundle (code side only) | The tool needs the id. Option 2 of item 8.1 |
| 5 | AI returns a proposal. The guard sets `confidence` and `action` | "The LLM proposes, code decides" (rule 8) |
| 6 | Guard reads crowd numbers from the database, not from the AI answer | Rule 8, and the AI may skip the tool |
| 7 | Guard rules table added (min senders, min agreement, conflict cap) | Values in `config.py` |
| 8 | `SUGGESTED` stored as flag `is_suggested` on `AUTO_LABELED` | Decision 8 in `workload_plan_draft.md` |
| 9 | Budget check and the 20% alert removed | Out of scope, replaced by the advice flow |
| 10 | `ask_user` removed | Equal to `state == UNCLASSIFIED` |
| 11 | AI-unavailable behavior added, no rules fallback | Rule 16 |
| 12 | `Decision` stays permissive, and the guard forces `category = null` on Low | Rule 11 |

---

## 10. Simulated data scenarios for the demo

Seed receivers on purpose so the AI's decision is visible. These four are the acceptance tests.

- **Clear:** many senders, strong agreement. Result: `AUTO_LABELED`.
- **Weak:** few senders, mixed labels. Result: `UNCLASSIFIED`, ask the user.
- **Conflicting:** a friend's account that some users tagged as Food. Result: must not spread, capped at Low.
- **Cold start:** a brand-new receiver with no crowd data. Result: `UNCLASSIFIED`.

Include plenty of genuine Personal transfer examples.

---

## 11. Open questions

- Confirm option 2 (tool call) for item 8.1 in the Day 1 sync.
- Final values for `SCORE_HIGH`, `SCORE_MEDIUM`, `MIN_SENDERS_HIGH` and `MIN_AGREEMENT_HIGH` (draft: 0.80, 0.50, 15, 0.60), tuned on seed data.
- `PROMOTION_MIN_SENDERS` and `PROMOTION_MIN_AGREEMENT` for taps entering crowd data.
- `UNCLASSIFIED_AGING_DAYS`: N days before items move to Other.
- Confirm that `ask_user` can be dropped (section 7).
- Privacy review of the aggregated crowd evidence against MoMo policy and Vietnam's personal data protection rules.
- Real MoMo transaction format and merchant/MCC fields (the demo uses simulated data).
