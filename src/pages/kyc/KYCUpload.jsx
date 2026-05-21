// src/pages/kyc/KYCUpload.jsx
// Customer fills in their KYC details after registration.
// Admin reviews and approves before an account can be opened.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { submitKYC, getKYC } from '../../services/kycService';
import { THEME } from '../../config/constants';
import { Button, Input, Select, Card, LoadingSpinner } from '../../components/ui';

const kycSchema = z.object({
  fullName:     z.string().min(2, 'Full name required'),
  pan:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN (e.g. ABCDE1234F)'),
  aadhaarLast4: z.string().regex(/^\d{4}$/, 'Enter last 4 digits of Aadhaar'),
  dob:          z.string().min(1, 'Date of birth required'),
  address:      z.string().min(10, 'Enter your full address'),
  docType:      z.enum(['aadhaar', 'pan', 'passport', 'driving_license'], {
    required_error: 'Select a document type',
  }),
});

const STATUS_CONFIG = {
  pending: {
    icon:    <Clock className="w-10 h-10 text-yellow-500" />,
    title:   'KYC under review',
    message: 'Your documents have been submitted. Our team will review and approve your account within 1–2 business days.',
    color:   'bg-yellow-50 border-yellow-200',
  },
  approved: {
    icon:    <CheckCircle className="w-10 h-10 text-green-500" />,
    title:   'KYC approved!',
    message: 'Your identity has been verified. Your bank account will be set up shortly. You will see it on your dashboard once opened.',
    color:   'bg-green-50 border-green-200',
  },
  rejected: {
    icon:    <XCircle className="w-10 h-10 text-red-500" />,
    title:   'KYC rejected',
    message: null, // shows rejectionReason
    color:   'bg-red-50 border-red-200',
  },
};

export const KYCUpload = () => {
  const { user, customerData, refreshCustomer } = useAuth();
  const navigate  = useNavigate();
  const [kyc,     setKyc]     = useState(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(kycSchema),
    defaultValues: { fullName: customerData?.fullName ?? '', docType: 'aadhaar' },
  });

  useEffect(() => {
    if (!user) return;
    getKYC(user.uid).then(setKyc).finally(() => setLoading(false));
  }, [user]);

  const onSubmit = async (data) => {
    try {
      await submitKYC(user.uid, data);
      toast.success('KYC submitted successfully! We will review it shortly.');
      const updated = await getKYC(user.uid);
      setKyc(updated);
      refreshCustomer?.();
    } catch (err) {
      toast.error(err.message ?? 'Submission failed.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading KYC status…" />;

  // Already submitted — show status
  if (kyc) {
    const cfg = STATUS_CONFIG[kyc.status] ?? STATUS_CONFIG.pending;
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          KYC Verification
        </h1>

        <div className={`rounded-2xl border p-8 text-center space-y-4 ${cfg.color}`}>
          <div className="flex justify-center">{cfg.icon}</div>
          <h2 className="text-lg font-bold text-gray-900">{cfg.title}</h2>
          <p className="text-sm text-gray-600">
            {cfg.message ?? kyc.rejectionReason ?? 'Your KYC was not approved.'}
          </p>
        </div>

        {/* Submitted details */}
        <Card title="Submitted details">
          <div className="space-y-2 text-sm">
            {[
              ['Name',     kyc.fullName],
              ['PAN',      kyc.pan],
              ['Aadhaar',  `••••••••${kyc.aadhaarLast4}`],
              ['DOB',      kyc.dob],
              ['Doc type', kyc.docType?.replace('_', ' ')],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-500 capitalize">{label}</span>
                <span className="text-gray-800 font-medium">{val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Allow resubmission if rejected */}
        {kyc.status === 'rejected' && (
          <Card title="Resubmit KYC">
            <p className="text-sm text-gray-600 mb-4">
              Reason: <span className="text-red-600 font-medium">{kyc.rejectionReason}</span>
            </p>
            <Button
              size="sm"
              onClick={() => setKyc(null)}
            >
              <RefreshCw className="w-4 h-4" />
              Resubmit documents
            </Button>
          </Card>
        )}

        {kyc.status === 'approved' && (
          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            Go to dashboard
          </Button>
        )}
      </div>
    );
  }

  // Not yet submitted — show form
  const docTypeOptions = [
    { value: 'aadhaar',         label: 'Aadhaar Card' },
    { value: 'pan',             label: 'PAN Card' },
    { value: 'passport',        label: 'Passport' },
    { value: 'driving_license', label: 'Driving License' },
  ];

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          KYC Verification
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Submit your identity documents for verification. Once approved, your bank account will be opened.
        </p>
      </div>

      {/* Info banner */}
      <div className={`flex gap-3 p-4 rounded-xl ${THEME.primaryLight} border ${THEME.primaryLightBorder}`}>
        <ShieldCheck className={`w-5 h-5 ${THEME.primaryText} flex-shrink-0 mt-0.5`} />
        <div className="text-sm">
          <p className={`font-semibold ${THEME.primaryText}`}>Your data is safe</p>
          <p className="text-gray-600 mt-0.5">
            We only store the last 4 digits of your Aadhaar. All information is encrypted and stored securely in your bank's private database.
          </p>
        </div>
      </div>

      <Card title="Personal details">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full name (as per documents)"
            name="fullName"
            placeholder="Ananya Sharma"
            register={register}
            error={errors.fullName?.message}
          />
          <Input
            label="PAN number"
            name="pan"
            placeholder="ABCDE1234F"
            register={register}
            error={errors.pan?.message}
            className="uppercase"
          />
          <Input
            label="Aadhaar — last 4 digits only"
            name="aadhaarLast4"
            placeholder="5678"
            maxLength={4}
            register={register}
            error={errors.aadhaarLast4?.message}
            hint="We never store your full Aadhaar number."
          />
          <Input
            label="Date of birth"
            name="dob"
            type="date"
            register={register}
            error={errors.dob?.message}
          />
          <Input
            label="Residential address"
            name="address"
            placeholder="Flat 4B, 12 Main Street, Chennai 600001"
            register={register}
            error={errors.address?.message}
          />
          <Select
            label="Primary ID document type"
            name="docType"
            options={docTypeOptions}
            register={register}
            error={errors.docType?.message}
          />

          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            <ShieldCheck className="w-4 h-4" />
            Submit KYC
          </Button>
        </form>
      </Card>
    </div>
  );
};
