// src/utils/transferRouter.js
// Determines transfer type (intrabank / interbank) and validates mode choice.

import { BANK_ID, TRANSFER_MODES } from '../config/constants';

/**
 * Given a destination bankId, determine if this is an intrabank or interbank transfer.
 */
export const getTransferType = (toBankId) => {
  return toBankId === BANK_ID ? 'intrabank' : 'interbank';
};

/**
 * Validate that the chosen mode is appropriate for the transfer type.
 * Intrabank transfers must use 'internal'.
 * Interbank transfers must use 'imps' or 'neft'.
 */
export const validateMode = (toBankId, mode) => {
  const type = getTransferType(toBankId);

  if (type === 'intrabank' && mode !== TRANSFER_MODES.INTERNAL) {
    return { valid: false, reason: 'Use Internal mode for same-bank transfers.' };
  }
  if (type === 'interbank' && mode === TRANSFER_MODES.INTERNAL) {
    return { valid: false, reason: 'Use IMPS or NEFT for transfers to other banks.' };
  }
  return { valid: true };
};

/**
 * Suggest the best mode based on amount and time.
 * IMPS: instant, 24×7, up to ₹5,00,000
 * NEFT: batch, Mon–Sat 8am–7pm, no upper limit (for large transfers)
 */
export const suggestMode = (toBankId, amountInPaise) => {
  if (toBankId === BANK_ID) return TRANSFER_MODES.INTERNAL;

  const amountInRupees = amountInPaise / 100;
  const hour = new Date().getHours();
  const day  = new Date().getDay(); // 0=Sun, 6=Sat

  // NEFT business hours: Mon–Sat 8am–7pm
  const neftAvailable = day >= 1 && day <= 6 && hour >= 8 && hour < 19;

  if (amountInRupees > 500000 && neftAvailable) {
    return TRANSFER_MODES.NEFT;
  }
  return TRANSFER_MODES.IMPS;
};

/**
 * Return a human-readable description of the transfer.
 */
export const transferSummary = (type, mode, amountInPaise) => {
  const rupees = (amountInPaise / 100).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR',
  });

  if (type === 'intrabank') {
    return `Internal transfer of ${rupees} within ${BANK_ID}.`;
  }
  return `${mode.toUpperCase()} transfer of ${rupees} to another bank via shared hub.`;
};
