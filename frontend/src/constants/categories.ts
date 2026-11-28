import type { Category } from '../types/domain';

export const ALLOWED_CATEGORIES: Category[] = [
  'Food & Drink',
  'Groceries & Market',
  'Transport',
  'Shopping',
  'Entertainment & Outdoor',
  'Bills & Utilities',
  'Housing & Rent',
  'Health & Education',
  'Personal transfer',
  'Other',
];

export const FIXED_COST_CATEGORIES: ReadonlySet<Category> = new Set([
  'Housing & Rent',
  'Bills & Utilities',
  'Health & Education',
]);

export interface CategoryVisualStyle {
  pillBg: string;
  pillText: string;
  iconBg: string;
  barColor: string;
  shortLabel: string;
}

export const CATEGORY_STYLES: Record<Category, CategoryVisualStyle> = {
  'Food & Drink': {
    pillBg: 'bg-[#eef7ff]',
    pillText: 'text-[#268ad7]',
    iconBg: 'bg-[#fff5ec]',
    barColor: '#268ad7',
    shortLabel: 'Food & Drink',
  },
  'Groceries & Market': {
    pillBg: 'bg-[#fff0f2]',
    pillText: 'text-[#ce495b]',
    iconBg: 'bg-[#fff0f2]',
    barColor: '#ce495b',
    shortLabel: 'Groceries',
  },
  Transport: {
    pillBg: 'bg-[#edf9f0]',
    pillText: 'text-[#12a850]',
    iconBg: 'bg-[#0bb442]',
    barColor: '#12a850',
    shortLabel: 'Transport',
  },
  Shopping: {
    pillBg: 'bg-[#fff5ea]',
    pillText: 'text-[#d87722]',
    iconBg: 'bg-[#fff5ea]',
    barColor: '#d87722',
    shortLabel: 'Shopping',
  },
  'Entertainment & Outdoor': {
    pillBg: 'bg-[#fff0f8]',
    pillText: 'text-[#b4408f]',
    iconBg: 'bg-[#fff0f8]',
    barColor: '#b4408f',
    shortLabel: 'Entertainment',
  },
  'Bills & Utilities': {
    pillBg: 'bg-[#eef7ff]',
    pillText: 'text-[#268ad7]',
    iconBg: 'bg-[#eef7ff]',
    barColor: '#3b82f6',
    shortLabel: 'Bills & Utilities',
  },
  'Housing & Rent': {
    pillBg: 'bg-[#f4efff]',
    pillText: 'text-[#8860c3]',
    iconBg: 'bg-[#f4efff]',
    barColor: '#8860c3',
    shortLabel: 'Housing & Rent',
  },
  'Health & Education': {
    pillBg: 'bg-[#ebf9f7]',
    pillText: 'text-[#23938d]',
    iconBg: 'bg-[#ebf9f7]',
    barColor: '#23938d',
    shortLabel: 'Health & Edu',
  },
  'Personal transfer': {
    pillBg: 'bg-[#f0f5fe]',
    pillText: 'text-[#557ec1]',
    iconBg: 'bg-[#f0f5fe]',
    barColor: '#557ec1',
    shortLabel: 'Personal transfer',
  },
  Other: {
    pillBg: 'bg-[#f2f3f7]',
    pillText: 'text-[#74798a]',
    iconBg: 'bg-[#f2f3f7]',
    barColor: '#74798a',
    shortLabel: 'Other',
  },
};

export function formatVnd(amount: number, showSign = false, direction: 'OUT' | 'IN' = 'OUT'): string {
  const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
  if (!showSign) {
    return `${formatted}đ`;
  }
  return direction === 'IN' ? `+${formatted}đ` : `-${formatted}đ`;
}

export function formatTxTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} - ${dd}/${mo}`;
}
