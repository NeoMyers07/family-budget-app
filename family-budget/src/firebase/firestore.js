import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// Collections
const PAY_PERIODS = 'payPeriods';
const TRANSACTIONS = 'transactions';
const ACCOUNT_OVERRIDES = 'accountOverrides';
const INCOME_CONFIG = 'incomeConfig';
const INCOME_SOURCES = 'incomeSources';
const ONE_TIME_INCOME = 'oneTimeIncome';
const APP_CONFIG = 'appConfig';

// Pay Period functions
export async function createPayPeriod(payPeriod) {
  const docRef = await addDoc(collection(db, PAY_PERIODS), {
    ...payPeriod,
    startDate: Timestamp.fromDate(new Date(payPeriod.startDate)),
    endDate: Timestamp.fromDate(new Date(payPeriod.endDate)),
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updatePayPeriod(id, updates) {
  const docRef = doc(db, PAY_PERIODS, id);
  await updateDoc(docRef, updates);
}

export async function getPayPeriod(id) {
  const docRef = doc(db, PAY_PERIODS, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function getAllPayPeriods() {
  const q = query(collection(db, PAY_PERIODS), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function subscribeToPayPeriods(callback) {
  const q = query(collection(db, PAY_PERIODS), orderBy('startDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const payPeriods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(payPeriods);
  });
}

// Transaction functions
export async function addTransaction(transaction) {
  console.log('[Firestore] Adding transaction:', transaction);
  const docRef = await addDoc(collection(db, TRANSACTIONS), {
    ...transaction,
    createdAt: Timestamp.now()
  });
  console.log('[Firestore] Transaction added with ID:', docRef.id);
  return docRef.id;
}

export async function updateTransaction(id, updates) {
  const docRef = doc(db, TRANSACTIONS, id);
  await updateDoc(docRef, updates);
}

export async function deleteTransaction(id) {
  const docRef = doc(db, TRANSACTIONS, id);
  await deleteDoc(docRef);
}

export async function getTransactionsByPayPeriod(payPeriodId) {
  const q = query(
    collection(db, TRANSACTIONS),
    where('payPeriodId', '==', payPeriodId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function subscribeToTransactions(payPeriodId, callback) {
  // Track the current unsubscribe function
  let currentUnsubscribe = null;

  const setupFallbackSubscription = () => {
    console.log('[Firestore] Setting up fallback query without orderBy...');
    const fallbackQ = query(
      collection(db, TRANSACTIONS),
      where('payPeriodId', '==', payPeriodId)
    );
    currentUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side
      transactions.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      console.log('[Firestore] Fallback transactions loaded:', transactions.length);
      callback(transactions);
    }, (fallbackError) => {
      console.error('[Firestore] Fallback subscription error:', fallbackError);
    });
  };

  // Try the indexed query first
  const q = query(
    collection(db, TRANSACTIONS),
    where('payPeriodId', '==', payPeriodId),
    orderBy('createdAt', 'desc')
  );

  currentUnsubscribe = onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('[Firestore] Transactions loaded:', transactions.length, 'for payPeriod:', payPeriodId);
    callback(transactions);
  }, (error) => {
    console.error('[Firestore] Error subscribing to transactions:', error);
    // If index error, switch to fallback
    if (error.code === 'failed-precondition') {
      setupFallbackSubscription();
    }
  });

  // Return a function that unsubscribes from whichever subscription is active
  return () => {
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }
  };
}

// Account Override functions
export async function setAccountOverride(payPeriodId, account, overrideTotal) {
  const id = `${payPeriodId}_${account}`;
  const docRef = doc(db, ACCOUNT_OVERRIDES, id);
  await setDoc(docRef, {
    payPeriodId,
    account,
    overrideTotal,
    updatedAt: Timestamp.now()
  });
}

export async function clearAccountOverride(payPeriodId, account) {
  const id = `${payPeriodId}_${account}`;
  const docRef = doc(db, ACCOUNT_OVERRIDES, id);
  await deleteDoc(docRef);
}

export async function getAccountOverrides(payPeriodId) {
  const q = query(
    collection(db, ACCOUNT_OVERRIDES),
    where('payPeriodId', '==', payPeriodId)
  );
  const snapshot = await getDocs(q);
  const overrides = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    overrides[data.account] = data.overrideTotal;
  });
  return overrides;
}

export function subscribeToAccountOverrides(payPeriodId, callback) {
  const q = query(
    collection(db, ACCOUNT_OVERRIDES),
    where('payPeriodId', '==', payPeriodId)
  );
  return onSnapshot(q, (snapshot) => {
    const overrides = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      overrides[data.account] = data.overrideTotal;
    });
    callback(overrides);
  });
}

// Income Config functions
export async function getIncomeConfig() {
  const docRef = doc(db, INCOME_CONFIG, 'config');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export async function saveIncomeConfig(config) {
  const docRef = doc(db, INCOME_CONFIG, 'config');
  await setDoc(docRef, {
    ...config,
    ericNextPayDate: Timestamp.fromDate(new Date(config.ericNextPayDate)),
    jessicaNextPayDate: Timestamp.fromDate(new Date(config.jessicaNextPayDate)),
    updatedAt: Timestamp.now()
  });
}

export function subscribeToIncomeConfig(callback) {
  const docRef = doc(db, INCOME_CONFIG, 'config');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  });
}

