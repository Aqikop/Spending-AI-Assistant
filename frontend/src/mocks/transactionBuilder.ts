import type {
  Category,
  ConfidenceLevel,
  DecisionSource,
  LabeledTransaction,
  LabelState,
  PaymentChannel,
} from '../types/domain';

export interface SeedTxSpec {
  id: string;
  timestamp: string;
  amount: number;
  direction?: 'OUT' | 'IN';
  channel: PaymentChannel;
  receiver_id: string;
  receiver_name: string;
  merchant_id?: string | null;
  mcc?: string | null;
  message: string;
  state: LabelState;
  category: Category | null;
  is_suggested?: boolean;
  source: DecisionSource;
  confidence: ConfidenceLevel;
  suggested_buttons?: Category[];
}

export function toLabeled(spec: SeedTxSpec): LabeledTransaction {
  const action =
    spec.state === 'UNCLASSIFIED'
      ? 'UNCLASSIFIED'
      : spec.is_suggested
        ? 'SUGGESTED'
        : 'AUTO_LABELED';

  return {
    transaction: {
      transaction_id: spec.id,
      timestamp: spec.timestamp,
      amount: spec.amount,
      direction: spec.direction ?? 'OUT',
      channel: spec.channel,
      sender: { user_id: 'USER_001' },
      receiver: {
        receiver_id: spec.receiver_id,
        display_name: spec.receiver_name,
        merchant_id: spec.merchant_id ?? null,
        mcc: spec.mcc ?? null,
        account_type_hint: spec.merchant_id || spec.mcc ? 'MERCHANT' : 'PERSONAL',
      },
      context: {
        transfer_message: spec.message,
        city: 'Ho Chi Minh',
      },
    },
    state: spec.state,
    category: spec.category,
    is_suggested: spec.is_suggested ?? false,
    source: spec.source,
    ai_status: 'OK',
    decision:
      spec.source === 'AI'
        ? {
            transaction_id: spec.id,
            category: spec.category,
            confidence: spec.confidence,
            action,
            suggested_buttons: spec.suggested_buttons ?? [],
          }
        : null,
  };
}
