// src/pages/accounts/CreateAccount.jsx
// Staff opens a new account for an existing customer.
// Shows a searchable customer list — no manual ID entry.

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { createAccount, getAllCustomers } from '../../services/accountService';
import { registerPublicAccount } from '../../services/hubService';
import { rupeesToPaise } from '../../utils/formatters';
import { ACCOUNT_TYPES, THEME } from '../../config/constants';
import { Button, Input, Select, Card, LoadingSpinner } from '../../components/ui';

const schema = z.object({
  accountType: z.enum(['savings', 'current', 'salary', 'fd'], {
    required_error: 'Select account type',
  }),
  initialDeposit: z.string()
    .min(1, 'Initial deposit is required')
    .refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Invalid amount'),
});

export const CreateAccount = () => {
  const navigate = useNavigate();

  const [customers,        setCustomers]        = useState([]);
  const [loadingCustomers, setLoadingCustomers]  = useState(true);
  const [search,           setSearch]            = useState('');
  const [selectedCustomer, setSelectedCustomer]  = useState(null);
  const [dropdownOpen,     setDropdownOpen]      = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { accountType: 'savings', initialDeposit: '0' },
  });

  useEffect(() => {
    getAllCustomers()
      .then(setCustomers)
      .catch(err => toast.error('Failed to load customers: ' + err.message))
      .finally(() => setLoadingCustomers(false));
  }, []);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  const onSubmit = async (data) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer first.');
      return;
    }
    try {
      const { id: accountId, accountNumber } = await createAccount({
        customerId:          selectedCustomer.id,
        accountType:         data.accountType,
        initialDepositPaise: rupeesToPaise(data.initialDeposit),
      });
      await registerPublicAccount(accountId, accountNumber);
      toast.success(`Account opened for ${selectedCustomer.fullName}. ••••${accountNumber.slice(-4)}`);
      navigate(`/accounts/${accountId}`);
    } catch (err) {
      toast.error(err.message ?? 'Failed to create account.');
    }
  };

  const accountTypeOptions = ACCOUNT_TYPES.map(t => ({
    value: t,
    label: t.charAt(0).toUpperCase() + t.slice(1),
  }));

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Open New Account
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select an existing customer and choose the account type.
        </p>
      </div>

      {/* Step 1 */}
      <Card title="Step 1 — Select customer">
        {loadingCustomers ? (
          <LoadingSpinner message="Loading customers…" />
        ) : customers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No customers found. Customers can register at{' '}
            <span className="font-mono text-xs">/register</span>.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email or phone…"
                value={search}
                onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600"
              />
            </div>

            {/* Selected badge */}
            {selectedCustomer && (
              <div className={`flex items-center justify-between p-3 rounded-lg
                ${THEME.primaryLight} border ${THEME.primaryLightBorder}`}>
                <div>
                  <p className={`text-sm font-semibold ${THEME.primaryText}`}>
                    {selectedCustomer.fullName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedCustomer.email} · {selectedCustomer.phone}
                  </p>
                </div>
                <Check className={`w-5 h-5 ${THEME.primaryText}`} />
              </div>
            )}

            {/* Dropdown — z-10 sits above the outside-click overlay */}
            {dropdownOpen && (
              <div className="relative z-10 border border-gray-200 rounded-lg
                overflow-hidden shadow-sm max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">
                    No customers match your search.
                  </p>
                ) : (
                  filtered.map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setSearch(customer.fullName);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50
                        last:border-0 hover:bg-gray-50 transition-colors
                        flex items-center justify-between
                        ${selectedCustomer?.id === customer.id ? THEME.primaryLight : ''}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {customer.email} · {customer.phone}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                        ${customer.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'}`}>
                        {customer.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Outside-click overlay — z-0 stays behind the dropdown */}
            {dropdownOpen && (
              <div
                className="fixed inset-0 z-0"
                onClick={() => setDropdownOpen(false)}
              />
            )}
          </div>
        )}
      </Card>

      {/* Step 2 */}
      <Card title="Step 2 — Account details">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Account type"
            name="accountType"
            options={accountTypeOptions}
            register={register}
            error={errors.accountType?.message}
          />
          <Input
            label="Initial deposit (₹)"
            name="initialDeposit"
            type="number"
            step="0.01"
            min="0"
            register={register}
            error={errors.initialDeposit?.message}
            placeholder="0.00"
            hint="Amount to credit immediately on account opening."
          />

          {selectedCustomer && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600
              space-y-1 border border-gray-100">
              <p><span className="font-medium">Customer:</span> {selectedCustomer.fullName}</p>
              <p><span className="font-medium">Email:</span> {selectedCustomer.email}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!selectedCustomer}
            className="w-full"
            size="lg"
          >
            Open Account
          </Button>

          {!selectedCustomer && (
            <p className="text-xs text-center text-gray-400">
              Select a customer above to continue.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
};