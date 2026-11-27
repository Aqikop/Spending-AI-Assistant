import { ArrowDownRight, ArrowUpRight, Lock, RefreshCw, Sparkles, Tag } from 'lucide-react';
import { CATEGORY_STYLES, formatVnd } from '../constants/categories';
import type { AdviceResponse, VoucherPick } from '../types/domain';

interface FinanceTabProps {
  adviceData: AdviceResponse | null;
  loading: boolean;
  onRefreshAdvice: () => Promise<void>;
  onOpenDeals: () => void;
  claimedVouchers: Set<string>;
  onToggleClaimVoucher: (voucherId: string) => void;
}

export function FinanceTab({
  adviceData,
  loading,
  onRefreshAdvice,
  onOpenDeals,
  claimedVouchers,
  onToggleClaimVoucher,
}: FinanceTabProps) {
  if (!adviceData) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-24 rounded-2xl bg-white animate-pulse" />
        <div className="h-64 rounded-2xl bg-white animate-pulse" />
        <div className="h-40 rounded-2xl bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Monthly Overview Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#ad006c] to-[#d0137f] p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-white/80">November 2026 Spending</p>
            <p className="text-[24px] font-extrabold tracking-tight mt-0.5">
              {formatVnd(adviceData.total_spent)}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/15 text-[10.5px] font-semibold">
            {Math.round(
              adviceData.monthly_income > 0
                ? (adviceData.total_spent / adviceData.monthly_income) * 100
                : 0,
            )}
            % of income
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] text-white/90">
          <span>Monthly income (DB): {formatVnd(adviceData.monthly_income)}</span>
          {adviceData.unclassified_count > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#ffd465] text-[#5e3800] font-bold text-[10px]">
              {adviceData.unclassified_count} unclassified
            </span>
          )}
        </div>
      </div>

      {/* Spend-by-Category Table (Workflow_draft Flow 2, Step 2) */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(20,20,30,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#272732]">Spend by Category</h2>
            <p className="text-[10.5px] text-[#7b7b87]">
              Fixed costs are protected from AI cut advice
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {adviceData.categories
            .filter((row) => row.spent > 0 || row.category === 'Other')
            .map((row) => {
              const style = CATEGORY_STYLES[row.category];
              const spendPct = Math.round(row.share_of_spending * 100);
              const incomePct = Math.round(row.share_of_income * 100);
              const deltaPct = Math.round(row.change_vs_last_month * 100);

              return (
                <div key={row.category} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: style.barColor }}
                      />
                      <span className="text-[12px] font-semibold text-[#30303b] truncate">
                        {row.category}
                      </span>
                      {!row.cuttable && (
                        <span
                          title="Fixed cost (not cuttable)"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#f2f3f7] text-[#6b6b78] text-[9px] font-semibold shrink-0"
                        >
                          <Lock className="size-2.5" /> Fixed
                        </span>
                      )}
                      {row.category === 'Other' &&
                        (row.unclassified_count ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#fff0f2] text-[#ce495b] text-[9px] font-semibold shrink-0">
                            {row.unclassified_count} unclassified
                          </span>
                        )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[12.5px] font-bold text-[#24242c]">
                        {formatVnd(row.spent)}
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-[#f1f2f6] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(spendPct, 3)}%`,
                        backgroundColor: style.barColor,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#7b7b87]">
                    <span>
                      {spendPct}% of spend · {incomePct}% of income ({row.count} txns)
                    </span>
                    <span
                      className={`inline-flex items-center font-semibold ${
                        deltaPct > 5
                          ? 'text-[#ce495b]'
                          : deltaPct < 0
                            ? 'text-[#12a850]'
                            : 'text-[#7b7b87]'
                      }`}
                    >
                      {deltaPct > 0 ? (
                        <ArrowUpRight className="size-3" />
                      ) : deltaPct < 0 ? (
                        <ArrowDownRight className="size-3" />
                      ) : null}
                      {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`} vs last mo
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* AI Spending Advice Block */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(20,20,30,0.03)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-xl bg-[#fdecf6] text-[#ad006c] flex items-center justify-center">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-[14.5px] font-bold text-[#272732]">AI Spending Advice</h2>
              <p className="text-[10px] text-[#7b7b87]">Validated against your real totals</p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void onRefreshAdvice()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ad006c] hover:bg-[#93005b] text-white text-[11px] font-semibold transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Thinking...' : 'Get Advice'}
          </button>
        </div>

        {adviceData.status === 'not_enough_data' ? (
          <div className="rounded-xl bg-[#f7f8fa] p-3 text-[12px] text-[#5c5c69]">
            {adviceData.message ?? 'Not enough data yet to generate spending advice.'}
          </div>
        ) : (
          <>
            {adviceData.cut_categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] font-semibold text-[#7b7b87]">Focus to trim:</span>
                {adviceData.cut_categories.map((cat) => (
                  <span
                    key={cat}
                    className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${CATEGORY_STYLES[cat].pillBg} ${CATEGORY_STYLES[cat].pillText}`}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <p className="text-[12.5px] text-[#30303b] leading-relaxed bg-[#fcf7fa] border border-[#f8dfee] rounded-xl p-3">
              {adviceData.advice}
            </p>

            {adviceData.management_tips.length > 0 && (
              <ul className="space-y-1.5">
                {adviceData.management_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11.5px] text-[#454552]">
                    <span className="mt-1 size-1.5 rounded-full bg-[#ad006c] shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Suggested Vouchers (Flow 2, validated 2-3 picks) */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(20,20,30,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tag className="size-4 text-[#ad006c]" />
            <h2 className="text-[14.5px] font-bold text-[#272732]">Suggested Vouchers</h2>
          </div>
          <button
            type="button"
            onClick={onOpenDeals}
            className="text-[11px] font-semibold text-[#ad006c] hover:underline cursor-pointer"
          >
            View all deals
          </button>
        </div>

        <div className="space-y-2.5">
          {adviceData.vouchers.map((voucher: VoucherPick) => {
            const isClaimed = claimedVouchers.has(voucher.voucher_id);
            return (
              <div
                key={voucher.voucher_id}
                className="rounded-xl border border-[#ececf3] p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="inline-block text-[9.5px] font-bold uppercase tracking-wide text-[#ad006c] bg-[#fdecf6] px-2 py-0.5 rounded">
                    {voucher.category}
                  </span>
                  <p className="mt-1 text-[13px] font-bold text-[#24242c]">
                    {voucher.headline} · {voucher.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6d6d7a] leading-snug">{voucher.why}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleClaimVoucher(voucher.voucher_id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    isClaimed
                      ? 'bg-[#edf9f0] text-[#12a850]'
                      : 'bg-[#ad006c] text-white hover:bg-[#93005b]'
                  }`}
                >
                  {isClaimed ? 'Saved' : 'Save'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
