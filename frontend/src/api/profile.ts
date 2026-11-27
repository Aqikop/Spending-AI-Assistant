import type { UserProfile } from '../types/domain';
import { getActiveSession } from './auth';

const MOCK_USER_DB_RECORD: UserProfile = {
  user_id: 'USER_001',
  display_name: 'Tran Minh Trac',
  phone_number: '0912345678',
  wallet_balance: 2580000,
  monthly_income: 12000000,
};

/**
 * Looks up the logged-in user's monthly_income from the user database.
 * Kept hidden from manual editing in the UI; Flow 2 uses this value to compute
 * each spending category's share_of_income.
 */
export async function lookupMonthlyIncome(userId: string): Promise<number> {
  // ---------------------------------------------------------------------------
  // COMMENTED OUT: Real DB lookup logic (enable when backend /profile is ready)
  // ---------------------------------------------------------------------------
  // const response = await fetch(`/profile?user_id=${encodeURIComponent(userId)}`, {
  //   method: 'GET',
  //   credentials: 'include',
  // });
  // if (!response.ok) {
  //   throw new Error('Failed to look up monthly income from user database.');
  // }
  // const profile: UserProfile = await response.json();
  // return profile.monthly_income;
  // ---------------------------------------------------------------------------

  void userId;
  const session = getActiveSession();
  return session?.user.monthly_income ?? MOCK_USER_DB_RECORD.monthly_income;
}

/**
 * Maintains/updates monthly_income in the user database while logged in.
 */
export async function maintainMonthlyIncome(
  userId: string,
  nextIncome: number,
): Promise<number> {
  // ---------------------------------------------------------------------------
  // COMMENTED OUT: Real DB update logic (enable when backend PUT /profile is ready)
  // ---------------------------------------------------------------------------
  // const response = await fetch('/profile', {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   credentials: 'include',
  //   body: JSON.stringify({
  //     user_id: userId,
  //     monthly_income: nextIncome,
  //   }),
  // });
  // if (!response.ok) {
  //   throw new Error('Failed to update monthly income in user database.');
  // }
  // const updated: UserProfile = await response.json();
  // return updated.monthly_income;
  // ---------------------------------------------------------------------------

  void userId;
  MOCK_USER_DB_RECORD.monthly_income = nextIncome;
  const session = getActiveSession();
  if (session) {
    session.user.monthly_income = nextIncome;
  }
  return nextIncome;
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const income = await lookupMonthlyIncome(userId);
  const session = getActiveSession();
  return {
    ...(session?.user ?? MOCK_USER_DB_RECORD),
    monthly_income: income,
  };
}
