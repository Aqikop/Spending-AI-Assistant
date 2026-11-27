import { AlertTriangle, Check, HelpCircle } from 'lucide-react';
import { CATEGORY_STYLES, formatTxTime, formatVnd } from '../constants/categories';
import { resolveTransactionIcon } from '../constants/figmaIcons';
import type { Category, LabeledTransaction } from '../types/domain';

interface TransactionRowProps {
  item: LabeledTransaction;
  onOpenDetail: (item: LabeledTransaction) => void;
  onQuickLabel: (transactionId: string, category: Category) => Promise<void>;
  saving: boolean;
}

export function TransactionRow({
  item,
  onOpenDetail,
  onQuickLabel,
  saving,
}: TransactionRowProps) {
  const { transaction, state, category, ai_status, decision } = item;
  const direction = transaction.direction ?? 'OUT';
  const iconInfo = resolveTransactionIcon(item);

  const renderBadge = () => {
    if (ai_status === 'PENDING_AI_UNAVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[9px] font-semibold bg-[#fff0f2] text-[#ce495b]">
          <AlertTriangle className="size-2.5" /> AI unavailable, try again
        </span>
      );
    }

    if (ai_status === 'AI_REQUIRED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[9px] font-semibold bg-[#fff5ea] text-[#d87722]">
          <AlertTriangle className="size-2.5" /> AI required
        </span>
      );
    }

    if (state === 'UNCLASSIFIED' || category === null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[9px] font-semibold bg-[#fff0f5] text-[#b4006e] border border-dashed border-[#eab4d3]">
          <HelpCircle className="size-2.5" /> Unclassified · Tap to pick
        </span>
      );
    }

    if (item.is_suggested || decision?.action === 'SUGGESTED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[9px] font-semibold bg-[#fff6e6] text-[#c26e00] border border-[#f5d59c]">
          Suggested: {category} · Edit
        </span>
      );
    }

    const style = CATEGORY_STYLES[category];
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[9px] font-medium ${style.pillBg} ${style.pillText}`}
      >
        Category: {category}
        {state === 'USER_LABELED' && <Check className="size-2.5 stroke-[2.75]" />}
      </span>
    );
  };

  return (
    <div className="py-3 transition hover:bg-[#fafafc] rounded-lg px-0.5">
      <button
        type="button"
        onClick={() => onOpenDetail(item)}
        className="w-full text-left flex items-start gap-2.5 cursor-pointer"
      >
        <div
          className={`size-[36px] rounded-[12px] ${iconInfo.tileBg} flex items-center justify-center shrink-0 mt-0.5`}
        >
          {iconInfo.type === 'grab' ? (
            <span className="text-[10px] font-semibold text-white">Grab</span>
          ) : (
            <img src={iconInfo.src} alt="" className="max-w-none shrink-0" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11.5px] font-medium text-[#353540] leading-[1.35] line-clamp-2">
              {transaction.receiver.display_name}
            </p>
            <span
              className={`text-[12.5px] font-semibold whitespace-nowrap shrink-0 ${
                direction === 'IN' ? 'text-[#249b59]' : 'text-[#303039]'
              }`}
            >
              {formatVnd(transaction.amount, true, direction)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[9.5px] text-[#7b7b87] whitespace-nowrap">
              {formatTxTime(transaction.timestamp)}
            </span>
            {renderBadge()}
          </div>
        </div>
      </button>

      {/* Inline 1-tap candidate chips for UNCLASSIFIED items */}
      {state === 'UNCLASSIFIED' &&
        decision &&
        decision.suggested_buttons.length > 0 && (
          <div className="mt-2 pl-[46px] flex flex-wrap gap-1.5">
            {decision.suggested_buttons.map((candidate) => (
            <button
              key={candidate}
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation();
                void onQuickLabel(transaction.transaction_id, candidate);
              }}
              className="px-2.5 py-1 rounded-full border border-[#ebbfd8] bg-[#fff7fb] hover:bg-[#fdecf6] text-[10px] font-semibold text-[#9e005f] transition cursor-pointer disabled:opacity-50"
            >
              {candidate}
            </button>
          ))}
          </div>
        )}
    </div>
  );
}
