import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';
import { BANK_ID }   from '../config/constants';

// Customer applies for a loan
export const applyLoan = async ({ customerId, customerName, amount, purpose, termMonths }) => {
  const ref = await addDoc(collection(privateDb, 'loans'), {
    customerId,
    customerName,
    bankId:      BANK_ID,
    amount,      // in paise
    purpose,
    termMonths,
    status:      'pending',
    appliedAt:   serverTimestamp(),
    reviewedAt:  null,
    reviewedBy:  null,
    rejectionReason: null,
    disbursedAt: null,
    accountId:   null,
  });
  return ref.id;
};

// Get loans for a specific customer
export const getMyLoans = async (customerId) => {
  const q    = query(collection(privateDb, 'loans'), where('customerId', '==', customerId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.appliedAt?.toMillis?.() ?? 0) - (a.appliedAt?.toMillis?.() ?? 0));
};

// Get all loans (admin)
export const getAllLoans = async () => {
  const q    = query(collection(privateDb, 'loans'), where('bankId', '==', BANK_ID));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.appliedAt?.toMillis?.() ?? 0) - (a.appliedAt?.toMillis?.() ?? 0));
};

export const getPendingLoans = async () => {
  const q    = query(
    collection(privateDb, 'loans'),
    where('bankId', '==', BANK_ID),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Admin approves — credits the amount to customer's account
export const approveLoan = async (loanId, staffUid, accountId) => {
  const loanRef  = doc(privateDb, 'loans', loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) throw new Error('Loan not found');

  const { amount } = loanSnap.data();
  const accRef     = doc(privateDb, 'accounts', accountId);
  const accSnap    = await getDoc(accRef);
  if (!accSnap.exists()) throw new Error('Account not found');

  // Credit loan amount to account
  await updateDoc(accRef, {
    balance:   accSnap.data().balance + amount,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(loanRef, {
    status:      'approved',
    reviewedAt:  serverTimestamp(),
    reviewedBy:  staffUid,
    disbursedAt: serverTimestamp(),
    accountId,
  });
};

// Admin rejects
export const rejectLoan = async (loanId, staffUid, reason) => {
  await updateDoc(doc(privateDb, 'loans', loanId), {
    status:          'rejected',
    reviewedAt:      serverTimestamp(),
    reviewedBy:      staffUid,
    rejectionReason: reason,
  });
};