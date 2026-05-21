import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Landmark, Clock, CheckCircle, XCircle, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { applyLoan, getMyLoans, getAllLoans, approveLoan, rejectLoan } from '../../services/loanService';
import { getMyAccounts, getAllAccounts } from '../../services/accountService';
import { paiseToRupees, rupeesToPaise, formatDate } from '../../utils/formatters';
import { Card, Button, Input, Select, LoadingSpinner, EmptyState } from '../../components/ui';
import { THEME } from '../../config/constants';

const loanSchema = z.object({
  amount:     z.string().min(1, 'Amount required')
    .refine(v => parseFloat(v) >= 1000, 'Minimum loan amount is ₹1,000')
    .refine(v => parseFloat(v) <= 5000000, 'Maximum loan amount is ₹50,00,000'),
  purpose:    z.string().min(5, 'Please describe the purpose'),
  termMonths: z.string().min(1, 'Select loan term'),
});

const STATUS = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800',       icon: <XCircle className="w-3.5 h-3.5" /> },
};

export const Loans = () => {
  const { isCustomer, isAdmin, customerData, staffData } = useAuth();
  const [loans,        setLoans]        = useState([]);
  const [accounts,     setAccounts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [rejectingId,  setRejectingId]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveData,  setApproveData]  = useState({}); // loanId → accountId

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loanSchema),
    defaultValues: { termMonths: '12' },
  });

  const load = async () => {
    setLoading(true);
    try {
      if (isCustomer) {
        const [l, a] = await Promise.all([
          getMyLoans(customerData.uid),
          getMyAccounts(customerData.uid),
        ]);
        setLoans(l);
        setAccounts(a);
      } else {
        const [l, a] = await Promise.all([getAllLoans(), getAllAccounts()]);
        setLoans(l);
        setAccounts(a);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isCustomer, customerData]);

  const onApply = async (data) => {
    try {
      await applyLoan({
        customerId:   customerData.uid,
        customerName: customerData.fullName,
        amount:       rupeesToPaise(data.amount),
        purpose:      data.purpose,
        termMonths:   parseInt(data.termMonths),
      });
      toast.success('Loan application submitted!');
      reset();
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message ?? 'Failed to apply.');
    }
  };

  const onApprove = async (loanId) => {
    const accountId = approveData[loanId];
    if (!accountId) { toast.error('Select an account to disburse to.'); return; }
    try {
      await approveLoan(loanId, staffData.uid, accountId);
      toast.success('Loan approved and amount disbursed!');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onReject = async (loanId) => {
    if (!rejectReason.trim()) { toast.error('Enter a rejection reason.'); return; }
    try {
      await rejectLoan(loanId, staffData.uid, rejectReason);
      toast.success('Loan rejected.');
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const termOptions = [
    { value: '6',  label: '6 months' },
    { value: '12', label: '12 months' },
    { value: '24', label: '24 months' },
    { value: '36', label: '36 months' },
    { value: '60', label: '60 months' },
  ];

  if (loading) return <LoadingSpinner message="Loading loans…" />;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            {isCustomer ? 'My Loans' : 'Loan Applications'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isCustomer ? 'Apply and track your loan applications' : `${loans.length} total applications`}
          </p>
        </div>
        {isCustomer && (
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <PlusCircle className="w-4 h-4" />
            Apply for loan
          </Button>
        )}
      </div>

      {/* Application form */}
      {isCustomer && showForm && (
        <Card title="New Loan Application">
          <form onSubmit={handleSubmit(onApply)} className="space-y-4">
            <Input
              label="Loan amount (₹)"
              name="amount"
              type="number"
              min="1000"
              placeholder="50000"
              register={register}
              error={errors.amount?.message}
              hint="Min ₹1,000 · Max ₹50,00,000"
            />
            <Input
              label="Purpose"
              name="purpose"
              placeholder="e.g. Home renovation, Medical emergency"
              register={register}
              error={errors.purpose?.message}
            />
            <Select
              label="Loan term"
              name="termMonths"
              options={termOptions}
              register={register}
              error={errors.termMonths?.message}
            />
            <div className="flex gap-3">
              <Button type="submit" loading={isSubmitting} size="sm">
                Submit application
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Loans list */}
      {loans.length === 0 ? (
        <EmptyState icon={Landmark} message={isCustomer ? 'No loan applications yet.' : 'No loan applications.'} />
      ) : (
        <div className="space-y-4">
          {loans.map(loan => {
            const st = STATUS[loan.status] ?? STATUS.pending;
            const customerAccounts = accounts.filter(a =>
              isAdmin ? a.customerId === loan.customerId : true
            );

            return (
              <Card key={loan.id}>
                <div className="space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div>
                      {!isCustomer && (
                        <p className="text-sm font-semibold text-gray-900">{loan.customerName}</p>
                      )}
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">
                        {paiseToRupees(loan.amount)}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{loan.purpose}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.color}`}>
                      {st.icon}{st.label}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Term</p>
                      <p className="font-medium text-gray-800">{loan.termMonths} months</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Applied</p>
                      <p className="font-medium text-gray-800">{formatDate(loan.appliedAt)}</p>
                    </div>
                    {loan.reviewedAt && (
                      <div>
                        <p className="text-xs text-gray-400">Reviewed</p>
                        <p className="font-medium text-gray-800">{formatDate(loan.reviewedAt)}</p>
                      </div>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {loan.status === 'rejected' && loan.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      Reason: {loan.rejectionReason}
                    </p>
                  )}

                  {/* Admin actions */}
                  {isAdmin && loan.status === 'pending' && (
                    <div className="pt-3 border-t border-gray-100 space-y-3">
                      {rejectingId === loan.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Rejection reason…"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="danger" onClick={() => onReject(loan.id)}>
                              Confirm reject
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Disburse to account:</p>
                            <select
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              value={approveData[loan.id] ?? ''}
                              onChange={e => setApproveData(p => ({ ...p, [loan.id]: e.target.value }))}
                            >
                              <option value="">— Select account —</option>
                              {customerAccounts.map(a => (
                                <option key={a.id} value={a.id}>
                                  ••••{a.accountNumber?.slice(-4)} — {a.customerName} — {paiseToRupees(a.balance)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => onApprove(loan.id)}>
                              <CheckCircle className="w-4 h-4" />
                              Approve & disburse
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setRejectingId(loan.id)}>
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};