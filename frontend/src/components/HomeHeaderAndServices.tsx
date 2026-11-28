import { useState } from 'react';
import { formatVnd } from '../constants/categories';
import { FIGMA_ICONS, MOMO_SERVICES } from '../constants/figmaIcons';

interface HomeHeaderAndServicesProps {
  walletBalance: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  pendingCount: number;
  onNotify: (msg: string) => void;
  onOpenHistory: () => void;
  onOpenDeals: () => void;
}

const QUICK_ACTIONS = [
  { id: 'topup', label: 'Top Up', icon: FIGMA_ICONS.actionTopup },
  { id: 'withdraw', label: 'Withdraw', icon: FIGMA_ICONS.actionWithdraw },
  { id: 'qr', label: 'Scan QR', icon: FIGMA_ICONS.actionQr },
  { id: 'transfer', label: 'Transfer', icon: FIGMA_ICONS.actionTransfer },
];

export function HomeHeaderAndServices({
  walletBalance,
  searchQuery,
  onSearchChange,
  pendingCount,
  onNotify,
  onOpenHistory,
  onOpenDeals,
}: HomeHeaderAndServicesProps) {
  const [balanceHidden, setBalanceHidden] = useState(false);

  return (
    <>
      {/* Magenta Hero Header matching Figma 2:3 */}
      <div className="bg-[#ad006c] px-4 pt-2 pb-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-[42px] rounded-full bg-white px-3.5 flex items-center gap-2.5">
            <img src={FIGMA_ICONS.search} alt="" className="max-w-none shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search services, deals"
              className="w-full text-[12px] text-[#24242c] placeholder:text-[#797984] outline-none bg-transparent"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              pendingCount > 0
                ? onOpenHistory()
                : onNotify('All transactions are up to date.')
            }
            aria-label="Notifications"
            className="relative size-9 flex items-center justify-center cursor-pointer"
          >
            <img src={FIGMA_ICONS.notifications} alt="" className="max-w-none shrink-0" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 size-[7px] rounded-full bg-[#ffd465]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onNotify('AI Assistant: Tap any transaction below to inspect clues.')}
            aria-label="Messages"
            className="size-9 flex items-center justify-center cursor-pointer"
          >
            <img src={FIGMA_ICONS.messages} alt="" className="max-w-none shrink-0" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onNotify(`${action.label} is simulated in this demo.`)}
              className="flex flex-col items-center justify-center gap-2 py-1 hover:opacity-90 cursor-pointer"
            >
              <div className="size-[32px] flex items-center justify-center">
                <img src={action.icon} alt="" className="max-w-none shrink-0" />
              </div>
              <span className="text-[12px] font-medium text-white whitespace-nowrap">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet Balance & MoMo Services */}
      <div className="px-4 pt-4 space-y-4">
        {/* Wallet Balance Card matching Figma 2:5 */}
        <div className="bg-white rounded-[16px] h-[68px] px-3 flex items-center justify-between shadow-[0_1px_6px_rgba(20,20,30,0.03)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-[38px] rounded-[12px] bg-[#fdecf6] flex items-center justify-center shrink-0">
              <img src={FIGMA_ICONS.wallet} alt="" className="max-w-none shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#72727e]">Wallet balance</span>
                <button
                  type="button"
                  onClick={() => setBalanceHidden((prev) => !prev)}
                  aria-label="Toggle balance visibility"
                  className="p-0.5 hover:opacity-75 cursor-pointer"
                >
                  <img src={FIGMA_ICONS.eye} alt="" className="max-w-none shrink-0" />
                </button>
              </div>
              <p className="text-[18.5px] font-bold text-[#24242c] tracking-tight leading-tight mt-0.5">
                {balanceHidden ? '••••••••' : formatVnd(walletBalance)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNotify('Linked bank: Vietcombank •••• 6789')}
            className="pl-3.5 border-l border-[#eeeef2] flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80"
          >
            <div className="size-[24px] rounded-[8px] bg-[#fdecf6] flex items-center justify-center">
              <img src={FIGMA_ICONS.bank} alt="" className="max-w-none shrink-0" />
            </div>
            <div className="text-left leading-tight">
              <p className="text-[11px] text-[#72727e]">Link</p>
              <p className="text-[12px] font-semibold text-[#30303b]">bank</p>
            </div>
            <img src={FIGMA_ICONS.chevronRight} alt="" className="max-w-none shrink-0 ml-1" />
          </button>
        </div>

        {/* MoMo Services 4x3 Grid matching Figma 7:4 */}
        <div className="bg-white rounded-[16px] p-3.5 shadow-[0_1px_6px_rgba(20,20,30,0.03)]">
          <div className="flex items-baseline justify-between mb-3.5">
            <h2 className="text-[15px] font-bold text-[#272732]">MoMo Services</h2>
            <span className="text-[10px] text-[#7b7b87]">Every day, made easier</span>
          </div>

          <div className="grid grid-cols-4 gap-y-3.5 gap-x-1">
            {MOMO_SERVICES.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => {
                  if (svc.id === 'movies') {
                    onOpenDeals();
                  } else {
                    onNotify(`${svc.label} opened in demo mode.`);
                  }
                }}
                className="flex flex-col items-center text-center group cursor-pointer"
              >
                <div
                  className={`size-[32px] rounded-[10px] ${svc.tileBg} flex items-center justify-center group-hover:scale-105 transition`}
                >
                  <img src={svc.icon} alt="" className="max-w-none shrink-0" />
                </div>
                <span className="mt-1.5 text-[10.5px] font-medium text-[#3d3d48] leading-[1.2] px-0.5">
                  {svc.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
