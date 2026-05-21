// src/utils/validators.js
import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  phone:    z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

// ── Send Money ────────────────────────────────────────────────────────────────

export const sendMoneySchema = z.object({
  fromAccountId:   z.string().min(1, 'Select a sender account'),
  toAccountNumber: z.string()
    .min(8,  'Account number must be at least 8 digits')
    .max(18, 'Account number too long')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  toBankId: z.string().min(1, 'Select destination bank'),
  amount:   z.string()
    .min(1, 'Amount is required')
    .refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be greater than 0')
    .refine(v => parseFloat(v) <= 1000000, 'Amount cannot exceed ₹10,00,000 per transaction'),
  mode:    z.enum(['imps', 'neft', 'internal'], { required_error: 'Select transfer mode' }),
  remarks: z.string().max(100, 'Remarks too long').optional(),
});

// ── Create Account (staff only) ───────────────────────────────────────────────

export const createAccountSchema = z.object({
  customerId:     z.string().min(1, 'Customer ID is required'),
  accountType:    z.enum(['savings', 'current', 'salary', 'fd']),
  initialDeposit: z.string()
    .min(1, 'Initial deposit is required')
    .refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Invalid amount'),
});

// ── Create Customer (staff-side) ──────────────────────────────────────────────

export const createCustomerSchema = z.object({
  fullName:     z.string().min(2, 'Full name must be at least 2 characters'),
  email:        z.string().email('Invalid email address'),
  phone:        z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  pan:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN (e.g. ABCDE1234F)'),
  aadhaarLast4: z.string().regex(/^\d{4}$/, 'Enter last 4 digits of Aadhaar'),
});

// ── Add Staff ─────────────────────────────────────────────────────────────────

export const addStaffSchema = z.object({
  name:     z.string().min(2, 'Name is required'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['teller', 'manager', 'admin'], { required_error: 'Select a role' }),
});
