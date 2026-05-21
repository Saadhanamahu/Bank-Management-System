// src/pages/admin/AdminDashboard.jsx

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore';
import { Settings, Users, ShieldCheck, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { privateAuth, privateDb } from '../../config/firebasePrivate';
import { addStaffSchema } from '../../utils/validators';
import { BANK_ID, THEME } from '../../config/constants';
import { Button, Input, Select, Card, StatCard, LoadingSpinner } from '../../components/ui';
import { getAllAccounts } from '../../services/accountService';
import { getAllTransactions } from '../../services/transactionService';
import { getPendingKYC, getApprovedKYC, approveKYC, rejectKYC } from '../../services/kycService';
import { registerBankInHub } from '../../services/hubService';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';

export const AdminDashboard = () => {
  const { staffData } = useAuth();
  const [staff,        setStaff]        = useState([]);
  const [pendingKYC,   setPendingKYC]   = useState([]);
  const [approvedKYC,  setApprovedKYC]  = useState([]);
  const [stats,        setStats]        = useState({ accounts: 0, txns: 0 });
  const [loading,      setLoading]      = useState(true);
  const [expandedKYC,  setExpandedKYC]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId,  setRejectingId]  = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(addStaffSchema),
    defaultValues: { role: 'teller' },
  });

  useEffect(() => {
    (async () => {
      try {
        const [staffSnap, accs, txns, pending, approved] = await Promise.all([
          getDocs(query(collection(privateDb, 'staff'), where('bankId', '==', BANK_ID))),
          getAllAccounts(),
          getAllTransactions(),
          getPendingKYC(),
          getApprovedKYC(),
        ]);
        setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStats({ accounts: accs.length, txns: txns.length });
        setPendingKYC(pending);
        setApprovedKYC(approved);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addStaff = async (data) => {
    try {
      const credential = await createUserWithEmailAndPassword(privateAuth, data.email, data.password);
      await setDoc(doc(privateDb, 'staff', credential.user.uid), {
        uid:       credential.user.uid,
        name:      data.name,
        email:     data.email,
        role:      data.role,
        bankId:    BANK_ID,
        isActive:  true,
        createdAt: serverTimestamp(),
      });
      toast.success(`Staff member "${data.name}" added as ${data.role}.`);
      setStaff(prev => [...prev, { id: credential.user.uid, ...data, isActive: true }]);
      reset();
    } catch (err) {
      toast.error(err.message ?? 'Failed to add staff.');
    }
  };

  const handleApprove = async (customerId, customerName) => {
    try {
      await approveKYC(customerId, staffData.uid);
      toast.success(`KYC approved for ${customerName}. You can now open an account for them.`);
      setPendingKYC(prev => prev.filter(k => k.customerId !== customerId));
      const approved = await getApprovedKYC();
      setApprovedKYC(approved);
    } catch (err) {
      toast.error('Failed to approve: ' + err.message);
    }
  };

  const handleReject = async (customerId, customerName) => {
    if (!rejectReason.trim()) { toast.error('Enter a rejection reason.'); return; }
    try {
      await rejectKYC(customerId, staffData.uid, rejectReason);
      toast.success(`KYC rejected for ${customerName}.`);
      setPendingKYC(prev => prev.filter(k => k.customerId !== customerId));
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error('Failed to reject: ' + err.message);
    }
  };

  const syncHub = async () => {
    try { await registerBankInHub(); toast.success('Bank registered/updated in hub.'); }
    catch { toast.error('Hub sync failed.'); }
  };

  if (loading) return <LoadingSpinner />;

  const roleOptions = [
    { value: 'teller',  label: 'Teller' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin',   label: 'Admin' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">Bank: {BANK_ID.toUpperCase()}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total accounts"     value={stats.accounts}      icon={Users} />
        <StatCard label="Total transactions" value={stats.txns}          icon={Settings} />
        <StatCard label="Pending KYC"        value={pendingKYC.length}   icon={ShieldCheck} />
        <StatCard label="Staff members"      value={staff.length}        icon={Users} />
      </div>

      {/* ── Pending KYC Review ── */}
      <Card title={`Pending KYC (${pendingKYC.length})`}>
        {pendingKYC.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No pending KYC requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingKYC.map(kyc => (
              <div key={kyc.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedKYC(expandedKYC === kyc.id ? null : kyc.id)}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{kyc.fullName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted: {formatDate(kyc.submittedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                      Pending
                    </span>
                    {expandedKYC === kyc.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedKYC === kyc.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    {/* KYC fields */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ['PAN',          kyc.pan],
                        ['Aadhaar',      `••••••••${kyc.aadhaarLast4}`],
                        ['Date of birth',kyc.dob],
                        ['Doc type',     kyc.docType?.replace('_', ' ')],
                        ['Address',      kyc.address],
                      ].map(([label, val]) => (
                        <div key={label} className="col-span-2 sm:col-span-1">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                          <p className="text-sm text-gray-800 font-medium mt-0.5 capitalize">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    {rejectingId === kyc.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Reason for rejection…"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(kyc.customerId, kyc.fullName)}
                          >
                            <XCircle className="w-4 h-4" />
                            Confirm reject
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(kyc.customerId, kyc.fullName)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve KYC
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setRejectingId(kyc.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Approved customers (can create accounts for these) ── */}
      {approvedKYC.length > 0 && (
        <Card title={`Approved customers (${approvedKYC.length}) — ready for account opening`}>
          <div className="space-y-2">
            {approvedKYC.map(kyc => (
              <div key={kyc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{kyc.fullName}</p>
                  <p className="text-xs text-gray-400">Approved: {formatDate(kyc.reviewedAt)}</p>
                </div>
                <a
                  href="/accounts/new"
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg ${THEME.primary} text-white`}
                >
                  Open account
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Hub sync */}
      <Card title="Hub registration">
        <p className="text-sm text-gray-600 mb-3">
          Register or refresh this bank in the shared hub. Run once after initial setup.
        </p>
        <Button size="sm" variant="secondary" onClick={syncHub}>
          Sync bank to hub
        </Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add staff */}
        <Card title="Add staff member">
          <form onSubmit={handleSubmit(addStaff)} className="space-y-3">
            <Input label="Full name" name="name"     register={register} error={errors.name?.message}     placeholder="Jane Doe" />
            <Input label="Email"     name="email"    register={register} error={errors.email?.message}    placeholder="jane@bank.com" type="email" />
            <Input label="Password"  name="password" register={register} error={errors.password?.message} placeholder="Min 8 chars" type="password" />
            <Select label="Role"     name="role"     options={roleOptions} register={register} error={errors.role?.message} />
            <Button type="submit" loading={isSubmitting} size="sm" className="w-full">
              Add staff member
            </Button>
          </form>
        </Card>

        {/* Staff list */}
        <Card title="Current staff">
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${THEME.badge}`}>
                    {s.role}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'active' : 'inactive'}
                  </span>
                </div>
              </div>
            ))}
            {staff.length === 0 && <p className="text-sm text-gray-400">No staff yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};
