// src/components/ui/index.jsx
// All reusable UI primitives in one file for simplicity.
// Theme classes come from constants.js THEME object (safelisted in tailwind.config.js).

import { THEME } from '../../config/constants';

// ── Button ────────────────────────────────────────────────────────────────────

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary:   `${THEME.primary} ${THEME.primaryHover} text-white ${THEME.primaryRing}`,
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
    danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost:     `bg-transparent ${THEME.primaryText} hover:${THEME.primaryLight} focus:ring-gray-300`,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ── Input ─────────────────────────────────────────────────────────────────────

export const Input = ({
  label,
  name,
  error,
  hint,
  type = 'text',
  className = '',
  register,
  ...props
}) => {
  const inputCls = `w-full border rounded-lg px-3 py-2 text-sm text-gray-900
    placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors
    ${error
      ? 'border-red-400 focus:ring-red-400 bg-red-50'
      : `border-gray-300 focus:ring-${THEME.primaryRing.split('-')[2]}-500 focus:border-${THEME.primaryBorder.split('-')[1]}-600 bg-white`
    } ${className}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={name}
        type={type}
        className={inputCls}
        {...(register ? register(name) : {})}
        {...props}
      />
      {hint  && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

// ── Select ────────────────────────────────────────────────────────────────────

export const Select = ({ label, name, error, options = [], register, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label htmlFor={name} className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      id={name}
      className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white
        focus:outline-none focus:ring-2 transition-colors
        ${error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}
        ${className}`}
      {...(register ? register(name) : {})}
      {...props}
    >
      {options.map(({ value, label: optLabel }) => (
        <option key={value} value={value}>{optLabel}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

// ── Badge ─────────────────────────────────────────────────────────────────────

export const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    gray:   'bg-gray-100 text-gray-700',
    green:  'bg-green-100 text-green-800',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue:   'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
};

// ── Card ──────────────────────────────────────────────────────────────────────

export const Card = ({ children, className = '', title, action }) => (
  <div className={`bg-white rounded-2xl border border-emerald-100 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-50">
        {title && <h2 className="font-semibold text-gray-900">{title}</h2>}
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);
// ── Stat card ─────────────────────────────────────────────────────────────────

export const StatCard = ({ label, value, sub, icon: Icon, colorClass = '' }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
    {Icon && (
      <div className={`p-2.5 rounded-lg ${colorClass || THEME.primaryLight}`}>
        <Icon className={`w-5 h-5 ${colorClass ? 'text-white' : THEME.primaryText}`} />
      </div>
    )}
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Loading spinner ───────────────────────────────────────────────────────────

export const LoadingSpinner = ({ message = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-gray-500">
    <svg className="animate-spin w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────

export const EmptyState = ({ message = 'Nothing here yet.', icon: Icon }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
    {Icon && <Icon className="w-10 h-10 opacity-40" />}
    <p className="text-sm">{message}</p>
  </div>
);
