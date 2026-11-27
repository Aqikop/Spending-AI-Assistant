import { useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import type { Category, LabeledTransaction } from '../types/domain';
import { TransactionRow } from './TransactionRow';

interface HistoryTabProps {
  transactions: LabeledTransaction[];
  onSelectTransaction: (tx: LabeledTransaction) => void;
  onQuickLabel: (transactionId: string, category: Category) => Promise<void>;
  savingId: string | null;
}

type FilterKey = 'ALL' | 'UNCLASSIFIED' | 'SUGGESTED' | 'AUTO_LABELED' | 'USER_LABELED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UNCLASSIFIED', label: 'Needs Review' },
  { key: 'SUGGESTED', label: 'Suggested' },
  { key: 'AUTO_LABELED', label: 'Auto' },
  { key: 'USER_LABELED', label: 'By You' },
];

export function HistoryTab({
  transactions,
  onSelectTransaction,
  onQuickLabel,
  savingId,
}: HistoryTabProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const unclassifiedItems = useMemo(
    () => transactions.filter((t) => t.state === 'UNCLASSIFIED'),
    [transactions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((item) => {
      if (filter === 'SUGGESTED') {
        if (!item.is_suggested) return false;
      } else if (filter !== 'ALL' && item.state !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        item.transaction.receiver.display_name.toLowerCase().includes(q) ||
        item.transaction.context.transfer_message.toLowerCase().includes(q) ||
        (item.category ?? 'unclassified').toLowerCase().includes(q)
      );
    });
  }, [transactions, filter, query]);

  return (
    <div className="p-4 space-y-3.5">
      {/* Search Bar */}
      <div className="bg-white rounded-full h-10 px-3.5 flex items-center gap-2 border border-[#ebecf2]">
        <Search className="size-4 text-[#797984] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search receiver, category, or note..."
          className="w-full text-[12px] text-[#24242c] placeholder:text-[#8d8d99] outline-none bg-transparent"
        />
      </div>

      {/* Review-Later Batch Card */}
      {unclassifiedItems.length > 0 && (
        <div className="rounded-2xl bg-[#fff4f8] border border-[#f8d7e6] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#98005c]">
              <Sparkles className="size-3.5" />
              <span>Review Later Batch ({unclassifiedItems.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setFilter('UNCLASSIFIED')}
              className="text-[11px] font-bold text-[#ad006c] hover:underline cursor-pointer"
            >
              Filter queue
            </button>
          </div>
          <p className="text-[11px] text-[#7a4b66]">
            Sorted by receivers with the most crowd senders so one tap helps everyone.
          </p>
        </div>
      )}

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                active
                  ? 'bg-[#ad006c] text-white'
                  : 'bg-white text-[#5d5d6b] border border-[#ececf2]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Filtered Transactions */}
      <div className="bg-white rounded-2xl px-3.5 py-2 shadow-[0_2px_10px_rgba(20,20,30,0.03)]">
        <div className="flex items-center justify-between py-2 border-b border-[#f1f1f6] text-[11px]">
          <span className="font-semibold text-[#4b5668]">November 2026</span>
          <span className="text-[#6c7c93]">{filtered.length} transactions</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[12px] text-[#7b7b87]">
            No matching transactions in this view.
          </div>
        ) : (
          <div className="divide-y divide-[#eeeef2]">
            {filtered.map((item) => (
              <TransactionRow
                key={item.transaction.transaction_id}
                item={item}
                onOpenDetail={onSelectTransaction}
                onQuickLabel={onQuickLabel}
                saving={savingId === item.transaction.transaction_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
