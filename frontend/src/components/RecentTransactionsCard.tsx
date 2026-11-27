import { Sparkles } from 'lucide-react';
import type { Category, LabeledTransaction } from '../types/domain';
import { TransactionRow } from './TransactionRow';

interface RecentTransactionsCardProps {
  transactions: LabeledTransaction[];
  pendingCount: number;
  onSelectTransaction: (item: LabeledTransaction) => void;
  onQuickLabel: (transactionId: string, category: Category) => Promise<void>;
  onOpenHistory: () => void;
  savingId: string | null;
}

export function RecentTransactionsCard({
  transactions,
  pendingCount,
  onSelectTransaction,
  onQuickLabel,
  onOpenHistory,
  savingId,
}: RecentTransactionsCardProps) {
  return (
    <div className="bg-white rounded-[16px] p-3.5 shadow-[0_1px_6px_rgba(20,20,30,0.03)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-bold text-[#272732] leading-tight">
            Recent Transactions
          </h2>
          <p className="text-[10.5px] text-[#7b7b87] mt-0.5">
            Clear spending, peace of mind every day
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fdecf6] text-[#ad006c] text-[10px] font-bold hover:bg-[#fbd9ee] transition cursor-pointer shrink-0"
          >
            <Sparkles className="size-3" />
            {pendingCount} to tap
          </button>
        )}
      </div>

      {/* Month header matching Figma 7:108 */}
      <div className="mt-3 bg-[#f0f6fd] rounded-[9px] h-[32px] px-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#4b5668]">November 2026</span>
        <span className="text-[10px] text-[#6c7c93]">
          {transactions.length} transactions
        </span>
      </div>

      {/* Scrollable transaction list matching Figma 7:111 */}
      <div className="mt-2 h-[336px] overflow-y-auto momo-scroll pr-2 divide-y divide-[#eeeef2]">
        {transactions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11.5px] text-[#898995]">
            No matching transactions
          </div>
        ) : (
          <>
            {transactions.map((item) => (
              <TransactionRow
                key={item.transaction.transaction_id}
                item={item}
                onOpenDetail={onSelectTransaction}
                onQuickLabel={onQuickLabel}
                saving={savingId === item.transaction.transaction_id}
              />
            ))}
            <p className="py-3 text-center text-[9.5px] text-[#898995]">
              You have viewed all November transactions
            </p>
          </>
        )}
      </div>

      <p className="mt-2 text-center text-[9.5px] text-[#8a7282]">
        Swipe inside list to see more ↓
      </p>
    </div>
  );
}
