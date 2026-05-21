// src/utils/formatters.js

import { format, formatDistanceToNow } from 'date-fns';

// ── Currency ─────────────────────────────────────────────────────────────────

/**
 * Convert paise (integer) to a formatted INR string.
 * All balances are stored in paise to avoid floating-point errors.
 * 100 paise = ₹1
 */
export const paiseToRupees = (paise) => {
  if (typeof paise !== 'number') return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
};

/**
 * Convert rupees input (float string) to paise (integer) for storage.
 */
export const rupeesToPaise = (rupees) => {
  return Math.round(parseFloat(rupees) * 100);
};

// ── Dates ─────────────────────────────────────────────────────────────────────

/**
 * Format a Firestore Timestamp or JS Date for display.
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'dd MMM yyyy, HH:mm');
};

/**
 * Relative time (e.g. "3 minutes ago").
 */
export const timeAgo = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return formatDistanceToNow(date, { addSuffix: true });
};

// ── Account numbers ───────────────────────────────────────────────────────────

/**
 * Mask an account number for display — show only last 4 digits.
 */
export const maskAccount = (accountNumber) => {
  if (!accountNumber) return '••••';
  const str = String(accountNumber);
  return '•'.repeat(Math.max(0, str.length - 4)) + str.slice(-4);
};

/**
 * Generate a random 12-digit account number.
 */
export const generateAccountNumber = () => {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

// ── Transfer mode labels ──────────────────────────────────────────────────────

export const modeLabel = (mode) => {
  const labels = {
    internal: 'Internal',
    imps:     'IMPS',
    neft:     'NEFT',
  };
  return labels[mode] ?? mode?.toUpperCase() ?? '—';
};

// ── Transaction direction ─────────────────────────────────────────────────────

export const directionLabel = (direction) => {
  return direction === 'credit' ? 'Credit' : 'Debit';
};

export const directionColor = (direction) => {
  return direction === 'credit' ? 'text-green-600' : 'text-red-600';
};

export const directionSign = (direction) => {
  return direction === 'credit' ? '+' : '-';
};

// ── Status badge colors ───────────────────────────────────────────────────────

export const statusColor = (status) => {
  const map = {
    completed: 'bg-green-100 text-green-800',
    pending:   'bg-yellow-100 text-yellow-800',
    failed:    'bg-red-100 text-red-800',
    active:    'bg-green-100 text-green-800',
    inactive:  'bg-gray-100 text-gray-600',
    frozen:    'bg-blue-100 text-blue-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
};
