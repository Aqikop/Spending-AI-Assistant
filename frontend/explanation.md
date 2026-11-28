# Frontend Codebase Study Notes (Checkpoint 1)

> Checkpoint covering `src/` folders (`types`, `constants`, `mocks`, `api`, `assets`, `components`) and how **Flow 1** works on the client side.
> *(Checkpoint 2 will cover `App.tsx`, `main.tsx`, `index.css`, `vite-env.d.ts`, `package.json`, `vite.config.ts`, and `tsconfig.*.json`.)*

---

## 1. File Extensions: `.ts` vs `.tsx`

| Extension | Meaning | Analogy |
| :--- | :--- | :--- |
| **`.ts`** (TypeScript) | Pure logic, data, API calls, or type definitions (**no HTML/UI tags** inside). | Standard `.py` helper/model modules |
| **`.tsx`** (TypeScript + JSX) | React UI components that return HTML-like markup (`<div>`, `<button>`, etc.). | UI view templates + view logic |

---

## 2. Folder Breakdown (`frontend/src/`)

### `src/types/` — Data Blueprints (`domain.ts`)
* **File:** `src/types/domain.ts` (similar to `app/domain/models.py` in Python).
* **Role:** Defines the exact TypeScript data shapes (`Category`, `LabelState`, `ConfidenceLevel`, `LabeledTransaction`, `Decision`, `AuthSession`, `UserProfile`, etc.).
* **Why it matters:** Catches typos and invalid field names before the browser even runs.
* **Key points to remember:**
  * **`LabelState`** (`AUTO_LABELED`, `UNCLASSIFIED`, `USER_LABELED`): Final state assigned by the backend **Policy Guard** (`app/pipeline/guard.py`) or user tap—when AI has medium confidence (`0.50–0.79`), the row keeps `state: "AUTO_LABELED"` with `is_suggested: true` so the UI renders an editable suggestion badge instead of a 4th stored state.
  * **`Decision` & End-User Simplicity:** `decision` is `null` unless `source === "AI"`, and the consumer UI omits developer-only AI debug fields (tool traces, confidence scores, and internal reasoning) so end users only see clean category status and choices.

### `src/constants/` — Fixed Rules, Styles & Asset Maps
* **`src/constants/categories.ts`:**
  * Lists the 10 `ALLOWED_CATEGORIES` and `FIXED_COST_CATEGORIES` (`Housing & Rent`, `Bills & Utilities`, `Health & Education`).
  * Defines `CATEGORY_STYLES` (exact pastel pill and bar colors per category).
  * Provides display helpers `formatVnd()` and `formatTxTime()`.
