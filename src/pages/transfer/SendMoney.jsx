// src/pages/transfer/SendMoney.jsx
// Works for both staff (sees all accounts) and customers (sees only their own accounts).

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowRightLeft, Info, CheckCircle, XCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendMoneySchema } from '../../utils/validators';
import { rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import { getTransferType, validateMode } from '../../utils/transferRouter';
import { intrabankTransfer, initiateInterbankTransfer } from '../../services/transactionService';
import { getAllAccounts, getMyAccounts, getAccountByNumber } from '../../services/accountService';
import { getAllBanks } from '../../services/hubService';
import { hubDb } from '../../config/firebaseHub';
import { BANK_ID, THEME } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Select, Card } from '../../components/ui';

const STATUS_ICON = {
  pending:   <Loader className="w-5 h-5 text-yellow-500 animate-spin" />,
  completed: <CheckCircle className="w-5 h-5 text-green-500" />,
  failed:    <XCircle className="w-5 h-5 text-red-500" />,
};

export const SendMoney = () => {
  const { isCustomer, customerData } = useAuth();
  const [myAccounts, setMyAccounts]  = useState([]);
  const [banks,      setBanks]       = useState([]);
  const [transferId, setTransferId]  = useState(null);
  const [hubStatus,  setHubStatus]   = useState(null);
  const [submitting, setSubmitting]  = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: { toBankId: BANK_ID, mode: 'imps' },
  });

  const watchedBankId = watch('toBankId');
  const watchedAmount = watch('amount');
  const transferType  = getTransferType(watchedBankId);

  // Load accounts — filtered by ownership for customers
  useEffect(() => {
    (async () => {
      const accs = isCustomer
        ? await getMyAccounts(customerData.uid)
        : await getAllAccounts();
      setMyAccounts(accs.filter(a => a.status === 'active'));

      const bankList  = await getAllBanks();
      const selfEntry = { id: BANK_ID, bankName: `Same bank (${BANK_ID})` };
      const others    = bankList
        .filter(b => b.bankId !== BANK_ID)
        .map(b => ({ id: b.bankId, bankName: b.bankName ?? b.bankId }));
      setBanks([selfEntry, ...others]);
    })();
  }, [isCustomer, customerData]);

  // Live hub status listener
  useEffect(() => {
    if (!transferId) return;
    const ref   = doc(hubDb, 'interbank_transfers', transferId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setHubStatus(snap.data().status);
    });
    return unsub;
  }, [transferId]);

  const onSubmit = async (data) => {
    const amountPaise = rupeesToPaise(data.amount);
    const modeCheck   = validateMode(data.toBankId, data.mode);

    if (!modeCheck.valid) { toast.error(modeCheck.reason); return; }

    setSubmitting(true);
    setTransferId(null);
    setHubStatus(null);

    try {
      if (transferType === 'intrabank') {
        const toAccount = await getAccountByNumber(data.toAccountNumber);
        if (!toAccount) { toast.error('Recipient account not found in this bank.'); return; }

        const txnId = await intrabankTransfer({
          fromAccountId: data.fromAccountId,
          toAccountId:   toAccount.id,
          amountPaise,
          mode:          'internal',
          remarks:       data.remarks,
        });
        toast.success(`Transfer complete. TXN: ${txnId.slice(0, 8)}…`);
        reset();
      } else {
        const txnId = await initiateInterbankTransfer({
          fromAccountId: data.fromAccountId,
          toAccountId:   data.toAccountNumber,
          toBankId:      data.toBankId,
          amountPaise,
          mode:          data.mode,
          remarks:       data.remarks,
        });
        setTransferId(txnId);
        toast.success('Transfer initiated. Waiting for destination bank…', { duration: 4000 });
      }
    } catch (err) {
      toast.error(err.message ?? 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const accountOptions = [
    { value: '', label: '— Select your account —' },
    ...myAccounts.map(a => ({
      value: a.id,
      label: `••••${a.accountNumber?.slice(-4)} — ${paiseToRupees(a.balance)}`,
    })),
  ];

  const bankOptions = [
    { value: '', label: '— Select destination bank —' },
    ...banks.map(b => ({ value: b.id, label: b.bankName ?? b.id })),
  ];

  const modeOptions = transferType === 'intrabank'
    ? [{ value: 'internal', label: 'Internal (same bank)' }]
    : [
        { value: 'imps', label: 'IMPS — Instant 24×7' },
        { value: 'neft', label: 'NEFT — Batch settlement' },
      ];

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          Send Money
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Same-bank transfers are instant. Other-bank transfers route through the shared hub.
        </p>
      </div>

      {myAccounts.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 text-center py-4">
            You have no active accounts to send from.
            {isCustomer && ' Please visit your branch to open an account.'}
          </p>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select label="From account" name="fromAccountId"
              options={accountOptions} register={register} error={errors.fromAccountId?.message} />

            <Select label="Destination bank" name="toBankId"
              options={bankOptions} register={register} error={errors.toBankId?.message} />

            {watchedBankId && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                ${transferType === 'intrabank'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                {transferType === 'intrabank'
                  ? 'Same bank — instant settlement, no hub involved.'
                  : 'Different bank — routes via shared Firebase hub.'}
              </div>
            )}

            <Input label="Recipient account number" name="toAccountNumber"
              placeholder="123456789012" register={register} error={errors.toAccountNumber?.message}
              hint="Full account number (8–18 digits)" />

            <Input label="Amount (₹)" name="amount" type="number" step="0.01" min="1"
              placeholder="0.00" register={register} error={errors.amount?.message}
              hint={watchedAmount ? `= ${paiseToRupees(rupeesToPaise(watchedAmount))}` : undefined} />

            <Select label="Transfer mode" name="mode"
              options={modeOptions} register={register} error={errors.mode?.message} />

            <Input label="Remarks (optional)" name="remarks"
              placeholder="Salary, rent, etc." register={register} error={errors.remarks?.message} />

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              {submitting ? 'Processing…' : 'Send Money'}
            </Button>
          </form>
        </Card>
      )}

      {/* Live status tracker */}
      {transferId && (
        <Card title="Transfer status">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 font-mono text-xs">ID: {transferId.slice(0, 16)}…</span>
              <div className="flex items-center gap-2 font-medium capitalize">
                {STATUS_ICON[hubStatus ?? 'pending']}
                {hubStatus ?? 'pending'}
              </div>
            </div>
            <ol className="space-y-2 mt-3">
              {[
                { label: 'Balance deducted',              done: true },
                { label: 'Transfer sent to hub',          done: true },
                { label: 'Destination bank processing',   done: hubStatus !== null && hubStatus !== 'pending' },
                { label: 'Settlement complete',           done: hubStatus === 'completed' },
              ].map(({ label, done }, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0
                    ${done ? THEME.primary : 'bg-gray-200'}`}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={done ? 'text-gray-800 font-medium' : 'text-gray-400'}>{label}</span>
                </li>
              ))}
            </ol>
            {hubStatus === 'failed' && (
              <p className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded-lg">
                Transfer failed at destination. Your balance will be reviewed — contact support.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
