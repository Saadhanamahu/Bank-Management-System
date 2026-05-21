// src/pages/accounts/AccountDetails.jsx

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccount, updateAccountStatus } from '../../services/accountService';
import { getTransactionsByAccount } from '../../services/transactionService';
import {
  paiseToRupees, formatDate, maskAccount,
  statusColor, directionColor, directionSign, modeLabel,
} from '../../utils/formatters';
import { Card, LoadingSpinner, Button, EmptyState } from '../../components/ui';
import { THEME } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';

export const AccountDetails = () => {
  const { id }         = useParams();
  const { isManager }  = useAuth();
  const [account,      setAccount]      = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [togglingStatus, setToggling]   = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(account.accountNumber ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    (async () => {
      try {
        const [acc, txns] = await Promise.all([
          getAccount(id),
          getTransactionsByAccount(id),
        ]);
        setAccount(acc);
        setTransactions(txns);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleStatus = async () => {
    if (!account) return;
    const next = account.status === 'active' ? 'frozen' : 'active';
    setToggling(true);
    try {
      await updateAccountStatus(id, next);
      setAccount(a => ({ ...a, status: next }));
      toast.success(`Account ${next === 'active' ? 'unfrozen' : 'frozen'}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(false);
    }
  };

  if (loading)  return <LoadingSpinner message="Loading account…" />;
  if (!account) return <p className="text-gray-500 text-sm">Account not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/accounts" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Account Details</h1>
      </div>

      {/* Account card */}
      <div className={`${THEME.primary} rounded-2xl p-6 text-white`}>
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs mb-0.5">Account number</p>
              <p className="text-xl font-mono font-bold tracking-widest">
                {account.accountNumber}
              </p>
              <button
                onClick={copyAccountNumber}
                className="mt-1 text-xs text-white/60 hover:text-white transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy number'}
              </button>
            </div>
          <div className="text-right">
            <p className="text-white/70 text-sm mb-1">Balance</p>
            <p className="text-3xl font-bold">{paiseToRupees(account.balance)}</p>
            <p className="text-white/60 text-xs mt-1">{account.ifscCode}</p>
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full capitalize
              ${account.status === 'active' ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
              {account.status}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-white/60 text-xs">Type</p>
            <p className="capitalize font-medium">{account.accountType}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Customer</p>
            <p className="font-medium truncate">{account.customerName}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Opened</p>
            <p className="font-medium">{formatDate(account.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link to={`/send-money`}>
          <Button size="sm">
            <ArrowRightLeft className="w-4 h-4" />
            Send money
          </Button>
        </Link>
        {isManager && (
          <Button
            size="sm"
            variant={account.status === 'active' ? 'danger' : 'secondary'}
            loading={togglingStatus}
            onClick={toggleStatus}
          >
            {account.status === 'active' ? 'Freeze account' : 'Unfreeze account'}
          </Button>
        )}
      </div>

      {/* Transaction history */}
      <Card title={`Transactions (${transactions.length})`}>
        {transactions.length === 0 ? (
          <EmptyState message="No transactions on this account." />
        ) : (
          <div className="space-y-3">
            {transactions.map(txn => (
              <div key={txn.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm
                    ${txn.direction === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {txn.direction === 'credit' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {txn.type === 'intrabank_transfer' ? 'Internal transfer' : `${modeLabel(txn.mode)} · ${txn.direction === 'credit' ? txn.fromBankId : txn.toBankId}`}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(txn.createdAt)}</p>
                    {txn.failureReason && (
                      <p className="text-xs text-red-500 mt-0.5">{txn.failureReason}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${directionColor(txn.direction)}`}>
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
    </div>
  );
};