// ============================================
// Income Sources functions (new flexible model)
// ============================================

export async function createIncomeSource(source) {
  const docRef = await addDoc(collection(db, INCOME_SOURCES), {
    ...source,
    nextPayDate: Timestamp.fromDate(new Date(source.nextPayDate)),
    isActive: source.isActive ?? true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateIncomeSource(id, updates) {
  const docRef = doc(db, INCOME_SOURCES, id);
  const updateData = { ...updates, updatedAt: Timestamp.now() };
  if (updates.nextPayDate) {
    updateData.nextPayDate = Timestamp.fromDate(new Date(updates.nextPayDate));
  }
  await updateDoc(docRef, updateData);
}

export async function deleteIncomeSource(id) {
  const docRef = doc(db, INCOME_SOURCES, id);
  await deleteDoc(docRef);
}

export async function getIncomeSources() {
  const q = query(collection(db, INCOME_SOURCES), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function subscribeToIncomeSources(callback) {
  const q = query(collection(db, INCOME_SOURCES), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const sources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(sources);
  });
}

// ============================================
// One-Time Income functions
// ============================================

export async function addOneTimeIncome(income) {
  const docRef = await addDoc(collection(db, ONE_TIME_INCOME), {
    ...income,
    date: Timestamp.fromDate(new Date(income.date)),
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateOneTimeIncome(id, updates) {
  const docRef = doc(db, ONE_TIME_INCOME, id);
  const updateData = { ...updates };
  if (updates.date) {
    updateData.date = Timestamp.fromDate(new Date(updates.date));
  }
  await updateDoc(docRef, updateData);
}

export async function deleteOneTimeIncome(id) {
  const docRef = doc(db, ONE_TIME_INCOME, id);
  await deleteDoc(docRef);
}

export async function getOneTimeIncomeByPayPeriod(payPeriodId) {
  const q = query(
    collection(db, ONE_TIME_INCOME),
    where('payPeriodId', '==', payPeriodId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function subscribeToOneTimeIncome(payPeriodId, callback) {
  // Track the current unsubscribe function
  let currentUnsubscribe = null;

  const setupFallbackSubscription = () => {
    console.log('[Firestore] Setting up fallback query for one-time income...');
    const fallbackQ = query(
      collection(db, ONE_TIME_INCOME),
      where('payPeriodId', '==', payPeriodId)
    );
    currentUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side
      items.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      console.log('[Firestore] Fallback one-time income loaded:', items.length);
      callback(items);
    }, (fallbackError) => {
      console.error('[Firestore] Fallback one-time income error:', fallbackError);
    });
  };

  // Try the indexed query first
  const q = query(
    collection(db, ONE_TIME_INCOME),
    where('payPeriodId', '==', payPeriodId),
    orderBy('createdAt', 'desc')
  );

  currentUnsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('[Firestore] One-time income loaded:', items.length);
    callback(items);
  }, (error) => {
    console.error('[Firestore] Error subscribing to one-time income:', error);
    // If index error, switch to fallback
    if (error.code === 'failed-precondition') {
      setupFallbackSubscription();
    }
  });

  // Return a function that unsubscribes from whichever subscription is active
  return () => {
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }
  };
}

// ============================================
// App Config functions (global settings)
// ============================================

export async function getAppConfig() {
  const docRef = doc(db, APP_CONFIG, 'config');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export async function saveAppConfig(config) {
  const docRef = doc(db, APP_CONFIG, 'config');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

export function subscribeToAppConfig(callback) {
  const docRef = doc(db, APP_CONFIG, 'config');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  });
}
