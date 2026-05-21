import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { registerSchema } from '../../utils/validators';
import { BANK_NAME, BANK_IFSC, THEME } from '../../config/constants';
import { Button, Input } from '../../components/ui';

const SMBankLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="url(#smbank-grad-reg)" />
    <path d="M12 30c0-4 4-6 8-4s8 2 8-2-4-6-8-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>
    <path d="M14 34h20M24 18v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="24" cy="14" r="3" fill="white" opacity="0.9"/>
    <defs>
      <linearGradient id="smbank-grad-reg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#059669"/>
        <stop offset="1" stopColor="#064e3b"/>
      </linearGradient>
    </defs>
  </svg>
);

export const Register = () => {
  const { signUp } = useAuth();
  const navigate   = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      await signUp(data);
      toast.success('Account created! Please submit your KYC documents to continue.');
      navigate('/kyc');
    } catch (err) {
      toast.error(err.message ?? 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <SMBankLogo size={52} />
          <h1 className="smbank-logo-text text-2xl text-gray-900 mt-3">{BANK_NAME}</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Register', 'KYC', 'Account active'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                ${i === 0 ? `${THEME.primary} text-white` : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{step}</span>
              {i < 2 && <span className="text-gray-300 text-xs">→</span>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Create your account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full name"
              name="fullName"
              register={register}
              error={errors.fullName?.message}
              placeholder="Arjun Kumar"
            />
            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="you@smbank.com"
              register={register}
              error={errors.email?.message}
              autoComplete="email"
            />
            <Input
              label="Phone number (10 digits)"
              name="phone"
              type="tel"
              placeholder="9876543210"
              register={register}
              error={errors.phone?.message}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              register={register}
              error={errors.password?.message}
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              register={register}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
              Create account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already a customer?{' '}
              <Link to="/login" className={`font-medium ${THEME.primaryText}`}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          IFSC: <span className="font-mono">{BANK_IFSC}</span> · © {new Date().getFullYear()} SMBank
        </p>
      </div>
    </div>
  );
};