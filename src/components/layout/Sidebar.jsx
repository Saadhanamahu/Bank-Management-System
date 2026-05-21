// src/components/layout/Sidebar.jsx

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRightLeft, Clock, CreditCard,
  Bell, Settings, LogOut, ShieldCheck, Landmark,
} from 'lucide-react';
import { BANK_NAME, THEME } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const SMBankIcon = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="white" fillOpacity="0.2"/>
    <path d="M12 30c0-4 4-6 8-4s8 2 8-2-4-6-8-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
    <path d="M14 34h20M24 18v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="24" cy="14" r="3" fill="white" opacity="0.9"/>
  </svg>
);

const staffNav = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/send-money',   label: 'Send Money',   icon: ArrowRightLeft },
  { to: '/transactions', label: 'Transactions', icon: Clock },
  { to: '/accounts',     label: 'Accounts',     icon: CreditCard },
  { to: '/loans',        label: 'Loans',        icon: Landmark },
  { to: '/notifications',label: 'Notifications',icon: Bell, badge: true },
];

const customerNav = [
  { to: '/dashboard',    label: 'My Dashboard', icon: LayoutDashboard },
  { to: '/kyc',          label: 'KYC Status',   icon: ShieldCheck },
  { to: '/send-money',   label: 'Send Money',   icon: ArrowRightLeft },
  { to: '/transactions', label: 'My Transfers', icon: Clock },
  { to: '/loans',        label: 'My Loans',     icon: Landmark },
  { to: '/notifications',label: 'Notifications',icon: Bell, badge: true },
];

export const Sidebar = ({ onClose }) => {
  const { isManager, isStaff, isCustomer, logout, staffData, customerData, kycStatus } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = isCustomer ? customerNav : staffNav;
  const label    = staffData?.name ?? customerData?.fullName ?? 'User';
  const sublabel = isCustomer ? 'Customer' : (staffData?.role ?? 'Staff');

  return (
    <div className="flex flex-col h-full bg-emerald-900 text-white w-64">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
        <SMBankIcon />
        <div>
          <p className="smbank-logo-text font-bold text-base leading-tight tracking-tight">{BANK_NAME}</p>
          <p className="text-xs text-emerald-300 opacity-80">Banking System</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-3 border-b border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Signed in as</p>
        <p className="text-sm font-medium truncate">{label}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 bg-white/15 rounded-full capitalize">{sublabel}</span>
          {isCustomer && (
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize
              ${kycStatus === 'approved'  ? 'bg-green-500/30 text-green-200'
              : kycStatus === 'pending'   ? 'bg-yellow-500/30 text-yellow-200'
              : kycStatus === 'rejected'  ? 'bg-red-500/30 text-red-200'
              : 'bg-white/10 text-white/50'}`}>
              KYC {kycStatus?.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label: navLabel, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
               ${isActive
                 ? 'bg-emerald-700 text-white font-medium shadow-sm'
                 : 'text-emerald-100 hover:bg-emerald-800 opacity-80 hover:opacity-100'}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {navLabel}
            {badge && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        {isStaff && isManager && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">Management</p>
            </div>
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                 ${isActive ? 'bg-emerald-700 text-white font-medium' : 'text-emerald-100 hover:bg-emerald-800 opacity-80 hover:opacity-100'}`
              }
            >
              <Settings className="w-4 h-4" />
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-emerald-100 hover:bg-emerald-800 opacity-70 hover:opacity-100 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};
