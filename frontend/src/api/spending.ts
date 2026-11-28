import type {
  AdviceResponse,
  Category,
  CategoryTotalOut,
  LabeledTransaction,
  PendingItemOut,
  VoucherOut,
} from '../types/domain';
import { ALLOWED_CATEGORIES, FIXED_COST_CATEGORIES } from '../constants/categories';
import { LAST_MONTH_CATEGORY_SPEND, MOCK_ADVICE_TEMPLATES } from '../mocks/advice';
import { INITIAL_MOCK_TRANSACTIONS } from '../mocks/transactions';
import { MOCK_VOUCHERS } from '../mocks/vouchers';
import { lookupMonthlyIncome } from './profile';

// Flip to false once FastAPI backend routes are live
const USE_MOCK_API = true;

let mockTransactions: LabeledTransaction[] = cloneTransactions(INITIAL_MOCK_TRANSACTIONS);
let mockUserMemory: Record<string, Category> = {
  BANK_970418_99110022: 'Housing & Rent',
  MOMO_USER_MINHANH: 'Personal transfer',
};
let adviceVariantIndex = 0;

function cloneTransactions(items: LabeledTransaction[]): LabeledTransaction[] {
  return JSON.parse(JSON.stringify(items)) as LabeledTransaction[];
}

export async function listTransactions(): Promise<LabeledTransaction[]> {
  if (!USE_MOCK_API) {
    const res = await fetch('/transactions', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load transactions');
    return res.json();
  }
  return cloneTransactions(mockTransactions);
}

export async function getTransactionDetail(
  transactionId: string,
): Promise<LabeledTransaction | null> {
  if (!USE_MOCK_API) {
    const res = await fetch(`/transactions/${encodeURIComponent(transactionId)}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return res.json();
  }
  const found = mockTransactions.find((item) => item.transaction.transaction_id === transactionId);
  return found ? (JSON.parse(JSON.stringify(found)) as LabeledTransaction) : null;
}

export async function listPending(): Promise<PendingItemOut[]> {
  if (!USE_MOCK_API) {
    const res = await fetch('/pending', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load pending items');
    return res.json();
  }

  return mockTransactions
    .filter((item) => item.state === 'UNCLASSIFIED')
    .map((item) => ({
      item: JSON.parse(JSON.stringify(item)) as LabeledTransaction,
      suggested_buttons:
        item.decision && item.decision.suggested_buttons.length > 0
          ? item.decision.suggested_buttons
          : (['Food & Drink', 'Shopping', 'Personal transfer'] as Category[]),
      receiver_sender_count: 0,
    }));
}

export async function submitUserLabel(
  transactionId: string,
  category: Category,
): Promise<LabeledTransaction[]> {
  if (!USE_MOCK_API) {
    const res = await fetch('/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ transaction_id: transactionId, category }),
    });
    if (!res.ok) throw new Error('Failed to submit label');
    return listTransactions();
  }

  const target = mockTransactions.find((t) => t.transaction.transaction_id === transactionId);
  if (target) {
    const receiverId = target.transaction.receiver.receiver_id;
    mockUserMemory[receiverId] = category;

    mockTransactions = mockTransactions.map((entry) => {
      if (entry.transaction.transaction_id === transactionId) {
        return {
          ...entry,
          state: 'USER_LABELED',
          category,
          is_suggested: false,
          source: 'user',
          ai_status: 'OK',
          decision: null,
        };
      }
      return entry;
    });
  }

  return cloneTransactions(mockTransactions);
}

export async function listVouchers(): Promise<VoucherOut[]> {
  if (!USE_MOCK_API) {
    const res = await fetch('/vouchers', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load vouchers');
    return res.json();
  }
  return MOCK_VOUCHERS;
}

export async function getSpendingAdvice(
  userId: string,
  refresh = false,
): Promise<AdviceResponse> {
  if (!USE_MOCK_API) {
    const res = await fetch('/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error('Failed to get spending advice');
    return res.json();
  }

  const monthlyIncome = await lookupMonthlyIncome(userId);
  const outgoing = mockTransactions.filter((t) => (t.transaction.direction ?? 'OUT') === 'OUT');

  const totals = new Map<Category, { spent: number; count: number; unclassified: number }>();
  for (const cat of ALLOWED_CATEGORIES) {
    totals.set(cat, { spent: 0, count: 0, unclassified: 0 });
  }

  let totalSpent = 0;
  let unclassifiedCount = 0;
  let unclassifiedSpent = 0;

  for (const item of outgoing) {
    totalSpent += item.transaction.amount;
    if (item.state === 'UNCLASSIFIED' || item.category === null) {
      unclassifiedCount += 1;
      unclassifiedSpent += item.transaction.amount;
      const otherEntry = totals.get('Other')!;
      otherEntry.spent += item.transaction.amount;
      otherEntry.count += 1;
      otherEntry.unclassified += 1;
    } else {
      const entry = totals.get(item.category)!;
      entry.spent += item.transaction.amount;
      entry.count += 1;
    }
  }

  const categories: CategoryTotalOut[] = ALLOWED_CATEGORIES.map((cat) => {
    const entry = totals.get(cat)!;
    const prev = LAST_MONTH_CATEGORY_SPEND[cat] || entry.spent || 1;
    const change = entry.spent === 0 && prev === 0 ? 0 : (entry.spent - prev) / prev;
    return {
      category: cat,
      spent: entry.spent,
      count: entry.count,
      share_of_spending: totalSpent > 0 ? entry.spent / totalSpent : 0,
      share_of_income: monthlyIncome > 0 ? entry.spent / monthlyIncome : 0,
      change_vs_last_month: Number(change.toFixed(2)),
      cuttable: !FIXED_COST_CATEGORIES.has(cat),
      unclassified_count: cat === 'Other' ? entry.unclassified : undefined,
    };
  }).sort((a, b) => b.spent - a.spent);

  if (refresh) {
    adviceVariantIndex = (adviceVariantIndex + 1) % MOCK_ADVICE_TEMPLATES.length;
  }
  const template = MOCK_ADVICE_TEMPLATES[adviceVariantIndex];
  const voucherMap = new Map(MOCK_VOUCHERS.map((v) => [v.voucher_id, v]));
  const pickedVouchers = template.voucher_picks
    .map((pick) => {
      const voucher = voucherMap.get(pick.voucher_id);
      return voucher ? { ...voucher, why: pick.why } : null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const dynamicTip =
    unclassifiedCount > 0
      ? `Confirm your ${unclassifiedCount} unclassified transfer${unclassifiedCount > 1 ? 's' : ''} so your Other bucket stays clean.`
      : 'All November transactions are categorized — your monthly shares are up to date.';

  const dynamicTips = template.management_tips.map((tip, idx) =>
    idx === 1 ? dynamicTip : tip,
  );

  return {
    status: outgoing.length < 5 ? 'not_enough_data' : 'ok',
    message:
      outgoing.length < 5
        ? 'Not enough labeled transactions yet for personalized advice.'
        : undefined,
    monthly_income: monthlyIncome,
    total_spent: totalSpent,
    unclassified_count: unclassifiedCount,
    unclassified_share: totalSpent > 0 ? Number((unclassifiedSpent / totalSpent).toFixed(2)) : 0,
    categories,
    cut_categories: template.cut_categories,
    advice: template.advice,
    management_tips: dynamicTips,
    vouchers: pickedVouchers,
  };
}

export async function resetDemoSession(): Promise<LabeledTransaction[]> {
  if (!USE_MOCK_API) {
    const res = await fetch('/reset', { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('Failed to reset session');
    return listTransactions();
  }

  mockTransactions = cloneTransactions(INITIAL_MOCK_TRANSACTIONS);
  mockUserMemory = {
    BANK_970418_99110022: 'Housing & Rent',
    MOMO_USER_MINHANH: 'Personal transfer',
  };
  adviceVariantIndex = 0;
  return cloneTransactions(mockTransactions);
}

export function getSavedUserMemoryCount(): number {
  return Object.keys(mockUserMemory).length;
}
