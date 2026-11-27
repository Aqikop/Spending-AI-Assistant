import signalIcon from '../assets/figma/signal.svg';
import wifiIcon from '../assets/figma/wifi.svg';
import batteryIcon from '../assets/figma/battery.svg';
import searchIcon from '../assets/figma/search.svg';
import notificationsIcon from '../assets/figma/notifications.svg';
import messagesIcon from '../assets/figma/messages.svg';
import actionTopupIcon from '../assets/figma/action-topup.svg';
import actionWithdrawIcon from '../assets/figma/action-withdraw.svg';
import actionQrIcon from '../assets/figma/action-qr.svg';
import actionTransferIcon from '../assets/figma/action-transfer.svg';
import walletIcon from '../assets/figma/wallet.svg';
import eyeIcon from '../assets/figma/eye.svg';
import bankIcon from '../assets/figma/bank.svg';
import chevronRightIcon from '../assets/figma/chevron-right.svg';

import svcTransferIcon from '../assets/figma/svc-transfer.svg';
import svcBankTransferIcon from '../assets/figma/svc-bank-transfer.svg';
import svcBillsIcon from '../assets/figma/svc-bills.svg';
import svcMobileTopupIcon from '../assets/figma/svc-mobile-topup.svg';
import svcDataIcon from '../assets/figma/svc-data.svg';
import svcCommunityIcon from '../assets/figma/svc-community.svg';
import svcFastLoanIcon from '../assets/figma/svc-fast-loan.svg';
import svcPaylaterIcon from '../assets/figma/svc-paylater.svg';
import svcLoanPaymentIcon from '../assets/figma/svc-loan-payment.svg';
import svcMoviesIcon from '../assets/figma/svc-movies.svg';
import svcTravelIcon from '../assets/figma/svc-travel.svg';
import svcAllServicesIcon from '../assets/figma/svc-all-services.svg';

import catBankIcon from '../assets/figma/cat-bank.svg';
import catPhoneIcon from '../assets/figma/cat-phone.svg';
import catBasketIcon from '../assets/figma/cat-basket.svg';
import catBagIcon from '../assets/figma/cat-bag.svg';
import catFilmIcon from '../assets/figma/cat-film.svg';
import catHomeIcon from '../assets/figma/cat-home.svg';
import catHealthIcon from '../assets/figma/cat-health.svg';
import catTransferOutIcon from '../assets/figma/cat-transfer-out.svg';
import catOtherIcon from '../assets/figma/cat-other.svg';
import catCupIcon from '../assets/figma/cat-cup.svg';
import catTransferInIcon from '../assets/figma/cat-transfer-in.svg';

import pickSpendingIcon from '../assets/figma/pick-spending.svg';
import pickGroupFundIcon from '../assets/figma/pick-group-fund.svg';

import navHomeIcon from '../assets/figma/nav-home.svg';
import navDealsIcon from '../assets/figma/nav-deals.svg';
import navHistoryIcon from '../assets/figma/nav-history.svg';
import navFinanceIcon from '../assets/figma/nav-finance.svg';
import navMeIcon from '../assets/figma/nav-me.svg';

import type { LabeledTransaction } from '../types/domain';

export const FIGMA_ICONS = {
  signal: signalIcon,
  wifi: wifiIcon,
  battery: batteryIcon,
  search: searchIcon,
  notifications: notificationsIcon,
  messages: messagesIcon,
  actionTopup: actionTopupIcon,
  actionWithdraw: actionWithdrawIcon,
  actionQr: actionQrIcon,
  actionTransfer: actionTransferIcon,
  wallet: walletIcon,
  eye: eyeIcon,
  bank: bankIcon,
  chevronRight: chevronRightIcon,
  pickSpending: pickSpendingIcon,
  pickGroupFund: pickGroupFundIcon,
  navHome: navHomeIcon,
  navDeals: navDealsIcon,
  navHistory: navHistoryIcon,
  navFinance: navFinanceIcon,
  navMe: navMeIcon,
} as const;

export interface ServiceItem {
  id: string;
  label: string;
  icon: string;
  tileBg: string;
}

