import { Sparkles, Check } from 'lucide-react';
import type { VoucherOut, VoucherPick } from '../types/domain';

interface DealsTabProps {
  recommendedVouchers: VoucherPick[];
  allVouchers: VoucherOut[];
  claimedVouchers: Set<string>;
  onToggleClaim: (voucherId: string) => void;
}

const THEME_STYLES: Record<
  VoucherOut['theme'],
  { bg: string; tag: string; headline: string; sub: string }
> = {
  blue: {
    bg: 'bg-[#eaf5ff]',
    tag: 'text-[#3774aa]',
    headline: 'text-[#165997]',
    sub: 'text-[#527795]',
  },
  purple: {
    bg: 'bg-[#f4ecff]',
    tag: 'text-[#7955a4]',
    headline: 'text-[#653b8f]',
    sub: 'text-[#84659e]',
  },
  pink: {
    bg: 'bg-[#fce8f4]',
    tag: 'text-[#a40066]',
    headline: 'text-[#8d0057]',
    sub: 'text-[#9e477b]',
  },
  amber: {
    bg: 'bg-[#fff5ea]',
    tag: 'text-[#b85f14]',
    headline: 'text-[#9b4807]',
    sub: 'text-[#a96e3d]',
  },
};

export function DealsTab({
  recommendedVouchers,
  allVouchers,
  claimedVouchers,
  onToggleClaim,
}: DealsTabProps) {
  const recommendedIds = new Set(recommendedVouchers.map((v) => v.voucher_id));

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl bg-[#fce8f4] p-4 flex items-center justify-between">
        <div>
          <p className="text-[9.5px] font-bold tracking-wider uppercase text-[#a40066]">
            AI-MATCHED DEALS
          </p>
          <h2 className="text-[18px] font-extrabold text-[#8d0057] leading-tight mt-0.5">
            Save where you spend most
          </h2>
          <p className="text-[11px] text-[#8f4472] mt-1">
            Picked from your flexible spending categories
          </p>
        </div>
        <div className="size-12 rounded-2xl bg-[#ffd869] text-[#a85a00] font-extrabold text-[22px] flex items-center justify-center shadow-sm shrink-0">
          đ
        </div>
      </div>

      {/* AI Recommended Picks */}
      {recommendedVouchers.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <Sparkles className="size-4 text-[#ad006c]" />
            <h3 className="text-[14px] font-bold text-[#262630]">Recommended for Your Budget</h3>
          </div>
          <div className="space-y-2.5">
            {recommendedVouchers.map((voucher) => {
              const theme = THEME_STYLES[voucher.theme];
              const isClaimed = claimedVouchers.has(voucher.voucher_id);
              return (
                <div
                  key={voucher.voucher_id}
                  className="bg-white rounded-2xl overflow-hidden border border-[#f2d8e8] shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                >
                  <div className={`${theme.bg} px-3.5 py-2.5 flex items-center justify-between`}>
                    <div>
                      <p className={`text-[8.5px] font-bold uppercase ${theme.tag}`}>
                        {voucher.tag} · {voucher.category}
                      </p>
                      <p className={`text-[16px] font-extrabold ${theme.headline}`}>
                        {voucher.headline}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleClaim(voucher.voucher_id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                        isClaimed
                          ? 'bg-white text-[#12a850]'
                          : 'bg-[#af006d] text-white hover:bg-[#91005a]'
                      }`}
                    >
                      {isClaimed && <Check className="size-3" />}
                      {isClaimed ? 'Saved' : voucher.cta_label}
                    </button>
                  </div>
                  <div className="px-3.5 py-2.5">
                    <p className="text-[12px] font-semibold text-[#343440]">{voucher.title}</p>
                    <p className="text-[11px] text-[#7b7b87] mt-0.5">{voucher.why}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Voucher Catalog */}
      <div className="space-y-2.5">
        <h3 className="text-[14px] font-bold text-[#262630] px-0.5">All MoMo Vouchers</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {allVouchers
            .filter((v) => !recommendedIds.has(v.voucher_id))
            .map((voucher) => {
              const theme = THEME_STYLES[voucher.theme];
              const isClaimed = claimedVouchers.has(voucher.voucher_id);
              return (
                <div
                  key={voucher.voucher_id}
                  className="bg-white rounded-[13px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between"
                >
                  <div className={`${theme.bg} p-3 rounded-[13px]`}>
                    <p className={`text-[8px] font-bold uppercase ${theme.tag}`}>{voucher.tag}</p>
                    <p className={`text-[15px] font-extrabold mt-1 leading-tight ${theme.headline}`}>
                      {voucher.headline}
                    </p>
                    <p className={`text-[9px] mt-1 ${theme.sub}`}>{voucher.subline}</p>
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-[10.5px] font-semibold text-[#343440] leading-snug">
                      {voucher.title}
                    </p>
                    <p className="text-[9.5px] text-[#7b7b87]">{voucher.subtitle}</p>
                    <button
                      type="button"
                      onClick={() => onToggleClaim(voucher.voucher_id)}
                      className={`pt-1 text-[10px] font-bold cursor-pointer ${
                        isClaimed ? 'text-[#12a850]' : 'text-[#af006d] hover:underline'
                      }`}
                    >
                      {isClaimed ? '✓ Saved to wallet' : `${voucher.cta_label} →`}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
