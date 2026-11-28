import { useCallback, useEffect, useMemo, useState } from 'react';
import { loginUser, logoutUser } from './api/auth';
import {
  getSavedUserMemoryCount,
  getSpendingAdvice,
  listTransactions,
  listVouchers,
  resetDemoSession,
  submitUserLabel,
} from './api/spending';
import { DealsTab } from './components/DealsTab';
import { FinanceTab } from './components/FinanceTab';
import { HistoryTab } from './components/HistoryTab';
import { HomeExtras } from './components/HomeExtras';
import { HomeHeaderAndServices } from './components/HomeHeaderAndServices';
import { LoginScreen } from './components/LoginScreen';
import { MeTab } from './components/MeTab';
import { HomePageLayout } from './components/HomePageLayout';
import { RecentTransactionsCard } from './components/RecentTransactionsCard';
import { TransactionDetailSheet } from './components/TransactionDetailSheet';
import type {
  AdviceResponse,
  AppTab,
  AuthSession,
  Category,
  LabeledTransaction,
  VoucherOut,
} from './types/domain';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [transactions, setTransactions] = useState<LabeledTransaction[]>([]);
  const [adviceData, setAdviceData] = useState<AdviceResponse | null>(null);
  const [allVouchers, setAllVouchers] = useState<VoucherOut[]>([]);
  const [selectedTx, setSelectedTx] = useState<LabeledTransaction | null>(null);
  const [homeSearch, setHomeSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [claimedVouchers, setClaimedVouchers] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadWorkspaceData = useCallback(async (userId: string) => {
    const [txs, vouchers, advice] = await Promise.all([
      listTransactions(),
      listVouchers(),
      getSpendingAdvice(userId, false),
    ]);
    setTransactions(txs);
    setAllVouchers(vouchers);
    setAdviceData(advice);
  }, []);

  async function handleLogin(phone: string, password: string) {
    const auth = await loginUser(phone, password);
    setSession(auth);
    setActiveTab('home');
    await loadWorkspaceData(auth.user.user_id);
  }

  async function handleSignOut() {
    await logoutUser();
    setSession(null);
    setSelectedTx(null);
  }

  async function handleSelectCategory(transactionId: string, category: Category) {
    if (!session) return;
    setSavingId(transactionId);
    try {
      const updated = await submitUserLabel(transactionId, category);
      setTransactions(updated);
      const refreshedItem =
        updated.find((t) => t.transaction.transaction_id === transactionId) ?? null;
      setSelectedTx((prev) =>
        prev && prev.transaction.transaction_id === transactionId ? refreshedItem : prev,
      );
      const nextAdvice = await getSpendingAdvice(session.user.user_id, false);
      setAdviceData(nextAdvice);
      showToast(`Saved as "${category}" · Remembered for future payments`);
    } finally {
      setSavingId(null);
    }
  }

  async function handleRefreshAdvice() {
    if (!session) return;
    setLoadingAdvice(true);
    try {
      const nextAdvice = await getSpendingAdvice(session.user.user_id, true);
      setAdviceData(nextAdvice);
      showToast('AI spending advice updated');
    } finally {
      setLoadingAdvice(false);
    }
  }

  async function handleResetSession() {
    if (!session) return;
    setResetting(true);
    try {
      const resetTxs = await resetDemoSession();
      setTransactions(resetTxs);
      setSelectedTx(null);
      setClaimedVouchers(new Set());
      const nextAdvice = await getSpendingAdvice(session.user.user_id, false);
      setAdviceData(nextAdvice);
      showToast('Demo session reset to initial November data');
    } finally {
      setResetting(false);
    }
  }

  function handleToggleClaimVoucher(voucherId: string) {
    setClaimedVouchers((prev) => {
      const next = new Set(prev);
      if (next.has(voucherId)) {
        next.delete(voucherId);
        showToast('Removed from saved vouchers');
      } else {
        next.add(voucherId);
        showToast('Voucher saved to your wallet');
      }
      return next;
    });
  }

  const pendingCount = useMemo(
    () => transactions.filter((t) => t.state === 'UNCLASSIFIED').length,
    [transactions],
  );

  const autoLabeledCount = useMemo(
    () => transactions.filter((t) => t.state === 'AUTO_LABELED').length,
    [transactions],
  );

  const homeFilteredTransactions = useMemo(() => {
    const q = homeSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (item) =>
        item.transaction.receiver.display_name.toLowerCase().includes(q) ||
        (item.category ?? 'unclassified').toLowerCase().includes(q),
    );
  }, [transactions, homeSearch]);

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const tabTitles: Record<AppTab, string> = {
    home: 'Home',
    deals: 'Deals & Vouchers',
    history: 'Transaction History',
    finance: 'Manage Spending',
    me: 'My MoMo',
  };

  return (
    <HomePageLayout
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      pendingCount={pendingCount}
      toast={toast}
      overlay={
        <TransactionDetailSheet
          item={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSelectCategory={handleSelectCategory}
          saving={savingId !== null}
        />
      }
    >
      {activeTab !== 'home' && (
        <div className="bg-[#ad006c] px-4 py-3 text-white flex items-center justify-between">
          <h1 className="text-[17px] font-bold tracking-tight">{tabTitles[activeTab]}</h1>
          {pendingCount > 0 && activeTab !== 'history' && (
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10.5px] font-semibold cursor-pointer"
            >
              {pendingCount} needs review
            </button>
          )}
        </div>
      )}

      {activeTab === 'home' && (
        <>
          <HomeHeaderAndServices
            walletBalance={session.user.wallet_balance}
            searchQuery={homeSearch}
            onSearchChange={setHomeSearch}
            pendingCount={pendingCount}
            onNotify={showToast}
            onOpenHistory={() => setActiveTab('history')}
            onOpenDeals={() => setActiveTab('deals')}
          />

          <div className="px-4 pt-4 space-y-4">
            <RecentTransactionsCard
              transactions={homeFilteredTransactions}
              pendingCount={pendingCount}
              onSelectTransaction={setSelectedTx}
              onQuickLabel={handleSelectCategory}
              onOpenHistory={() => setActiveTab('history')}
              savingId={savingId}
            />

            <HomeExtras
              onOpenFinance={() => setActiveTab('finance')}
              onOpenDeals={() => setActiveTab('deals')}
              onNotify={showToast}
              recommendedVouchers={adviceData?.vouchers ?? []}
            />
          </div>
        </>
      )}

      {activeTab === 'deals' && (
        <DealsTab
          recommendedVouchers={adviceData?.vouchers ?? []}
          allVouchers={allVouchers}
          claimedVouchers={claimedVouchers}
          onToggleClaim={handleToggleClaimVoucher}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          transactions={transactions}
          onSelectTransaction={setSelectedTx}
          onQuickLabel={handleSelectCategory}
          savingId={savingId}
        />
      )}

      {activeTab === 'finance' && (
        <FinanceTab
          adviceData={adviceData}
          loading={loadingAdvice}
          onRefreshAdvice={handleRefreshAdvice}
          onOpenDeals={() => setActiveTab('deals')}
          claimedVouchers={claimedVouchers}
          onToggleClaimVoucher={handleToggleClaimVoucher}
        />
      )}

      {activeTab === 'me' && (
        <MeTab
          user={session.user}
          userMemoryCount={getSavedUserMemoryCount()}
          autoLabeledCount={autoLabeledCount}
          unclassifiedCount={pendingCount}
          onResetSession={handleResetSession}
          onSignOut={handleSignOut}
          resetting={resetting}
        />
      )}
    </HomePageLayout>
  );
}
export default App;
