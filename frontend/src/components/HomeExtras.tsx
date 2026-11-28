import { FIGMA_ICONS } from '../constants/figmaIcons';
import type { VoucherPick } from '../types/domain';

interface HomeExtrasProps {
  onOpenFinance: () => void;
  onOpenDeals: () => void;
  onNotify: (msg: string) => void;
  recommendedVouchers: VoucherPick[];
}

export function HomeExtras({
  onOpenFinance,
  onOpenDeals,
  onNotify,
  recommendedVouchers,
}: HomeExtrasProps) {
  const firstOffer = recommendedVouchers[0];
  const secondOffer = recommendedVouchers[1];

  return (
    <div className="space-y-4 pb-5">
      {/* MoMo Picks matching Figma 7:5 */}
      <div className="bg-white rounded-[16px] p-3.5 shadow-[0_1px_6px_rgba(20,20,30,0.03)]">
        <h2 className="text-[15px] font-bold text-[#272732] mb-2.5">MoMo Picks</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenFinance}
            className="text-left bg-[#f7f0fb] hover:bg-[#f1e5f8] rounded-[12px] p-3 transition cursor-pointer flex flex-col justify-between min-h-[82px]"
          >
            <div className="flex items-start gap-2.5">
              <img
                src={FIGMA_ICONS.pickSpending}
                alt=""
                className="max-w-none shrink-0 mt-0.5"
              />
              <span className="text-[12px] font-semibold text-[#74205f] leading-[1.2]">
                Manage Spending
              </span>
            </div>
            <span className="text-[9.5px] font-medium text-[#95407f] mt-2">
              Understand your money →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNotify('Group Fund is coming soon in Phase 2.')}
            className="text-left bg-[#eef6ff] hover:bg-[#e3effd] rounded-[12px] p-3 transition cursor-pointer flex flex-col justify-between min-h-[82px]"
          >
            <div className="flex items-center gap-2.5">
              <img src={FIGMA_ICONS.pickGroupFund} alt="" className="max-w-none shrink-0" />
              <span className="text-[12px] font-semibold text-[#285f91] leading-[1.2]">
                Group Fund
              </span>
            </div>
            <span className="text-[9.5px] font-medium text-[#47789e] mt-2">
              Save together, enjoy →
            </span>
          </button>
        </div>
      </div>

      {/* Featured Offer Banner matching Figma 2:7 */}
      <div className="relative bg-[#fce8f4] rounded-[16px] min-h-[132px] p-4 overflow-hidden flex items-center justify-between gap-2">
        <div className="relative z-10 max-w-[186px]">
          <p className="text-[9px] font-bold text-[#a40066] tracking-wide">
            EVERY DAY A NEW JOY
          </p>
          <p className="mt-1 text-[16.5px] font-bold text-[#8d0057] leading-[1.25]">
            Tap MoMo,
            <br />
            unlock great deals
          </p>

          <button
            type="button"
            onClick={onOpenDeals}
            className="mt-2.5 inline-flex items-center justify-center bg-[#af006d] hover:bg-[#93005b] rounded-[13px] h-[25px] px-3 text-[9px] font-semibold text-white cursor-pointer transition"
          >
            Explore now
          </button>
        </div>

        <div className="relative shrink-0 w-[134px] h-[96px] flex items-center justify-end pr-1">
          <div className="rotate-6 bg-white rounded-[12px] w-[118px] h-[82px] px-2.5 py-2 shadow-sm">
            <p className="text-[7.5px] font-bold text-[#8d0057]">CASHBACK UP TO</p>
            <p className="text-[28px] font-extrabold text-[#b00070] leading-none mt-0.5">50%</p>
            <div className="h-px bg-[#f4c9e1] my-1.5" />
            <p className="text-[6.5px] text-[#a5678b] pl-4">More joy per payment</p>
          </div>

          <div className="absolute left-0 bottom-0 size-[34px] rounded-full bg-[#ffd869] flex items-center justify-center shadow-sm">
            <span className="text-[19px] font-extrabold text-[#a85a00]">đ</span>
          </div>
        </div>
      </div>

      {/* Offers for You matching Figma 2:8 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#262630]">Offers for You</h2>
          <button
            type="button"
            onClick={onOpenDeals}
            className="text-[10px] font-semibold text-[#ac006c] hover:underline cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenDeals}
            className="text-left bg-white rounded-[13px] overflow-hidden shadow-[0_1px_6px_rgba(20,20,30,0.03)] cursor-pointer hover:shadow-md transition"
          >
            <div className="bg-[#eaf5ff] rounded-[13px] p-3">
              <p className="text-[8px] font-bold text-[#3774aa]">
                {firstOffer?.tag ?? 'MOBILE TOP-UP'}
              </p>
              <p className="text-[16px] font-bold text-[#165997] mt-1 leading-tight">
                {firstOffer?.headline ?? 'Up to 5% Off'}
              </p>
              <p className="text-[8px] text-[#527795] mt-1">
                {firstOffer?.subline ?? 'Faster, smarter savings'}
              </p>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-semibold text-[#343440] truncate">
                {firstOffer?.title ?? 'One-tap top-up & data'}
              </p>
              <p className="text-[9px] text-[#7b7b87] truncate mt-0.5">
                {firstOffer?.subtitle ?? 'Applies to major carriers'}
              </p>
              <p className="text-[9px] font-semibold text-[#af006d] mt-1.5">
                {firstOffer?.cta_label ?? 'Claim now'} →
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenDeals}
            className="text-left bg-white rounded-[13px] overflow-hidden shadow-[0_1px_6px_rgba(20,20,30,0.03)] cursor-pointer hover:shadow-md transition"
          >
            <div className="bg-[#f4ecff] rounded-[13px] p-3">
              <p className="text-[8px] font-bold text-[#7955a4]">
                {secondOffer?.tag ?? 'WEEKEND DATE'}
              </p>
              <p className="text-[16px] font-bold text-[#653b8f] mt-1 leading-tight">
                {secondOffer?.headline ?? 'Movies from 79K'}
              </p>
              <p className="text-[8px] text-[#84659e] mt-1">
                {secondOffer?.subline ?? 'Top cinemas, great seats'}
              </p>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-semibold text-[#343440] truncate">
                {secondOffer?.title ?? 'Great films waiting for you'}
              </p>
              <p className="text-[9px] text-[#7b7b87] truncate mt-0.5">
                {secondOffer?.subtitle ?? 'Book tickets & pick seats'}
              </p>
              <p className="text-[9px] font-semibold text-[#af006d] mt-1.5">
                {secondOffer?.cta_label ?? 'Book now'} →
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
