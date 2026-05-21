// src/pages/transactions/TransactionHistory.jsx

import { useEffect, useState } from 'react';
import { Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getAllTransactions, getTransactionsByAccount } from '../../services/transactionService';
import { getMyAccounts } from '../../services/accountService';
import { useAuth } from '../../context/AuthContext';
import {
  paiseToRupees, formatDate, statusColor,
  directionColor, directionSign, modeLabel,
} from '../../utils/formatters';
import { Card, LoadingSpinner, EmptyState } from '../../components/ui';
import { BANK_ID } from '../../config/constants';

const FILTERS = ['all', 'credit', 'debit', 'pending', 'failed', 'interbank'];

export const TransactionHistory = () => {
  const { isCustomer, customerData } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filter,       setFilter]       = useState('all');
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (isCustomer) {
          // Load only accounts belonging to this customer
          const accounts = await getMyAccounts(customerData.uid);

          if (accounts.length === 0) {
            setTransactions([]);
            return;
          }

          // Fetch transactions for each account and merge
          const txnArrays = await Promise.all(
            accounts.map(a => getTransactionsByAccount(a.id))
          );

          // Deduplicate by transaction ID (a transfer appears in
          // both debit and credit queries for the same account)
          const map = new Map();
          txnArrays.flat().forEach(t => map.set(t.id, t));

          // Sort newest first
          const sorted = [...map.values()].sort((a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
          );
          setTransactions(sorted);
        } else {
          // Staff — load all transactions in the bank
          const txns = await getAllTransactions();
          setTransactions(txns);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isCustomer, customerData]);

  const filtered = transactions.filter(t => {
    if (filter === 'all')       return true;
    if (filter === 'credit')    return t.direction === 'credit';
    if (filter === 'debit')     return t.direction === 'debit';
    if (filter === 'pending')   return t.status === 'pending';
    if (filter === 'failed')    return t.status === 'failed';
    if (filter === 'interbank') return t.type === 'interbank_transfer';
    return true;
  });

  if (loading) return <LoadingSpinner message="Loading transactions…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {isCustomer ? 'My Transfers' : 'Transaction History'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isCustomer
            ? `${transactions.length} transactions on your accounts`
            : `${transactions.length} records in private database`}
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors
              ${filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={Clock} message="No transactions match this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ID', 'Type', 'Direction', 'Amount', 'From → To', 'Mode', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(txn => (
                  <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs text-gray-500">{txn.id.slice(0, 8)}…</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs capitalize text-gray-600">
                        {txn.type === 'intrabank_transfer' ? 'Internal' : 'Interbank'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        {txn.direction === 'credit'
                          ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                          : <ArrowUpRight  className="w-3.5 h-3.5 text-red-500" />
                        }
                        <span className={`text-xs font-medium capitalize ${directionColor(txn.direction)}`}>
                          {txn.direction}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`font-semibold text-sm ${directionColor(txn.direction)}`}>
                        {directionSign(txn.direction)}{paiseToRupees(txn.amount)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-gray-500 font-mono">
                        {txn.fromBankId === BANK_ID ? 'This bank' : txn.fromBankId}
                        {' → '}
                        {txn.toBankId === BANK_ID ? 'This bank' : txn.toBankId}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-gray-500">{modeLabel(txn.mode)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(txn.status)}`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(txn.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};