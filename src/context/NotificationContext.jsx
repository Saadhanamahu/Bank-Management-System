// src/context/NotificationContext.jsx
// Manages:
//  • Incoming transfer listener (Bank B receives money)
//  • Outgoing status listener (Bank A tracks sent transfer status)
//  • Private DB notifications listener (staff alerts)
//  • Unread count badge in the header
//  • react-hot-toast popups

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { privateDb } from '../config/firebasePrivate';
import { startIncomingListener, startStatusListener } from '../services/hubService';
import { paiseToRupees } from '../utils/formatters';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  // Track unsubscribe functions so we can clean up on logout
  const unsubRefs = useRef([]);

  const clearListeners = () => {
    unsubRefs.current.forEach(fn => fn?.());
    unsubRefs.current = [];
  };

  useEffect(() => {
    if (!user) {
      clearListeners();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // ── 1. Private notifications collection listener ───────────────────────
    // No orderBy alongside where — avoids composite index requirement.
    // Sorting is done in JS.
    const notifQ = query(
      collection(privateDb, 'notifications'),
      where('isRead', '==', false),
    );
    const unsubNotif = onSnapshot(notifQ, (snap) => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setNotifications(docs);
      setUnreadCount(docs.length);
    });
    unsubRefs.current.push(unsubNotif);

    // ── 2. Incoming interbank transfer listener (Bank B role) ─────────────
    // When money arrives from another bank, show a credit toast.
    const unsubIncoming = startIncomingListener(
      (transfer) => {
        toast.success(
          `💰 Received ${paiseToRupees(transfer.amount)} from ${transfer.fromBankId.toUpperCase()} via ${transfer.mode.toUpperCase()}`,
          { duration: 8000, id: transfer.transferId },
        );
      },
      (transfer, err) => {
        if (transfer) {
          toast.error(`Transfer ${transfer.transferId?.slice(0, 8)} failed: ${err.message}`, {
            duration: 10000,
          });
        }
      },
    );
    unsubRefs.current.push(unsubIncoming);

    // ── 3. Outgoing status listener (Bank A role) ─────────────────────────
    // When a transfer we sent gets completed/failed by the destination bank.
    const unsubStatus = startStatusListener((transfer) => {
      if (transfer.status === 'completed') {
        toast.success(
          `✅ Transfer ${transfer.transferId.slice(0, 8)}… completed — ${paiseToRupees(transfer.amount)} delivered.`,
          { duration: 6000 },
        );
      } else if (transfer.status === 'failed') {
        toast.error(
          `❌ Transfer ${transfer.transferId.slice(0, 8)}… failed: ${transfer.failureReason ?? 'Unknown reason'}`,
          { duration: 10000 },
        );
      }
    });
    unsubRefs.current.push(unsubStatus);

    return clearListeners;
  }, [user]);

  const markAllRead = async () => {
    await Promise.all(
      notifications.map(n => updateDoc(doc(privateDb, 'notifications', n.id), { isRead: true })),
    );
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