export const MOMO_SERVICES: ServiceItem[] = [
  { id: 'transfer', label: 'Transfer', icon: svcTransferIcon, tileBg: 'bg-[#fff0f0]' },
  {
    id: 'bank-transfer',
    label: 'Bank Transfer',
    icon: svcBankTransferIcon,
    tileBg: 'bg-[#eef6ff]',
  },
  { id: 'bills', label: 'Bill Payment', icon: svcBillsIcon, tileBg: 'bg-[#eaf9f7]' },
  {
    id: 'mobile-topup',
    label: 'Mobile Top-up',
    icon: svcMobileTopupIcon,
    tileBg: 'bg-[#eef6ff]',
  },
  { id: 'data', label: '4G/5G Data', icon: svcDataIcon, tileBg: 'bg-[#eef6ff]' },
  { id: 'community', label: 'Community', icon: svcCommunityIcon, tileBg: 'bg-[#fff0f8]' },
  { id: 'fast-loan', label: 'Fast Loan', icon: svcFastLoanIcon, tileBg: 'bg-[#fff5e7]' },
  { id: 'paylater', label: 'PayLater Wallet', icon: svcPaylaterIcon, tileBg: 'bg-[#fdebf6]' },
  {
    id: 'loan-payment',
    label: 'Loan Payment',
    icon: svcLoanPaymentIcon,
    tileBg: 'bg-[#fff5e7]',
  },
  { id: 'movies', label: 'Movie Tickets', icon: svcMoviesIcon, tileBg: 'bg-[#fff0f8]' },
  { id: 'travel', label: 'Travel & Transit', icon: svcTravelIcon, tileBg: 'bg-[#eef6ff]' },
  {
    id: 'all-services',
    label: 'All Services',
    icon: svcAllServicesIcon,
    tileBg: 'bg-[#f1f3f7]',
  },
];

export function resolveTransactionIcon(item: LabeledTransaction): {
  type: 'grab' | 'svg';
  src?: string;
  tileBg: string;
} {
  const { category, transaction } = item;
  const direction = transaction.direction ?? 'OUT';

  if (transaction.receiver.display_name.toUpperCase().includes('GRAB')) {
    return { type: 'grab', tileBg: 'bg-[#0bb442]' };
  }

  if (category === null) {
    return {
      type: 'svg',
      src: transaction.channel === 'VIETQR_P2P' ? catBankIcon : catTransferOutIcon,
      tileBg: 'bg-[#f2f3f7]',
    };
  }

  switch (category) {
    case 'Food & Drink':
      return {
        type: 'svg',
        src: transaction.channel === 'VIETQR_P2P' ? catBankIcon : catCupIcon,
        tileBg: transaction.channel === 'VIETQR_P2P' ? 'bg-[#eef7ff]' : 'bg-[#fff5ec]',
      };
    case 'Groceries & Market':
      return { type: 'svg', src: catBasketIcon, tileBg: 'bg-[#fff0f2]' };
    case 'Transport':
      return { type: 'svg', src: svcTravelIcon, tileBg: 'bg-[#edf9f0]' };
    case 'Shopping':
      return { type: 'svg', src: catBagIcon, tileBg: 'bg-[#fff5ea]' };
    case 'Entertainment & Outdoor':
      return { type: 'svg', src: catFilmIcon, tileBg: 'bg-[#fff0f8]' };
    case 'Bills & Utilities':
      return { type: 'svg', src: catPhoneIcon, tileBg: 'bg-[#eef7ff]' };
    case 'Housing & Rent':
      return { type: 'svg', src: catHomeIcon, tileBg: 'bg-[#f4efff]' };
    case 'Health & Education':
      return { type: 'svg', src: catHealthIcon, tileBg: 'bg-[#ebf9f7]' };
    case 'Personal transfer':
      return {
        type: 'svg',
        src: direction === 'IN' ? catTransferInIcon : catTransferOutIcon,
        tileBg: direction === 'IN' ? 'bg-[#eefaf3]' : 'bg-[#f0f5fe]',
      };
    case 'Other':
    default:
      return { type: 'svg', src: catOtherIcon, tileBg: 'bg-[#f2f3f7]' };
  }
}
