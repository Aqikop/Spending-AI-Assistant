import type { Category } from '../types/domain';

export const LAST_MONTH_CATEGORY_SPEND: Record<Category, number> = {
  'Food & Drink': 1120000,
  'Groceries & Market': 580000,
  Transport: 230000,
  Shopping: 950000,
  'Entertainment & Outdoor': 310000,
  'Bills & Utilities': 905000,
  'Housing & Rent': 3000000,
  'Health & Education': 450000,
  'Personal transfer': 250000,
  Other: 40000,
};

export const MOCK_ADVICE_TEMPLATES = [
  {
    cut_categories: ['Food & Drink', 'Shopping'] as Category[],
    advice:
      'Food & Drink and Shopping are your largest flexible expenses this month. Setting a weekly dining budget and applying MoMo partner vouchers could trim ~15% without affecting fixed essentials.',
    management_tips: [
      'Set a 300,000đ weekly limit for dining & cafe orders.',
      'Confirm the 2 unclassified transfers so your monthly Other bucket stays clean.',
      'Use partner vouchers before checking out on Shopee or coffee shops.',
    ],
    voucher_picks: [
      {
        voucher_id: 'V001',
        why: 'Helps cut your Food & Drink spend, your highest flexible category this month.',
      },
      {
        voucher_id: 'V004',
        why: 'Reduces upcoming retail costs in Shopping, your second largest flexible spend.',
      },
      {
        voucher_id: 'V007',
        why: 'Covers morning coffee orders with Buy 1 Get 1 partner savings.',
      },
    ],
  },
  {
    cut_categories: ['Food & Drink', 'Entertainment & Outdoor'] as Category[],
    advice:
      'Your fixed costs (Rent, Bills, Health & Education) are stable. Focusing on flexible categories—especially Food & Drink and weekend outings—gives you the fastest savings boost.',
    management_tips: [
      'Batch small cafe and snack purchases into a single weekly allowance.',
      'Review suggested transactions with one tap to keep AI memory sharp.',
      'Apply weekend cinema vouchers before paying full ticket price.',
    ],
    voucher_picks: [
      {
        voucher_id: 'V001',
        why: 'Saves up to 25,000đ on your frequent Food & Drink orders.',
      },
      {
        voucher_id: 'V003',
        why: 'Cuts movie ticket costs under Entertainment & Outdoor.',
      },
    ],
  },
];
