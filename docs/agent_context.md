# MoMo Auto Spending Categorization Agent: Context Handoff

> Paste this whole file into a new chat as context, then continue with one of the "Next prompts" at the bottom.

---

## 1. Goal

Build an **AI Agent function** (not just data engineering) inside the MoMo app (Vietnam) that **automatically assigns each transaction to a spending category** (Food & Drink, Film/Outdoor, Shopping, Clothing, Personal transfer, ...), so users can track budgets without tagging every payment by hand.

## 2. Problem

- Users want to set spending limits per category.
- Today they must manually tag each transaction or type what they spent. It is slow, easy to forget, and people skip it when in a hurry.

## 3. Core idea (simple version)

**Easy transactions** (have `merchant_id` or `mcc`): just look up the category in a table. No AI needed.

**Hard transactions** (personal QR, street vendors, friends; no merchant info): gather clues, then let the AI Agent decide.

Clues for hard transactions:
- The transfer message (often just the sender's name plus "chuyen tien", so weak)
- What other users wrote or tapped for the same receiver (crowd evidence)
- Time and amount (e.g. 45,000đ at 12:14 on a weekday leans toward a meal)
- This user's own past labels

Agent decision:
- **Clues are clear** -> label automatically.
- **Clues are weak** -> do not guess. Show tap buttons (`[Food] [Film] [Personal]`) and remember what the user taps.

## 4. Transaction groups

| Group | Type | Has merchant info? | How to categorize |
|---|---|---|---|
| 1 | MoMo merchant | `merchant_id` present | Look up in MoMo merchant table |
| 2 | VietQR merchant | `mcc` present | Look up in MCC table |
| 3 | VietQR P2P / personal | both null | **The hard case. The AI Agent works here.** |

## 5. Example input (group 3)

```json
{
  "transaction_id": "TXN_20261125_000182",
  "timestamp": "2026-11-25T12:14:30+07:00",
  "amount": 45000,
  "channel": "VIETQR_P2P",
  "sender": { "user_id": "USER_001" },
  "receiver": {
    "receiver_id": "BANK_970436_0123456789",
    "display_name": "NGUYEN THI HOA",
    "merchant_id": null,
    "mcc": null,
    "account_type_hint": "PERSONAL"
  },
  "context": {
    "transfer_message": "TRAN MINH TRAC chuyen tien",
    "city": "Ho Chi Minh"
  }
}
```

Note: the message is only the sender's name plus a default phrase, and the receiver's name says nothing about a business. Only time and amount give a weak hint, so crowd evidence about this receiver is the main hope.

## 6. Workflow (state machine)

```
New transaction (JSON)
      |
      v
Has merchant_id or mcc?
  |-- YES --> Look up merchant/MCC table --> AUTO_LABELED
  |
  '-- NO
        |
        v
  User labeled this receiver before?
    |-- YES --> Use saved label from user memory --> AUTO_LABELED
    |
    '-- NO
          |
          v
    Gather clues: message, crowd labels, time, amount
          |
          v
    AI Agent: confident?
      |-- YES --> AUTO_LABELED
      |
      '-- NO --> UNCLASSIFIED (show tap buttons)
                      |
                      v
                User taps a category
                      |
                      v
                Save to user memory + crowd data
                      |
                      v
                 USER_LABELED

AUTO_LABELED or USER_LABELED
      |
      v
Budget left under 20%?
  |-- YES --> Send alert (+ voucher suggestion) --> Done
  '-- NO  --> Done
```

**The only AI step is "AI Agent: confident?".** Everything else is lookup or if/else.

States: `AUTO_LABELED`, `USER_LABELED`, `UNCLASSIFIED`.

## 7. Key design decisions so far

1. **LLM vs Agent:** an LLM reads/writes text. An Agent is a system around an LLM that decides steps and calls tools. The full pipeline is mostly fixed logic. The agent part is the decision step: combine weak clues, estimate confidence, decide whether to label silently or ask the user.
2. **Government business registry is NOT the main source.** Bank account numbers do not link cleanly to business registrations, registered business lines are broad, and many small receivers are not registered. Use MoMo merchant data and QR MCC instead.
3. **Learning from taps = remembering a decision**, not identifying the merchant. A tap on a receiver is saved for that user, and if many users agree on the same receiver, it can become an automatic label for everyone.
4. **Taps must never be required.** Users are often in a hurry, so unclassified items can be asked later (batched), prioritized by receivers with the most senders.
5. **Confidence levels:** high = label silently; medium = label but show as an editable suggestion; low = leave unclassified and ask later.
6. **The "<20% budget left" alert is simple rule logic**, not AI. The voucher recommendation is a natural later extension.

## 8. Optional ideas parked for later (not part of the core)

- **Behavior fingerprint:** compare an unknown receiver's pattern (number of senders, typical amounts, hours) to known merchants, and borrow the closest label. Also helps decide "shop vs. person".
- **Name clues:** "HKD", "CUA HANG", "QUAN" in the display name.
- **Location (opt-in):** match phone location to nearby places.
- **Ask the receiver:** if a personal account receives many small payments from many senders, prompt the owner to register as a business (converts group 3 into group 1).
- **Web/map search** for the receiver's name (works for names like "Bun bo Co Hoa", rarely for personal names).
- **Natural-language entry:** user types "hôm qua ăn trưa 45k" and the agent matches it to a transaction.
- A separate bucket **"Chuyển tiền cá nhân"** for genuine person-to-person transfers.

## 9. Known gaps and risks

- **Never-tapped transactions** stay UNCLASSIFIED and never reach the budget check, so totals are too low. Possible rule: after N days, count them under "Other".
- **Privacy:** other users' transfer messages should only be used as aggregated evidence, never shown, and they often contain names. Needs review against MoMo data policy and Vietnam's personal data protection rules.
- **Wrong crowd labels:** one user tagging a friend's account as Food & Drink should not spread. Require many senders and agreement.
- **Coverage:** popular receivers get labeled fast, rare ones stay unclassified.
- Many P2P transfers will stay genuinely uncertain. Being open about uncertainty ("looks like Food & Drink, correct me") beats pretending to always know.

## 10. Open questions

- What is the real input format of a transaction (is the JSON above realistic)?
- What merchant/MCC fields does MoMo actually hold, and how clean are they?
- How is the confidence threshold decided, and what counts as "enough" crowd evidence (how many senders, what agreement level)?
- What are the final spending categories?
- What happens to unclassified transactions after some days?

## 11. Next prompts (pick one)

1. "Design the exact input and output JSON for the AI Agent's 'confident?' step."
2. "Explain how the Agent should decide confidence from message, crowd labels, time, and amount, with simple rules and examples."
3. "Write a prompt for the LLM that reads crowd messages about one receiver and returns a category plus confidence."
4. "What should be built first for an MVP, and what can wait?"
5. "How should the crowd-label aggregation and privacy rules work?"
