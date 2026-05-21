// src/services/accountService.js
// No orderBy() alongside where() — sorts in JavaScript to avoid composite indexes.

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';
import { BANK_ID, BANK_IFSC } from '../config/constants';
import { generateAccountNumber } from '../utils/formatters';

const byCreatedAtDesc = (a, b) =>
  (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);

// ── Customers ─────────────────────────────────────────────────────────────────

export const createCustomer = async (data) => {
  const ref = await addDoc(collection(privateDb, 'customers'), {
    ...data,
    bankId:    BANK_ID,
    status:    'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getCustomer = async (customerId) => {
  const snap = await getDoc(doc(privateDb, 'customers', customerId));
  if (!snap.exists()) throw new Error('Customer not found');
  return { id: snap.id, ...snap.data() };
};

export const getAllCustomers = async () => {
  const q    = query(collection(privateDb, 'customers'), where('bankId', '==', BANK_ID));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc);
};

// ── Accounts ──────────────────────────────────────────────────────────────────

export const createAccount = async ({ customerId, accountType, initialDepositPaise = 0 }) => {
  const customer = await getCustomer(customerId);
  const accountNumber = generateAccountNumber();

  const ref = await addDoc(collection(privateDb, 'accounts'), {
    customerId,
    customerName:  customer.fullName,
    accountNumber,
    accountType,
    bankId:    BANK_ID,
    ifscCode:  BANK_IFSC,
    balance:   initialDepositPaise,
    status:    'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: ref.id, accountNumber };
};

export const getAccount = async (accountId) => {
  const snap = await getDoc(doc(privateDb, 'accounts', accountId));
  if (!snap.exists()) throw new Error('Account not found');
  return { id: snap.id, ...snap.data() };
};

export const getAccountByNumber = async (accountNumber) => {
  const q    = query(
    collection(privateDb, 'accounts'),
    where('accountNumber', '==', accountNumber),
    where('bankId', '==', BANK_ID),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const getAccountsByCustomer = async (customerId) => {
  const q    = query(collection(privateDb, 'accounts'), where('customerId', '==', customerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc);
};

// Staff: all accounts in this bank
export const getAllAccounts = async () => {
  const q    = query(collection(privateDb, 'accounts'), where('bankId', '==', BANK_ID));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc);
};

// Customer: only their own accounts (by uid = customerId)
export const getMyAccounts = async (uid) => {
  return getAccountsByCustomer(uid);
};

export const updateAccountStatus = async (accountId, status) => {
  await updateDoc(doc(privateDb, 'accounts', accountId), {
    status,
    updatedAt: serverTimestamp(),
  });
};
