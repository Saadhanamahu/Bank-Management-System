import {
  collection, doc, query, where, onSnapshot, getDocs,
  setDoc, serverTimestamp,
} from 'firebase/firestore';
import { hubDb }  from '../config/firebaseHub';
import { BANK_ID, BANK_NAME, BANK_IFSC } from '../config/constants';
import { processIncomingTransfer, syncTransactionStatus } from './transactionService';
 
// ── Incoming transfer listener ────────────────────────────────────────────────
// Uses ONE where clause only (toBankId) — no composite index needed.
// Status is checked in JavaScript so the query never fails due to missing index.
 
export const startIncomingListener = (onProcessed, onError) => {
  console.log(`[HUB LISTENER] Starting for bankId: ${BANK_ID}`);
 
  const q = query(
    collection(hubDb, 'interbank_transfers'),
    where('toBankId', '==', BANK_ID),   // single where — no composite index needed
  );
 
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    console.log(`[HUB LISTENER] Snapshot fired — ${snapshot.docChanges().length} change(s)`);
 
    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added' && change.type !== 'modified') continue;
 
      const transfer = { id: change.doc.id, ...change.doc.data() };
 
      // Filter status in JS — avoids needing composite index
      if (transfer.status !== 'pending') {
        console.log(`[HUB LISTENER] Skipping ${transfer.id.slice(0,8)} — status: ${transfer.status}`);
        continue;
      }
 
      console.log(`[HUB LISTENER] Processing transfer: ${transfer.id.slice(0,8)} amount: ${transfer.amount}`);
 
      try {
        await processIncomingTransfer(transfer);
        console.log(`[HUB LISTENER] ✓ Completed: ${transfer.id.slice(0,8)}`);
        onProcessed?.(transfer);
      } catch (err) {
        console.error(`[HUB LISTENER] ✗ Failed: ${transfer.id.slice(0,8)}`, err.message);
        onError?.(transfer, err);
      }
    }
  }, (err) => {
    console.error('[HUB LISTENER] onSnapshot error:', err.code, err.message);
    onError?.(null, err);
  });
 
  return unsubscribe;
};
 
// ── Outgoing status listener ──────────────────────────────────────────────────
// Uses ONE where clause only (fromBankId) — no composite index needed.
// Status filtered in JavaScript.
 
export const startStatusListener = (onStatusChange) => {
  console.log(`[HUB STATUS] Starting status listener for bankId: ${BANK_ID}`);
 
  const q = query(
    collection(hubDb, 'interbank_transfers'),
    where('fromBankId', '==', BANK_ID),  // single where — no composite index needed
  );
 
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added' && change.type !== 'modified') continue;
 
      const transfer = { id: change.doc.id, ...change.doc.data() };
 
      // Only care about completed or failed — filter in JS
      if (transfer.status === 'pending') continue;
 
      console.log(`[HUB STATUS] Transfer ${transfer.id.slice(0,8)} → ${transfer.status}`);
 
      try {
        await syncTransactionStatus(
          transfer.transferId ?? transfer.id,
          transfer.status,
          transfer.failureReason,
        );
        onStatusChange?.(transfer);
      } catch (err) {
        console.error('[HUB STATUS] Sync error:', err.message);
      }
    }
  }, (err) => {
    console.error('[HUB STATUS] onSnapshot error:', err.code, err.message);
  });
 
  return unsubscribe;
};
 
// ── Register this bank in the hub registry ────────────────────────────────────
 
export const registerBankInHub = async () => {
  try {
    await setDoc(doc(hubDb, 'banks', BANK_ID), {
      bankId:     BANK_ID,
      bankName:   BANK_NAME,
      ifscPrefix: BANK_IFSC.slice(0, 4),
      isActive:   true,
      updatedAt:  serverTimestamp(),
    }, { merge: true });
    console.log('[HUB] Bank registered:', BANK_ID);
  } catch (err) {
    console.warn('[HUB] Could not register bank:', err.message);
  }
};
 
// ── Register a public account routing entry ───────────────────────────────────
 
export const registerPublicAccount = async (accountId, accountNumber) => {
  const masked = '••••' + String(accountNumber).slice(-4);
  try {
    await setDoc(doc(hubDb, 'public_accounts', accountId), {
      accountId,
      bankId:              BANK_ID,
      maskedAccountNumber: masked,
      ifscCode:            BANK_IFSC,
      isActive:            true,
      registeredAt:        serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[HUB] Could not register public account:', err.message);
  }
};
 
// ── Fetch all registered banks ────────────────────────────────────────────────
 
export const getAllBanks = async () => {
  try {
    const snap = await getDocs(collection(hubDb, 'banks'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
};
 