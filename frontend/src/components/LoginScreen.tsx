import { useState } from 'react';
import { Check } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (phone: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState('0912 345 678');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(phone, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#e9ebf0] sm:p-6">
      <div className="relative w-full max-w-[402px] min-h-screen sm:min-h-[852px] sm:h-[852px] sm:rounded-[38px] overflow-hidden momo-login-dots shadow-2xl flex flex-col justify-between px-5 py-6">
        {/* Subtle decorative arc rings matching Figma 20:3 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-24 size-[360px] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-24 size-[340px] rounded-full border border-white/10"
        />

        <div className="h-3" />

        <div className="relative z-10 bg-white rounded-[28px] px-6 py-7 shadow-[0_20px_50px_rgba(74,0,46,0.28)]">
          {/* Top M badge */}
          <div className="flex justify-center mb-5">
            <div className="size-[56px] rounded-[16px] bg-[#b4006e] shadow-[0_10px_24px_rgba(180,0,110,0.35)] flex items-center justify-center">
              <span className="text-white text-[26px] font-extrabold tracking-tight">M</span>
            </div>
          </div>

          <p className="text-center text-[10.5px] font-bold tracking-[0.12em] text-[#b4006e] uppercase">
            WELCOME BACK
          </p>
          <h1 className="mt-1.5 text-center text-[25px] font-extrabold text-[#1e1e26] tracking-tight leading-tight">
            Sign in to MoMo
          </h1>
          <p className="mt-1.5 text-center text-[12.5px] text-[#7b7b87]">
            Manage your wallet and transactions with ease.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#353540] mb-1.5">
                Phone number
              </label>
              <div className="flex items-center h-[46px] rounded-[12px] border border-[#e3e4ea] bg-white px-3.5 focus-within:border-[#b4006e] focus-within:ring-2 focus-within:ring-[#fdecf6] transition">
                <span className="text-[13px] font-bold text-[#24242c] pr-3 border-r border-[#e5e6ec]">
                  +84
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full pl-3 text-[13.5px] text-[#24242c] placeholder:text-[#9c9ca8] outline-none bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#353540] mb-1.5">
                Password
              </label>
              <div className="flex items-center h-[46px] rounded-[12px] border border-[#e3e4ea] bg-white px-3.5 focus-within:border-[#b4006e] focus-within:ring-2 focus-within:ring-[#fdecf6] transition">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full text-[13.5px] text-[#24242c] placeholder:text-[#9c9ca8] outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="ml-2 text-[12px] font-semibold text-[#b4006e] hover:text-[#8f0057] shrink-0 cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-[12px] text-[#6d6d79] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-[#cfd1db] accent-[#b4006e]"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() =>
                  setNotice('Demo mode: tap Sign In to enter the demo wallet right away.')
                }
                className="text-[12px] font-semibold text-[#b4006e] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-[#fff0f2] border border-[#ffd2d9] px-3 py-2 text-[11.5px] text-[#c23146]">
                {error}
              </div>
            )}

            {notice && (
              <div className="rounded-xl bg-[#fdecf6] px-3 py-2 text-[11.5px] text-[#9b005e]">
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[48px] mt-1 rounded-[14px] bg-[#b4006e] hover:bg-[#9b005e] active:scale-[0.99] text-white text-[14.5px] font-bold shadow-[0_8px_20px_rgba(180,0,110,0.3)] transition cursor-pointer disabled:opacity-70"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-[#7b7b87]">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() =>
                setNotice('Instant demo access is active. Tap Sign In to continue.')
              }
              className="font-bold text-[#b4006e] hover:underline cursor-pointer"
            >
              Sign up now
            </button>
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#898995]">
            <span className="size-4 rounded-full bg-[#e8f8ee] text-[#17a354] flex items-center justify-center">
              <Check className="size-2.5 stroke-[3]" />
            </span>
            <span>Your information is always kept secure</span>
          </div>
        </div>

        <p className="relative z-10 text-center text-[10.5px] text-white/75 pb-1">
          Demo preview · DB auth bypassed until backend connection
        </p>
      </div>
    </div>
  );
}
