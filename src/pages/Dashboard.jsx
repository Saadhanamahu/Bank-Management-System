// src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CreditCard, Clock, TrendingUp, Activity, ShieldCheck, AlertCircle } from 'lucide-react';
import { getAllAccounts, getMyAccounts } from '../services/accountService';
import { getAllTransactions, getTransactionsByAccount } from '../services/transactionService';
import { paiseToRupees, formatDate, statusColor, directionColor, directionSign } from '../utils/formatters';
import { BANK_NAME, BANK_ID, THEME } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, LoadingSpinner } from '../components/ui';

const KYC_STATUS_BANNER = {
  not_submitted: {
    icon:    <ShieldCheck className="w-5 h-5 text-blue-600" />,
    bg:      'bg-blue-50 border-blue-200',
    title:   'Complete your KYC to get started',
    message: 'Submit your identity documents so we can verify your account and open your bank account.',
    action:  { label: 'Submit KYC now', to: '/kyc' },
  },
  pending: {
    icon:    <Clock className="w-5 h-5 text-yellow-600" />,
    bg:      'bg-yellow-50 border-yellow-200',
    title:   'KYC under review',
    message: 'Your documents are being reviewed. We will notify you once your account is ready.',
    action:  { label: 'View KYC status', to: '/kyc' },
  },
  rejected: {
    icon:    <AlertCircle className="w-5 h-5 text-red-600" />,
    bg:      'bg-red-50 border-red-200',
    title:   'KYC rejected',
    message: 'Your KYC was not approved. Please resubmit with correct documents.',
    action:  { label: 'Resubmit KYC', to: '/kyc' },
  },
};

export const Dashboard = () => {
  const { isCustomer, isStaff, customerData, displayName, kycStatus } = useAuth();
  const [accounts,     setAccounts]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (isCustomer) {
          // Only load accounts if KYC is approved
          if (kycStatus === 'approved') {
            const accs = await getMyAccounts(customerData.uid);
            setAccounts(accs);
            if (accs.length > 0) {
              const txnArrays = await Promise.all(accs.map(a => getTransactionsByAccount(a.id)));
              const map = new Map();
              txnArrays.flat().forEach(t => map.set(t.id, t));
              const sorted = [...map.values()].sort((a, b) =>
                (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
              );
              setTransactions(sorted.slice(0, 10));
            }
          }
        } else {
          const [accs, txns] = await Promise.all([getAllAccounts(), getAllTransactions()]);
          setAccounts(accs);
          setTransactions(txns.slice(0, 10));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isCustomer, customerData, kycStatus]);

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;

  const totalBalance   = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const pendingTxns    = transactions.filter(t => t.status === 'pending').length;

  const kyxBanner = KYC_STATUS_BANNER[kycStatus];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Good {getGreeting()}, {displayName.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {BANK_NAME} · {isCustomer ? 'Customer Portal' : BANK_ID.toUpperCase()}
        </p>
      </div>

      {/* KYC status banner for customers who haven't been approved yet */}
      {isCustomer && kycStatus !== 'approved' && kyxBanner && (
        <div className={`flex items-start gap-4 p-4 rounded-xl border ${kyxBanner.bg}`}>
          <div className="flex-shrink-0 mt-0.5">{kyxBanner.icon}</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{kyxBanner.title}</p>
            <p className="text-sm text-gray-600 mt-0.5">{kyxBanner.message}</p>
          </div>
          <Link
            to={kyxBanner.action.to}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${THEME.primary} text-white whitespace-nowrap flex-shrink-0`}
          >
            {kyxBanner.action.label}
          </Link>
        </div>
      )}

      {/* Stats — only show if KYC approved or is staff */}
      {(isStaff || kycStatus === 'approved') && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label={isCustomer ? 'Total balance' : 'Total bank balance'}
              value={paiseToRupees(totalBalance)}
              sub={isCustomer ? 'across your accounts' : 'across all accounts'}
              icon={TrendingUp}
            />
            <StatCard
              label={isCustomer ? 'Your accounts' : 'Active accounts'}
              value={activeAccounts}
              icon={CreditCard}
            />
            <StatCard label="Pending transfers" value={pendingTxns} icon={Clock} />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { to: '/send-money',   label: 'Send Money',      icon: ArrowRightLeft, desc: 'Transfer to any account' },
              { to: '/transactions', label: 'View History',    icon: Clock,          desc: 'All transfers' },
              ...(isStaff ? [
                { to: '/accounts',     label: 'Manage Accounts', icon: CreditCard,     desc: 'All bank accounts' },
                { to: '/accounts/new', label: 'Open Account',    icon: CreditCard,     desc: 'New customer account' },
              ] : []),
            ].map(({ to, label, icon: Icon, desc }) => (
              <Link key={to} to={to}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group">
                <div className={`p-2.5 rounded-lg ${THEME.primaryLight} group-hover:${THEME.primary} transition-colors`}>
                  <Icon className={`w-5 h-5 ${THEME.primaryText} group-hover:text-white transition-colors`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent transactions */}
            <Card title="Recent transfers" action={
              <Link to="/transactions" className={`text-xs font-medium ${THEME.primaryText}`}>View all</Link>
            }>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No transfers yet.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 6).map(txn => (
                    <div key={txn.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                          ${txn.direction === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {txn.direction === 'credit' ? '↓' : '↑'}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">
                            {txn.type === 'intrabank_transfer' ? 'Internal' : `${txn.mode?.toUpperCase()} · ${txn.direction === 'credit' ? txn.fromBankId : txn.toBankId}`}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(txn.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${directionColor(txn.direction)}`}>
                          {directionSign(txn.direction)}{paiseToRupees(txn.amount)}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor(txn.status)}`}>
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Accounts — show FULL account number for customers */}
            <Card title={isCustomer ? 'My accounts' : 'Accounts'} action={
              isStaff
                ? <Link to="/accounts" className={`text-xs font-medium ${THEME.primaryText}`}>Manage</Link>
                : null
            }>
              {accounts.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  {isCustomer
                    ? 'Your account will appear here once opened by the bank.'
                    : 'No accounts yet.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {accounts.slice(0, 5).map(acc => (
                    <Link
                      key={acc.id}
                      to={isStaff ? `/accounts/${acc.id}` : '#'}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-xs font-medium text-gray-800 font-mono">
                          {/* Customers see FULL account number, staff see masked */}
                          {isCustomer ? acc.accountNumber : `••••${acc.accountNumber?.slice(-4)}`}
                        </p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">
                          {acc.accountType} · {acc.ifscCode}
                        </p>
                        {isStaff && (
                          <p className="text-xs text-gray-400">{acc.customerName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{paiseToRupees(acc.balance)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor(acc.status)}`}>
                          {acc.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};
