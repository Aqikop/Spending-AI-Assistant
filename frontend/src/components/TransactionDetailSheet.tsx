import { Check, HelpCircle, Sparkles, X } from 'lucide-react';
import {
  ALLOWED_CATEGORIES,
  CATEGORY_STYLES,
  formatTxTime,
  formatVnd,
} from '../constants/categories';
import type { Category, LabeledTransaction } from '../types/domain';

interface TransactionDetailSheetProps {
  item: LabeledTransaction | null;
  onClose: () => void;
  onSelectCategory: (transactionId: string, category: Category) => Promise<void>;
  saving: boolean;
}

export function TransactionDetailSheet({
  item,
  onClose,
  onSelectCategory,
  saving,
}: TransactionDetailSheetProps) {
  if (!item) return null;

  const { transaction, state, category, is_suggested, source } = item;
  const direction = transaction.direction ?? 'OUT';
  const isUnclassified = state === 'UNCLASSIFIED' || category === null;
  const isSuggested = Boolean(is_suggested);
  const isUserLabeled = state === 'USER_LABELED' || source === 'user';

  const statusContent = isUnclassified
    ? {
        bg: 'bg-[#fff3f8] border-[#f6cde0]',
        iconColor: 'text-[#ad006c]',
        title: "Not sure what this transaction is for",
        subtitle: 'Pick a category below so MoMo remembers it next time.',
      }
    : isSuggested
      ? {
          bg: 'bg-[#fff7e8] border-[#f5dca6]',
          iconColor: 'text-[#c26e00]',
          title: `Suggested: ${category}`,
          subtitle: 'Does this look right? Confirm or pick another category below.',
        }
      : isUserLabeled
        ? {
            bg: 'bg-[#eefaf3] border-[#c4ebd3]',
            iconColor: 'text-[#12a850]',
            title: `Category: ${category}`,
            subtitle: 'Confirmed by you.',
          }
        : {
            bg: 'bg-[#f7f8fa] border-[#ececf3]',
            iconColor: 'text-[#ad006c]',
            title: `Category: ${category}`,
            subtitle: 'Automatically categorized for your monthly tracking.',
          };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/40 backdrop-blur-[1px]">
      <div className="bg-white rounded-t-[24px] max-h-[86%] flex flex-col shadow-2xl animate-[fadeIn_0.15s_ease-out]">
        {/* Header */}
        <div className="pt-2.5 pb-3 px-4 border-b border-[#f0f0f5] flex items-center justify-between">
          <div>
            <div className="w-10 h-1 rounded-full bg-[#dcdce4] mx-auto mb-2.5 sm:hidden" />
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#ad006c]">
              Transaction Details
            </p>
            <h3 className="text-[15px] font-bold text-[#24242c] leading-snug mt-0.5">
              {transaction.receiver.display_name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="size-8 rounded-full bg-[#f5f6f8] hover:bg-[#eceef2] flex items-center justify-center text-[#595966] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto momo-scroll px-4 py-3.5 space-y-4">
          {/* Core Transaction Metadata */}
          <div className="rounded-2xl bg-[#f7f8fa] p-3.5 space-y-2">
            <div className="flex items-baseline justify-between">
              <span
                className={`text-[20px] font-extrabold ${
                  direction === 'IN' ? 'text-[#249b59]' : 'text-[#24242c]'
                }`}
              >
                {formatVnd(transaction.amount, true, direction)}
              </span>
              <span className="text-[11px] font-medium text-[#7b7b87]">
                {formatTxTime(transaction.timestamp)}
              </span>
            </div>

            <div className="space-y-1 pt-1 text-[11.5px]">
              <div>
                <span className="text-[#8a8a96]">Recipient:</span>{' '}
                <span className="font-semibold text-[#353540]">
                  {transaction.receiver.display_name}
                </span>
              </div>
              <div>
                <span className="text-[#8a8a96]">Note:</span>{' '}
                <span className="text-[#353540] italic">
                  &ldquo;{transaction.context.transfer_message}&rdquo;
                </span>
              </div>
            </div>
          </div>

          {/* Simple End-User Status Card */}
          <div
            className={`rounded-2xl border p-3.5 flex items-start gap-2.5 ${statusContent.bg}`}
          >
            {isUnclassified ? (
              <HelpCircle className={`size-4 mt-0.5 shrink-0 ${statusContent.iconColor}`} />
            ) : isUserLabeled ? (
              <Check className={`size-4 mt-0.5 shrink-0 ${statusContent.iconColor}`} />
            ) : (
              <Sparkles className={`size-4 mt-0.5 shrink-0 ${statusContent.iconColor}`} />
            )}
            <div>
              <p className="text-[12.5px] font-bold text-[#24242c]">{statusContent.title}</p>
              <p className="text-[11.5px] text-[#595966] mt-0.5 leading-snug">
                {statusContent.subtitle}
              </p>
            </div>
          </div>

          {/* 1-Tap Category Selector */}
          <div className="space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-[#24242c]">
                {isUnclassified
                  ? 'Tap to categorize'
                  : isSuggested
                    ? 'Confirm or change category'
                    : 'Change category'}
              </p>
              {saving && (
                <span className="text-[11px] font-semibold text-[#ad006c]">Saving...</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ALLOWED_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const style = CATEGORY_STYLES[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={saving}
                    onClick={() => onSelectCategory(transaction.transaction_id, cat)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left text-[11.5px] font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'border-[#ad006c] bg-[#fdecf6] text-[#ad006c]'
                        : 'border-[#ececf3] bg-white hover:border-[#d5b3c7] text-[#353540]'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected ? (
                      <Check className="size-3.5 shrink-0 text-[#ad006c]" />
                    ) : (
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: style.barColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
