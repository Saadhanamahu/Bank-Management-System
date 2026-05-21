// src/pages/accounts/Accounts.jsx
// Lists all accounts + button to create new one.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus } from 'lucide-react';
import { getAllAccounts } from '../../services/accountService';
import { paiseToRupees, formatDate, statusColor, maskAccount } from '../../utils/formatters';
import { Card, LoadingSpinner, EmptyState, Button } from '../../components/ui';
import { THEME } from '../../config/constants';

export const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getAllAccounts().then(setAccounts).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading accounts…" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-1">{accounts.length} accounts in this bank</p>
        </div>
        <Link to="/accounts/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            New account
          </Button>
        </Link>
      </div>

      <Card>
        {accounts.length === 0 ? (
          <EmptyState icon={CreditCard} message="No accounts yet. Create one to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Account no.', 'Customer', 'Type', 'Balance', 'IFSC', 'Status', 'Created', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs">{maskAccount(acc.accountNumber)}</td>
                    <td className="py-3 pr-4 text-gray-700">{acc.customerName ?? acc.customerId}</td>
                    <td className="py-3 pr-4 capitalize text-gray-600">{acc.accountType}</td>
                    <td className="py-3 pr-4 font-semibold text-gray-900">{paiseToRupees(acc.balance)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{acc.ifscCode}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(acc.status)}`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-400">{formatDate(acc.createdAt)}</td>
                    <td className="py-3">
                      <Link to={`/accounts/${acc.id}`} className={`text-xs font-medium ${THEME.primaryText}`}>
                        View
                      </Link>
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
