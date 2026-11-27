import { BrainCircuit, LogOut, RotateCcw, ShieldCheck, User } from 'lucide-react';
import { formatVnd } from '../constants/categories';
import type { UserProfile } from '../types/domain';

interface MeTabProps {
  user: UserProfile;
  userMemoryCount: number;
  autoLabeledCount: number;
  unclassifiedCount: number;
  onResetSession: () => Promise<void>;
  onSignOut: () => Promise<void>;
  resetting: boolean;
}

export function MeTab({
  user,
  userMemoryCount,
  autoLabeledCount,
  unclassifiedCount,
  onResetSession,
  onSignOut,
  resetting,
}: MeTabProps) {
  return (
    <div className="p-4 space-y-4">
      {/* User Card */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(20,20,30,0.03)] flex items-center gap-3.5">
        <div className="size-12 rounded-2xl bg-[#fdecf6] text-[#ad006c] flex items-center justify-center shrink-0">
          <User className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold text-[#24242c] truncate">{user.display_name}</h2>
          <p className="text-[11.5px] text-[#7b7b87]">
            +84 {user.phone_number.replace(/^0/, '')} · {user.user_id}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#edf9f0] text-[#12a850] text-[10px] font-bold">
          Active
        </span>
      </div>

      {/* AI Assistant Stats */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(20,20,30,0.03)] space-y-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-[#ad006c]" />
          <h3 className="text-[14px] font-bold text-[#272732]">Smart Spending Status</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#f7f8fa] p-2.5">
            <p className="text-[16px] font-extrabold text-[#24242c]">{autoLabeledCount}</p>
            <p className="text-[10px] text-[#7b7b87] mt-0.5">Auto-labeled</p>
          </div>
          <div className="rounded-xl bg-[#f7f8fa] p-2.5">
            <p className="text-[16px] font-extrabold text-[#ad006c]">{userMemoryCount}</p>
            <p className="text-[10px] text-[#7b7b87] mt-0.5">Saved Memory</p>
          </div>
          <div className="rounded-xl bg-[#f7f8fa] p-2.5">
            <p className="text-[16px] font-extrabold text-[#ce495b]">{unclassifiedCount}</p>
            <p className="text-[10px] text-[#7b7b87] mt-0.5">Needs Review</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#f7f8fa] px-3 py-2.5 flex items-center justify-between text-[11.5px]">
          <span className="text-[#6b6b78]">Wallet balance</span>
          <span className="font-bold text-[#24242c]">{formatVnd(user.wallet_balance)}</span>
        </div>

        <div className="rounded-xl bg-[#f7f8fa] px-3 py-2.5 flex items-center justify-between text-[11.5px]">
          <span className="text-[#6b6b78]">Monthly income (DB stub)</span>
          <span className="font-bold text-[#24242c]">{formatVnd(user.monthly_income)}</span>
        </div>
      </div>

      {/* Privacy & Controls */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(20,20,30,0.03)] space-y-2.5">
        <div className="flex items-start gap-2.5 text-[11.5px] text-[#595966] pb-2 border-b border-[#f0f0f5]">
          <ShieldCheck className="size-4 text-[#12a850] mt-0.5 shrink-0" />
          <p>
            Other users&apos; transfer notes are never displayed. AI only inspects anonymized
            receiver crowd aggregates and strips your sender name first.
          </p>
        </div>

        <button
          type="button"
          disabled={resetting}
          onClick={() => void onResetSession()}
          className="w-full h-10 rounded-xl border border-[#e6e7ee] hover:bg-[#f7f8fa] text-[#30303b] text-[12.5px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
        >
          <RotateCcw className={`size-3.5 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetting demo...' : 'Reset Demo Session Data'}
        </button>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="w-full h-10 rounded-xl bg-[#fff0f5] hover:bg-[#fde3ed] text-[#ad006c] text-[12.5px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="size-3.5" />
          Sign Out to Login Screen
        </button>
      </div>
    </div>
  );
}
