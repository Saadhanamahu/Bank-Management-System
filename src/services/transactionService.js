// src/services/transactionService.js
//
// ALL balance mutations use Firestore runTransaction() for atomicity.
// Interbank transfers use a two-phase approach:
//   Phase 1 → atomic deduction in private DB + local pending record
//   Phase 2 → write transfer request to shared hub Firestore
//
// Without Cloud Functions, Phase 1 and Phase 2 are NOT globally atomic.
// If Phase 2 fails, the local record is marked 'failed' for manual review.

import {
  doc, collection, runTransaction, setDoc, updateDoc, getDoc,
  serverTimestamp, query, where, getDocs,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';
import { hubDb }     from '../config/firebaseHub';
import { BANK_ID }   from '../config/constants';

// ── Intrabank transfer ────────────────────────────────────────────────────────
// Both accounts are in this bank's private DB → single runTransaction.

export const intrabankTransfer = async ({
  fromAccountId,
  toAccountId,
  amountPaise,
  mode = 'internal',
  remarks = '',
}) => {
  if (fromAccountId === toAccountId) throw new Error('Cannot transfer to the same account.');

  const fromRef   = doc(privateDb, 'accounts', fromAccountId);
  const toRef     = doc(privateDb, 'accounts', toAccountId);
  const debitRef  = doc(collection(privateDb, 'transactions'));
  const creditRef = doc(collection(privateDb, 'transactions'));

  await runTransaction(privateDb, async (txn) => {
    const [fromSnap, toSnap] = await Promise.all([txn.get(fromRef), txn.get(toRef)]);

    if (!fromSnap.exists()) throw new Error('Sender account not found.');
    if (!toSnap.exists())   throw new Error('Recipient account not found.');
    if (fromSnap.data().status !== 'active') throw new Error('Sender account is not active.');
    if (toSnap.data().status  !== 'active')  throw new Error('Recipient account is not active.');
    if (fromSnap.data().balance < amountPaise) throw new Error('Insufficient balance.');

    const now            = serverTimestamp();
    const newFromBalance = fromSnap.data().balance - amountPaise;
    const newToBalance   = toSnap.data().balance   + amountPaise;

    txn.update(fromRef, { balance: newFromBalance, updatedAt: now });
    txn.update(toRef,   { balance: newToBalance,   updatedAt: now });

    const base = {
      type: 'intrabank_transfer',
      fromAccountId, toAccountId,
      fromBankId: BANK_ID, toBankId: BANK_ID,
      amount: amountPaise, currency: 'INR',
      status: 'completed', mode, remarks,
      createdAt: now, completedAt: now,
    };
    txn.set(debitRef,  { ...base, transactionId: debitRef.id,  direction: 'debit'  });
    txn.set(creditRef, { ...base, transactionId: creditRef.id, direction: 'credit' });
  });

  return debitRef.id;
};

// ── Interbank transfer — Phase 1: deduct + local pending ─────────────────────

export const initiateInterbankTransfer = async ({
  fromAccountId,
  toAccountId,
  toBankId,
  amountPaise,
  mode,
  remarks = '',
}) => {
  const fromRef     = doc(privateDb, 'accounts', fromAccountId);
  const transferRef = doc(collection(privateDb, 'transactions'));
  const transferId  = transferRef.id;

  // Phase 1: atomic deduction in private DB
  await runTransaction(privateDb, async (txn) => {
    const fromSnap = await txn.get(fromRef);
    if (!fromSnap.exists()) throw new Error('Sender account not found.');
    if (fromSnap.data().status !== 'active') throw new Error('Account is not active.');
    if (fromSnap.data().balance < amountPaise) throw new Error('Insufficient balance.');

    txn.update(fromRef, {
      balance:   fromSnap.data().balance - amountPaise,
      updatedAt: serverTimestamp(),
    });
    txn.set(transferRef, {
      transactionId: transferId,
      type:          'interbank_transfer',
      direction:     'debit',
      fromAccountId,
      toAccountId,
      fromBankId:    BANK_ID,
      toBankId,
      amount:        amountPaise,
      currency:      'INR',
      status:        'pending',
      mode,
      remarks,
      createdAt:     serverTimestamp(),
      completedAt:   null,
      failureReason: null,
    });
  });

  // Phase 2: write to shared hub
  try {
    console.log('[TRANSFER] Writing to hub:', transferId, '→', toBankId);
    await setDoc(doc(hubDb, 'interbank_transfers', transferId), {
      transferId,
      fromBankId:    BANK_ID,
      toBankId,
      fromAccountId,
      toAccountId,   // this is the ACCOUNT NUMBER string — Bank B resolves it to a doc ID
      amount:        amountPaise,
      currency:      'INR',
      mode,
      status:        'pending',
      createdAt:     serverTimestamp(),
      completedAt:   null,
      failureReason: null,
    });
    console.log('[TRANSFER] Hub write success:', transferId);
  } catch (hubError) {
    console.error('[TRANSFER] Hub write FAILED:', hubError.code, hubError.message);
    await updateDoc(transferRef, {
      status:        'failed',
      failureReason: `Hub write failed: ${hubError.message}`,
      completedAt:   serverTimestamp(),
    });
    throw new Error(`Hub write failed: ${hubError.message}`);
  }

  return transferId;
};

// ── Process an incoming interbank transfer (called by Bank B's hub listener) ──
//
// CRITICAL FIX: toAccountId in the hub document is the ACCOUNT NUMBER string
// (e.g. "123456789012") that the sender typed into the Send Money form —
// NOT the Firestore document ID. We must resolve it first before crediting.

export const processIncomingTransfer = async (hubTransfer) => {
  const { transferId, fromBankId, fromAccountId, toAccountId, amount } = hubTransfer;

  const localRef = doc(privateDb, 'transactions', transferId);
  const hubRef   = doc(hubDb,     'interbank_transfers', transferId);

  // Step 1: Resolve account NUMBER → Firestore document ID
  console.log('[PROCESS] Resolving account number:', toAccountId);
  const acctSnap = await getDocs(
    query(collection(privateDb, 'accounts'), where('accountNumber', '==', toAccountId))
  );

  if (acctSnap.empty) {
    console.error('[PROCESS] Account number not found:', toAccountId);
    await updateDoc(hubRef, {
      status:        'failed',
      failureReason: `Recipient account number "${toAccountId}" not found in this bank.`,
      completedAt:   serverTimestamp(),
    });
    return;
  }

  const toDocId = acctSnap.docs[0].id;
  const toRef   = doc(privateDb, 'accounts', toDocId);
  console.log('[PROCESS] Resolved account doc ID:', toDocId, '— crediting', amount, 'paise');

  // Step 2: Atomic credit via runTransaction
  try {
    await runTransaction(privateDb, async (txn) => {
      const toSnap    = await txn.get(toRef);
      const localSnap = await txn.get(localRef);

      // Duplicate guard — transferId is the idempotency key
      if (localSnap.exists()) throw new Error('DUPLICATE');

      if (!toSnap.exists()) throw new Error('Recipient account not found.');
      if (toSnap.data().status !== 'active') throw new Error('Recipient account is not active.');

      const newBalance = toSnap.data().balance + amount;

      txn.update(toRef, { balance: newBalance, updatedAt: serverTimestamp() });

      // Store the resolved doc ID, not the account number
      txn.set(localRef, {
        transactionId: transferId,
        type:          'interbank_transfer',
        direction:     'credit',
        fromAccountId,
        toAccountId:   toDocId,
        fromBankId,
        toBankId:      BANK_ID,
        amount,
        currency:      'INR',
        status:        'completed',
        mode:          hubTransfer.mode,
        createdAt:     serverTimestamp(),
        completedAt:   serverTimestamp(),
        failureReason: null,
      });
    });

    await updateDoc(hubRef, { status: 'completed', completedAt: serverTimestamp() });
    console.log('[PROCESS] Transfer', transferId, 'completed — balance updated.');

  } catch (err) {
    if (err.message === 'DUPLICATE') {
      console.log('[PROCESS] Transfer', transferId, 'already processed — skipping.');
      return;
    }
    console.error('[PROCESS] Credit failed:', err.message);
    await updateDoc(hubRef, {
      status:        'failed',
      failureReason: err.message,
      completedAt:   serverTimestamp(),
    });
    throw err;
  }
};

// ── Sync local transaction status from hub update ─────────────────────────────

export const syncTransactionStatus = async (transferId, status, failureReason = null) => {
  const ref  = doc(privateDb, 'transactions', transferId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().direction !== 'debit') return; // only sync sender side
  await updateDoc(ref, {
    status,
    ...(failureReason && { failureReason }),
    completedAt: serverTimestamp(),
  });
};

// ── Read transactions from private DB ─────────────────────────────────────────

export const getTransactionsByAccount = async (accountId) => {
  const [debitSnap, creditSnap] = await Promise.all([
    getDocs(query(collection(privateDb, 'transactions'), where('fromAccountId', '==', accountId), where('direction', '==', 'debit'))),
    getDocs(query(collection(privateDb, 'transactions'), where('toAccountId',   '==', accountId), where('direction', '==', 'credit'))),
  ]);
  const map = new Map();
  [...debitSnap.docs, ...creditSnap.docs].forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
  return [...map.values()].sort((a, b) =>
    (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
  );
};

export const getAllTransactions = async () => {
  const snap = await getDocs(collection(privateDb, 'transactions'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
};
