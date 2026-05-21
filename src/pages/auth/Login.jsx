// src/pages/auth/Login.jsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { loginSchema } from '../../utils/validators';
import { BANK_NAME, BANK_ID, BANK_IFSC, THEME } from '../../config/constants';
import { Button, Input } from '../../components/ui';

const SMBankLogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="url(#smbank-grad)" />
    <path d="M12 30c0-4 4-6 8-4s8 2 8-2-4-6-8-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>
    <path d="M14 34h20M24 18v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="24" cy="14" r="3" fill="white" opacity="0.9"/>
    <defs>
      <linearGradient id="smbank-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#059669"/>
        <stop offset="1" stopColor="#064e3b"/>
      </linearGradient>
    </defs>
  </svg>
);

export const Login = () => {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname ?? '/dashboard';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message ?? 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-2/5 smbank-gradient flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <SMBankLogo size={40} />
          <span className="smbank-logo-text text-white text-xl tracking-tight">SMBank</span>
        </div>
        <p className="text-emerald-300 text-xs">
          IFSC: <span className="font-mono">{BANK_IFSC}</span> · ID: <span className="font-mono">{BANK_ID}</span>
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <SMBankLogo size={52} />
            <h1 className="smbank-logo-text text-2xl text-gray-900 mt-3">SMBank</h1>
            <p className="text-sm text-gray-500 mt-1">Banking Management System</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to your SMBank account</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Email address" name="email" type="email"
                placeholder="you@smbank.com" register={register} error={errors.email?.message} autoComplete="email" />
              <Input label="Password" name="password" type="password"
                placeholder="••••••••" register={register} error={errors.password?.message} autoComplete="current-password" />

              <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
                Sign in
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                New customer?{' '}
                <Link to="/register" className={`font-medium ${THEME.primaryText}`}>
                  Create an account
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} SMBank · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};
