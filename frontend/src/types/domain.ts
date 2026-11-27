export type Category =
  | 'Food & Drink'
  | 'Groceries & Market'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment & Outdoor'
  | 'Bills & Utilities'
  | 'Housing & Rent'
  | 'Health & Education'
  | 'Personal transfer'
  | 'Other';

export type LabelState = 'AUTO_LABELED' | 'UNCLASSIFIED' | 'USER_LABELED';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DecisionSource = 'lookup' | 'memory' | 'AI' | 'user';

export type PaymentChannel =
  | 'MOMO_MERCHANT'
  | 'VIETQR_MERCHANT'
  | 'VIETQR_P2P'
  | 'P2P_TRANSFER';

export type AIStatus = 'OK' | 'PENDING_AI_UNAVAILABLE' | 'AI_REQUIRED';

export interface Decision {
  transaction_id: string;
  category: Category | null;
  confidence: ConfidenceLevel;
  action: 'AUTO_LABELED' | 'SUGGESTED' | 'UNCLASSIFIED';
  suggested_buttons: Category[];
}

export interface TransactionIn {
  transaction_id: string;
  timestamp: string;
  amount: number;
  direction?: 'OUT' | 'IN';
  channel: PaymentChannel;
  sender: {
    user_id: string;
  };
  receiver: {
    receiver_id: string;
    display_name: string;
    merchant_id: string | null;
    mcc: string | null;
    account_type_hint: 'MERCHANT' | 'PERSONAL';
  };
  context: {
    transfer_message: string;
    city?: string;
  };
}

export interface LabeledTransaction {
  transaction: TransactionIn;
  state: LabelState;
  category: Category | null;
  is_suggested?: boolean;
  source: DecisionSource;
  ai_status?: AIStatus;
  decision: Decision | null;
}

export interface PendingItemOut {
  item: LabeledTransaction;
  suggested_buttons: Category[];
  receiver_sender_count: number;
}

export interface CategoryTotalOut {
  category: Category;
  spent: number;
  count: number;
  share_of_spending: number;
  share_of_income: number;
  change_vs_last_month: number;
  cuttable: boolean;
  unclassified_count?: number;
}

export interface VoucherOut {
  voucher_id: string;
  category: Category;
  tag: string;
  headline: string;
  subline: string;
  title: string;
  subtitle: string;
  cta_label: string;
  theme: 'blue' | 'purple' | 'pink' | 'amber';
}

export interface VoucherPick extends VoucherOut {
  why: string;
}

export interface AdviceResponse {
  status: 'ok' | 'not_enough_data' | 'ai_unavailable';
  message?: string;
  monthly_income: number;
  total_spent: number;
  unclassified_count: number;
  unclassified_share: number;
  categories: CategoryTotalOut[];
  cut_categories: Category[];
  advice: string;
  management_tips: string[];
  vouchers: VoucherPick[];
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  phone_number: string;
  wallet_balance: number;
  monthly_income: number;
}

export interface AuthSession {
  session_id: string;
  user: UserProfile;
  authenticated_at: string;
}

export type AppTab = 'home' | 'deals' | 'history' | 'finance' | 'me';
