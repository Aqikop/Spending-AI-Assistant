import { useEffect, useRef, type ReactNode } from 'react';
import { FIGMA_ICONS } from '../constants/figmaIcons';
import type { AppTab } from '../types/domain';

interface HomePageLayoutProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  pendingCount: number;
  statusHeaderBg?: string;
  children: ReactNode;
  overlay?: ReactNode;
  toast?: string | null;
}

const NAV_ITEMS: { key: AppTab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: FIGMA_ICONS.navHome },
  { key: 'deals', label: 'Deals', icon: FIGMA_ICONS.navDeals },
  { key: 'history', label: 'History', icon: FIGMA_ICONS.navHistory },
  { key: 'finance', label: 'Finance', icon: FIGMA_ICONS.navFinance },
  { key: 'me', label: 'Me', icon: FIGMA_ICONS.navMe },
];

export function HomePageLayout({
  activeTab,
  onChangeTab,
  pendingCount,
  statusHeaderBg = 'bg-[#ad006c]',
  children,
  overlay,
  toast,
}: HomePageLayoutProps) {
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#e9ebf0] sm:p-6">
      <div className="relative w-full max-w-[402px] h-screen sm:h-[852px] bg-[#f5f6f8] sm:rounded-[38px] shadow-[0_24px_60px_rgba(20,20,38,0.18)] overflow-hidden flex flex-col border border-black/5">
        {/* Status Bar matching Figma 2:3 */}
        <div
          className={`${statusHeaderBg} shrink-0 h-[36px] px-6 flex items-center justify-between text-white select-none`}
        >
          <span className="text-[14px] font-semibold tracking-tight">9:41</span>
          <div className="flex items-center gap-1.5">
            <img src={FIGMA_ICONS.signal} alt="" className="max-w-none shrink-0" />
            <img src={FIGMA_ICONS.wifi} alt="" className="max-w-none shrink-0" />
            <img src={FIGMA_ICONS.battery} alt="" className="max-w-none shrink-0" />
          </div>
        </div>

        {/* Scrollable Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-[#f5f6f8]"
        >
          {children}
        </main>

        {/* Floating Toast */}
        {toast && (
          <div className="pointer-events-none absolute bottom-[96px] left-4 right-4 z-30 flex justify-center">
            <div className="rounded-full bg-[#24242c]/92 text-white px-4 py-2 text-[11.5px] font-medium shadow-lg">
              {toast}
            </div>
          </div>
        )}

        {/* Bottom Navigation matching Figma 2:9 */}
        <nav className="relative shrink-0 h-[82px] bg-white border-t border-[#ececf1] flex flex-col justify-between pt-2.5 pb-2">
          <div className="grid grid-cols-5 items-start">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              const showBadge = item.key === 'history' && pendingCount > 0;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChangeTab(item.key)}
                  className="relative flex flex-col items-center justify-center pt-1 cursor-pointer group"
                >
                  {isActive && (
                    <span className="absolute -top-2.5 w-[28px] h-[3px] rounded-full bg-[#af006d]" />
                  )}
                  <div className="relative size-[24px] flex items-center justify-center">
                    <img
                      src={item.icon}
                      alt=""
                      className={`max-w-none shrink-0 transition ${
                        isActive
                          ? 'opacity-100 scale-105'
                          : item.key === 'home'
                            ? 'grayscale opacity-60 group-hover:opacity-90'
                            : 'opacity-70 group-hover:opacity-100'
                      }`}
                    />
                    {showBadge && (
                      <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-[#e6176d] text-white text-[9px] font-bold flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-1 text-[10px] whitespace-nowrap ${
                      isActive
                        ? 'font-semibold text-[#af006d]'
                        : 'font-medium text-[#92929f] group-hover:text-[#5c5c69]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-auto w-[136px] h-[5px] rounded-full bg-[#202028]" />
        </nav>

        {/* Bottom Sheet / Modal Overlay */}
        {overlay}
      </div>
    </div>
  );
}
