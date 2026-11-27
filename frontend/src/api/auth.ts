import type { AuthSession, UserProfile } from '../types/domain';

const DEMO_USER_PROFILE: UserProfile = {
  user_id: 'USER_001',
  display_name: 'Tran Minh Trac',
  phone_number: '0912345678',
  wallet_balance: 2580000,
  monthly_income: 12000000,
};

let activeSession: AuthSession | null = null;

/**
 * Sign in to MoMo.
 *
 * NOTE: Real username/password DB verification logic is written below and
 * commented out until the backend user database endpoint is connected.
 * For now, clicking Sign In logs straight into the demo account.
 */
export async function loginUser(
  phoneNumber: string,
  password: string,
): Promise<AuthSession> {
  // ---------------------------------------------------------------------------
  // COMMENTED OUT: Real DB authentication logic (enable when backend DB is ready)
  // ---------------------------------------------------------------------------
  // const normalizedPhone = phoneNumber.trim();
  // if (!normalizedPhone || !password) {
  //   throw new Error('Please enter both phone number and password.');
  // }
  //
  // const response = await fetch('/auth/login', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   credentials: 'include',
  //   body: JSON.stringify({
  //     phone_number: normalizedPhone,
  //     password,
  //   }),
  // });
  //
  // if (!response.ok) {
  //   const err = await response.json().catch(() => ({}));
  //   throw new Error(err.detail ?? 'Invalid phone number or password.');
  // }
  //
  // const verifiedSession: AuthSession = await response.json();
  // activeSession = verifiedSession;
  // return verifiedSession;
  // ---------------------------------------------------------------------------

  void password;
  const cleanPhone = phoneNumber.trim() || DEMO_USER_PROFILE.phone_number;
  activeSession = {
    session_id: 'demo-session-user-001',
    user: {
      ...DEMO_USER_PROFILE,
      phone_number: cleanPhone,
    },
    authenticated_at: new Date().toISOString(),
  };
  return activeSession;
}

export async function logoutUser(): Promise<void> {
  // COMMENTED OUT: Backend session invalidation
  // await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
  activeSession = null;
}

export function getActiveSession(): AuthSession | null {
  return activeSession;
}
