// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { privateAuth, privateDb } from '../config/firebasePrivate';
import { hubAuth }                from '../config/firebaseHub';
import { HUB_BANK_EMAIL, HUB_BANK_PASSWORD, BANK_ID } from '../config/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,         setUser]         = useState(null);
  const [userType,     setUserType]     = useState(null);
  const [staffData,    setStaffData]    = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [loading,      setLoading]      = useState(true);

  const signInToHub = async () => {
    try {
      await signInWithEmailAndPassword(hubAuth, HUB_BANK_EMAIL, HUB_BANK_PASSWORD);
    } catch (err) {
      console.warn('[HUB AUTH] Hub sign-in failed:', err.message);
    }
  };

  const loadProfile = async (firebaseUser) => {
    const uid = firebaseUser.uid;

    const staffSnap = await getDoc(doc(privateDb, 'staff', uid));
    if (staffSnap.exists()) {
      const staff = staffSnap.data();
      if (!staff.isActive) { await signOut(privateAuth); throw new Error('Your account has been deactivated.'); }
      setStaffData({ uid, ...staff });
      setCustomerData(null);
      setUserType('staff');
      setUser(firebaseUser);
      return;
    }

    const customerSnap = await getDoc(doc(privateDb, 'customers', uid));
    if (customerSnap.exists()) {
      setCustomerData({ uid, ...customerSnap.data() });
      setStaffData(null);
      setUserType('customer');
      setUser(firebaseUser);
      return;
    }

    await signOut(privateAuth);
    throw new Error('No account record found.');
  };

  // Refresh customer data (called after KYC submission to update kycStatus)
  const refreshCustomer = useCallback(async () => {
    if (!user || userType !== 'customer') return;
    const snap = await getDoc(doc(privateDb, 'customers', user.uid));
    if (snap.exists()) setCustomerData({ uid: user.uid, ...snap.data() });
  }, [user, userType]);

  const signIn = async (email, password) => {
    const credential = await signInWithEmailAndPassword(privateAuth, email, password);
    await loadProfile(credential.user);
    await signInToHub();
    return credential.user;
  };

  const signUp = async ({ fullName, email, password, phone }) => {
    const credential = await createUserWithEmailAndPassword(privateAuth, email, password);
    const uid = credential.user.uid;

    const customerDoc = {
      uid, fullName, email, phone,
      bankId:    BANK_ID,
      status:    'active',
      kycStatus: 'not_submitted',   // KYC starts as not submitted
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(privateDb, 'customers', uid), customerDoc);

    setCustomerData({ uid, ...customerDoc });
    setStaffData(null);
    setUserType('customer');
    setUser(credential.user);
    await signInToHub();
    return credential.user;
  };

  const logout = async () => {
    await Promise.all([signOut(privateAuth), signOut(hubAuth).catch(() => {})]);
    setUser(null);
    setUserType(null);
    setStaffData(null);
    setCustomerData(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(privateAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await loadProfile(firebaseUser);
          await signInToHub();
        } catch (err) {
          console.error('Profile load failed:', err.message);
          setUser(null); setUserType(null); setStaffData(null); setCustomerData(null);
        }
      } else {
        setUser(null); setUserType(null); setStaffData(null); setCustomerData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user, userType, staffData, customerData,
    isStaff:    userType === 'staff',
    isCustomer: userType === 'customer',
    role:       staffData?.role ?? null,
    isAdmin:    staffData?.role === 'admin',
    isManager:  ['manager', 'admin'].includes(staffData?.role),
    isTeller:   ['teller', 'manager', 'admin'].includes(staffData?.role),
    displayName: staffData?.name ?? customerData?.fullName ?? 'User',
    kycStatus:  customerData?.kycStatus ?? 'not_submitted',
    loading,
    signIn, signUp, logout, refreshCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