* **`src/constants/figmaIcons.ts`:**
  * Imports all 44 `.svg` assets from `src/assets/figma/`.
  * Maps the 12 `MOMO_SERVICES` tiles, `FIGMA_ICONS` (status bar, quick actions, wallet, bottom nav), and `resolveTransactionIcon()` (chooses each transaction row's icon).

### `src/assets/figma/` — Static Vector Icons
* Holds the **44 `.svg` icons** exported from Figma (sharp at any scale).
* Works together with `src/constants/figmaIcons.ts`, which bundles and exports them for UI components.

### `src/mocks/` — Simulated Sample Data (Temporary)
* Provides realistic sample data while the FastAPI backend and SQLite DB are still being built:
  * `transactionBuilder.ts` — helper (`toLabeled`) to build mock transactions cleanly without developer debug objects.
  * `scenarioFixtures.ts`, `midNovemberFixtures.ts`, `earlyNovemberFixtures.ts` → combined in `transactions.ts` as `INITIAL_MOCK_TRANSACTIONS` (33 November 2026 transactions).
  * `vouchers.ts` & `advice.ts` — mock vouchers and Flow 2 advice templates.

### `src/api/` — Client-to-Server Bridge
* **Server side (`app/` in Python):** Owns SQLite, secret API keys, AI Agent loop, Policy Guard, and all business logic.
* **Client side (`frontend/` in the browser):** Renders UI and sends user actions.
* **`src/api/` (`auth.ts`, `profile.ts`, `spending.ts`):** Acts as the **messenger** between client and server:
  * Sends HTTP requests (`fetch(...)`) to FastAPI routes (e.g., `POST /auth/login`, `GET /transactions`, `POST /labels`) and receives JSON back.
  * When connected to the real backend (`USE_MOCK_API = false`), `src/api/` does **no business logic**—it only passes server responses to `App.tsx`.
  * Currently:
    * `auth.ts` has the real `POST /auth/login` DB check written and **commented out** so Sign In enters the demo account right away.
    * `profile.ts` has `lookupMonthlyIncome` / `maintainMonthlyIncome` (`/profile`) written and **commented out**.
    * `spending.ts` returns simulated responses from `mocks/` while `USE_MOCK_API = true`.

### `src/components/` — Visual Screens & UI Building Blocks (`.tsx`)
* **React `Props` (e.g. `HomeHeaderAndServicesProps`):** Think of a React component as a function, and its `*Props` interface as its typed input arguments passed down from `App.tsx`.
* **Key Flow 1 components:**
  * **`LoginScreen.tsx`:** MoMo Login card (`+84` phone, password toggle, `Sign In` calling `auth.ts`).
  * **`HomePageLayout.tsx`:** The shared outer mobile frame shown after login—renders the `9:41` status bar, scrollable main viewport (resets scroll on tab switch), floating toast pill, 5-tab bottom navigation (`Home`, `Deals`, `History`, `Finance`, `Me`), and modal overlay slot.
  * **`HomeHeaderAndServices.tsx`:** Magenta header, search bar, 4 quick actions, `Wallet balance` card with eye visibility toggle, and 12-tile `MoMo Services` grid.
  * **`RecentTransactionsCard.tsx`:** White container card (`Recent Transactions`, `N to tap` pill, `November 2026` banner, scrollable feed).
  * **`TransactionRow.tsx`:** Renders one transaction row from `ai_status`, `state`, and `is_suggested`:
    1. If `ai_status` is `'PENDING_AI_UNAVAILABLE'` → `AI unavailable, try again`; if `'AI_REQUIRED'` → `AI required`.
    2. Else checks `state` and `is_suggested`:
       * `'UNCLASSIFIED'` → dashed `Unclassified · Tap to pick` pill + inline 1-tap `decision.suggested_buttons` chips (when `decision` is present).
       * `'AUTO_LABELED'` with `is_suggested` (or `decision?.action === 'SUGGESTED'`) → amber `Suggested: <Category> · Edit` pill.
       * `'AUTO_LABELED'` (not suggested) → pastel `Category: <Category>` pill.
       * `'USER_LABELED'` → pastel `Category: <Category> ✓` pill.
  * **`TransactionDetailSheet.tsx`:** Mobile bottom-sheet popup showing clean transaction details (amount, timestamp, recipient, note), a friendly user status card (clearly communicating uncertainty when unclassified, showing a suggestion, or confirming the category—without exposing developer AI internals like tool traces, confidence bars, or reasoning text), and the 10-category picker.

---

## 3. Flow 1 End-to-End Summary

1. **Fetch:** `App.tsx` calls `listTransactions()` in `src/api/spending.ts` (mock now → `GET /transactions` later).
2. **Render:** `RecentTransactionsCard` passes each item to `TransactionRow`, which displays the icon, amount, and state badge (`AUTO_LABELED`, `SUGGESTED`, `UNCLASSIFIED` + inline quick-tap buttons, or `USER_LABELED`).
3. **User Tap:** Tapping an inline candidate button (or picking a category inside `TransactionDetailSheet`) calls `submitUserLabel(id, category)` in `src/api/spending.ts` (mock now → `POST /labels` later), setting `state = 'USER_LABELED'`, `source = 'user'`, and saving `receiver_id -> category` in User Memory.

---

## 4. Next Up (Checkpoint 2 — To Read Later)
* `frontend/src/App.tsx` (state & screen coordination)
* `frontend/src/main.tsx` (React mount entry point)
* `frontend/src/index.css` (Tailwind v4 + custom scroll/backdrop styles)
* `frontend/src/vite-env.d.ts` (Vite asset typing)
* `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.*.json`
