// src/services/kycService.js
// Handles KYC submission, review, and approval workflow.
// KYC doc uses the customer's UID as the document ID — easy one-to-one lookup.

import {
  doc, setDoc, updateDoc, getDoc, getDocs,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';

// ── Customer: submit KYC ──────────────────────────────────────────────────────
export const submitKYC = async (uid, data) => {
  // Use uid as doc ID — one KYC per customer, easy to look up
  await setDoc(doc(privateDb, 'kyc', uid), {
    customerId:      uid,
    fullName:        data.fullName,
    pan:             data.pan,
    aadhaarLast4:    data.aadhaarLast4,
    dob:             data.dob,
    address:         data.address,
    docType:         data.docType,
    status:          'pending',
    submittedAt:     serverTimestamp(),
    reviewedAt:      null,
    reviewedBy:      null,
    rejectionReason: null,
  });

  // Update customer document with KYC status
  await updateDoc(doc(privateDb, 'customers', uid), {
    kycStatus:  'pending',
    updatedAt:  serverTimestamp(),
  });
};

// ── Get KYC for a specific customer ──────────────────────────────────────────
export const getKYC = async (uid) => {
  const snap = await getDoc(doc(privateDb, 'kyc', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ── Admin: get all pending KYC requests ───────────────────────────────────────
export const getPendingKYC = async () => {
  const q    = query(collection(privateDb, 'kyc'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ── Admin: get all approved KYC ──────────────────────────────────────────────
export const getApprovedKYC = async () => {
  const q    = query(collection(privateDb, 'kyc'), where('status', '==', 'approved'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ── Admin: approve KYC ───────────────────────────────────────────────────────
export const approveKYC = async (customerId, staffUid) => {
  await updateDoc(doc(privateDb, 'kyc', customerId), {
    status:     'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: staffUid,
  });
  await updateDoc(doc(privateDb, 'customers', customerId), {
    kycStatus:  'approved',
    updatedAt:  serverTimestamp(),
  });
};

// ── Admin: reject KYC ────────────────────────────────────────────────────────
export const rejectKYC = async (customerId, staffUid, reason) => {
  await updateDoc(doc(privateDb, 'kyc', customerId), {
    status:          'rejected',
    reviewedAt:      serverTimestamp(),
    reviewedBy:      staffUid,
    rejectionReason: reason,
  });
  await updateDoc(doc(privateDb, 'customers', customerId), {
    kycStatus:  'rejected',
    updatedAt:  serverTimestamp(),
  });
};
