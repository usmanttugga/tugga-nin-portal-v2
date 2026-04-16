/**
 * Firestore Database Service Module
 * 
 * Handles all database operations for users, transactions, and settings
 * using Firestore with retry logic and error handling.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  increment
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { getFirestoreInstance, isFirebaseReady } from './firebase-config.js';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Retry a Firestore operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {number} retries - Number of retries remaining
 * @param {number} delay - Current delay in milliseconds
 * @returns {Promise<any>} Operation result
 */
async function retryOperation(operation, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0 || !isRetryableError(error)) {
      throw error;
    }
    
    console.warn(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, retries - 1, delay * 2);
  }
}

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  const retryableCodes = [
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
    'aborted',
    'internal',
    'unknown'
  ];
  return retryableCodes.includes(error.code);
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Create a new user document in Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @param {object} userData - User data object
 * @returns {Promise<void>}
 */
export async function createUser(uid, userData) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  const userDoc = {
    id: uid,
    email: userData.email,
    name: userData.name || '',
    phone: userData.phone || '',
    role: userData.role || 'user',
    wallet: userData.wallet || 0,
    nin: userData.nin || '',
    status: userData.status || 'Active',
    registeredAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  return retryOperation(async () => {
    await setDoc(doc(db, 'users', uid), userDoc);
    console.log('User created in Firestore:', uid);
  });
}

/**
 * Get user document from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<object|null>} User data or null
 */
export async function getUser(uid) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  });
}

/**
 * Update user document in Firestore
 * @param {string} uid - User ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateUser(uid, updates) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  const updateData = {
    ...updates,
    updatedAt: serverTimestamp()
  };

  return retryOperation(async () => {
    await updateDoc(doc(db, 'users', uid), updateData);
    console.log('User updated in Firestore:', uid);
  });
}

/**
 * Get all users from Firestore (admin only)
 * @returns {Promise<Array>} Array of user objects
 */
export async function getAllUsers() {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    // No orderBy to avoid requiring a composite index
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort client-side by registeredAt descending
    return users.sort((a, b) => {
      const aTime = a.registeredAt ? (a.registeredAt.seconds || new Date(a.registeredAt).getTime() / 1000) : 0;
      const bTime = b.registeredAt ? (b.registeredAt.seconds || new Date(b.registeredAt).getTime() / 1000) : 0;
      return bTime - aTime;
    });
  });
}

/**
 * Delete user document from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
export async function deleteUser(uid) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    await deleteDoc(doc(db, 'users', uid));
    console.log('User deleted from Firestore:', uid);
  });
}

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================

/**
 * Create a new transaction in Firestore
 * @param {object} transactionData - Transaction data
 * @returns {Promise<string>} Transaction ID
 */
export async function createTransaction(transactionData) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  const txnDoc = {
    userId: transactionData.userId,
    service: transactionData.service,
    details: transactionData.details || {},
    amount: transactionData.amount || 0,
    status: transactionData.status || 'pending',
    date: serverTimestamp(),
    ref: transactionData.ref || generateRef(),
    slipType: transactionData.slipType || '',
    inputs: transactionData.inputs || {},
    result: transactionData.result || null
  };

  return retryOperation(async () => {
    const docRef = await addDoc(collection(db, 'transactions'), txnDoc);
    console.log('Transaction created in Firestore:', docRef.id);
    return docRef.id;
  });
}

/**
 * Get transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<object|null>} Transaction data or null
 */
export async function getTransaction(transactionId) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    const txnDoc = await getDoc(doc(db, 'transactions', transactionId));
    if (txnDoc.exists()) {
      return { id: txnDoc.id, ...txnDoc.data() };
    }
    return null;
  });
}

/**
 * Get user transactions from Firestore
 * @param {string} userId - User ID
 * @param {number} limitCount - Maximum number of transactions to fetch
 * @returns {Promise<Array>} Array of transaction objects
 */
export async function getUserTransactions(userId, limitCount = 100) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    // Filter by userId only — no orderBy to avoid requiring a composite index
    const txnQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      limit(limitCount)
    );
    const snapshot = await getDocs(txnQuery);
    const txns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort client-side by date descending
    return txns.sort((a, b) => {
      const aTime = a.date ? (a.date.seconds || new Date(a.date).getTime() / 1000) : 0;
      const bTime = b.date ? (b.date.seconds || new Date(b.date).getTime() / 1000) : 0;
      return bTime - aTime;
    });
  });
}

/**
 * Get all transactions from Firestore (admin only)
 * @param {number} limitCount - Maximum number of transactions to fetch
 * @returns {Promise<Array>} Array of transaction objects
 */
export async function getAllTransactions(limitCount = 200) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    // Use limit only — no orderBy to avoid requiring a composite index
    const txnQuery = query(
      collection(db, 'transactions'),
      limit(limitCount)
    );
    const snapshot = await getDocs(txnQuery);
    const txns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort client-side by date descending
    return txns.sort((a, b) => {
      const aTime = a.date ? (a.date.seconds || new Date(a.date).getTime() / 1000) : 0;
      const bTime = b.date ? (b.date.seconds || new Date(b.date).getTime() / 1000) : 0;
      return bTime - aTime;
    });
  });
}

/**
 * Delete transaction from Firestore
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<void>}
 */
export async function deleteTransaction(transactionId) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    await deleteDoc(doc(db, 'transactions', transactionId));
    console.log('Transaction deleted from Firestore:', transactionId);
  });
}

/**
 * Update transaction in Firestore
 * @param {string} transactionId - Transaction ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateTransaction(transactionId, updates) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    await updateDoc(doc(db, 'transactions', transactionId), updates);
    console.log('Transaction updated in Firestore:', transactionId);
  });
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

/**
 * Get settings from Firestore
 * @param {string} settingsType - Type of settings (pricing, availability, platform)
 * @returns {Promise<object|null>} Settings object or null
 */
export async function getSettings(settingsType = 'platform') {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    const settingsDoc = await getDoc(doc(db, 'settings', settingsType));
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    return null;
  });
}

/**
 * Update settings in Firestore
 * @param {string} settingsType - Type of settings (pricing, availability, platform)
 * @param {object} settings - Settings object
 * @returns {Promise<void>}
 */
export async function updateSettings(settingsType, settings) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  const settingsDoc = {
    ...settings,
    updatedAt: serverTimestamp()
  };

  return retryOperation(async () => {
    await setDoc(doc(db, 'settings', settingsType), settingsDoc, { merge: true });
    console.log('Settings updated in Firestore:', settingsType);
  });
}

// ============================================================================
// WALLET OPERATIONS
// ============================================================================

/**
 * Update user wallet balance atomically
 * @param {string} userId - User ID
 * @param {number} amount - Amount to add (positive) or subtract (negative)
 * @returns {Promise<number>} New wallet balance
 */
export async function updateWalletBalance(userId, amount) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      wallet: increment(amount),
      updatedAt: serverTimestamp()
    });
    
    // Get updated balance
    const userDoc = await getDoc(userRef);
    const newBalance = userDoc.data().wallet;
    console.log('Wallet updated for user:', userId, 'New balance:', newBalance);
    return newBalance;
  });
}

// ============================================================================
// VIRTUAL ACCOUNT OPERATIONS
// ============================================================================

/**
 * Create virtual account request
 * @param {string} userId - User ID
 * @param {object} userInfo - User information
 * @returns {Promise<string>} Request ID
 */
export async function createVirtualAccountRequest(userId, userInfo) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  const requestDoc = {
    userId: userId,
    userName: userInfo.name,
    userEmail: userInfo.email,
    userPhone: userInfo.phone,
    status: 'pending',
    requestedAt: serverTimestamp()
  };

  return retryOperation(async () => {
    const docRef = await addDoc(collection(db, 'virtualAccountRequests'), requestDoc);
    console.log('Virtual account request created:', docRef.id);
    return docRef.id;
  });
}

/**
 * Get virtual account requests (admin only)
 * @param {string} status - Filter by status (pending, approved, rejected)
 * @returns {Promise<Array>} Array of request objects
 */
export async function getVirtualAccountRequests(status = 'pending') {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  return retryOperation(async () => {
    const requestsQuery = query(
      collection(db, 'virtualAccountRequests'),
      where('status', '==', status)
    );
    const snapshot = await getDocs(requestsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

/**
 * Assign virtual account to user
 * @param {string} userId - User ID
 * @param {object} accountDetails - Virtual account details
 * @returns {Promise<void>}
 */
export async function assignVirtualAccount(userId, accountDetails) {
  const db = getFirestoreInstance();
  if (!db) throw new Error('Firestore not initialized');

  const virtualAccount = {
    bank: accountDetails.bank,
    accountNumber: accountDetails.accountNumber,
    accountName: accountDetails.accountName,
    assignedAt: serverTimestamp()
  };

  return retryOperation(async () => {
    await updateDoc(doc(db, 'users', userId), {
      virtualAccount: virtualAccount,
      updatedAt: serverTimestamp()
    });
    console.log('Virtual account assigned to user:', userId);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique transaction reference
 * @returns {string} Transaction reference
 */
function generateRef() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `TXN-${timestamp}-${random}`.toUpperCase();
}

/**
 * Check if Firestore is available
 * @returns {boolean} True if Firestore is available
 */
export function isFirestoreAvailable() {
  return isFirebaseReady() && getFirestoreInstance() !== null;
}

// Export for global access (backward compatibility)
window.databaseService = {
  createUser,
  getUser,
  updateUser,
  getAllUsers,
  deleteUser,
  createTransaction,
  getTransaction,
  getUserTransactions,
  getAllTransactions,
  updateTransaction,
  deleteTransaction,
  getSettings,
  updateSettings,
  updateWalletBalance,
  createVirtualAccountRequest,
  getVirtualAccountRequests,
  assignVirtualAccount,
  isFirestoreAvailable
};

console.log('Database service module loaded');

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

import { onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Subscribe to user document changes
 * @param {string} userId - User ID
 * @param {function} callback - Callback function to handle updates
 * @param {function} errorCallback - Callback function to handle errors
 * @returns {function} Unsubscribe function
 */
export function subscribeToUserChanges(userId, callback, errorCallback) {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn('Firestore not available. Real-time listener not registered.');
    return () => {};
  }

  const userRef = doc(db, 'users', userId);
  
  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const userData = { id: snapshot.id, ...snapshot.data() };
        console.log('User data updated:', userId);
        callback(userData);
      } else {
        console.warn('User document does not exist:', userId);
        callback(null);
      }
    },
    (error) => {
      console.error('Error in user listener:', error);
      if (errorCallback) {
        errorCallback(error);
      }
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect user listener...');
        subscribeToUserChanges(userId, callback, errorCallback);
      }, 5000);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to user transactions
 * @param {string} userId - User ID
 * @param {function} callback - Callback function to handle updates
 * @param {function} errorCallback - Callback function to handle errors
 * @param {number} limitCount - Maximum number of transactions
 * @returns {function} Unsubscribe function
 */
export function subscribeToUserTransactions(userId, callback, errorCallback, limitCount = 100) {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn('Firestore not available. Real-time listener not registered.');
    return () => {};
  }

  const txnQuery = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    limit(limitCount)
  );
  
  const unsubscribe = onSnapshot(
    txnQuery,
    (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('User transactions updated:', transactions.length);
      callback(transactions);
    },
    (error) => {
      console.error('Error in transactions listener:', error);
      if (errorCallback) {
        errorCallback(error);
      }
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect transactions listener...');
        subscribeToUserTransactions(userId, callback, errorCallback, limitCount);
      }, 5000);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to all transactions (admin only)
 * @param {function} callback - Callback function to handle updates
 * @param {function} errorCallback - Callback function to handle errors
 * @param {number} limitCount - Maximum number of transactions
 * @returns {function} Unsubscribe function
 */
export function subscribeToAllTransactions(callback, errorCallback, limitCount = 200) {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn('Firestore not available. Real-time listener not registered.');
    return () => {};
  }

  const txnQuery = query(
    collection(db, 'transactions'),
    limit(limitCount)
  );
  
  const unsubscribe = onSnapshot(
    txnQuery,
    (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('All transactions updated:', transactions.length);
      callback(transactions);
    },
    (error) => {
      console.error('Error in all transactions listener:', error);
      if (errorCallback) {
        errorCallback(error);
      }
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect all transactions listener...');
        subscribeToAllTransactions(callback, errorCallback, limitCount);
      }, 5000);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to settings changes
 * @param {string} settingsType - Type of settings (pricing, availability, platform)
 * @param {function} callback - Callback function to handle updates
 * @param {function} errorCallback - Callback function to handle errors
 * @returns {function} Unsubscribe function
 */
export function subscribeToSettings(settingsType, callback, errorCallback) {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn('Firestore not available. Real-time listener not registered.');
    return () => {};
  }

  const settingsRef = doc(db, 'settings', settingsType);
  
  const unsubscribe = onSnapshot(
    settingsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data();
        console.log('Settings updated:', settingsType);
        callback(settings);
      } else {
        console.warn('Settings document does not exist:', settingsType);
        callback(null);
      }
    },
    (error) => {
      console.error('Error in settings listener:', error);
      if (errorCallback) {
        errorCallback(error);
      }
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect settings listener...');
        subscribeToSettings(settingsType, callback, errorCallback);
      }, 5000);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to virtual account requests (admin only)
 * @param {function} callback - Callback function to handle updates
 * @param {function} errorCallback - Callback function to handle errors
 * @returns {function} Unsubscribe function
 */
export function subscribeToVirtualAccountRequests(callback, errorCallback) {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn('Firestore not available. Real-time listener not registered.');
    return () => {};
  }

  const requestsQuery = query(
    collection(db, 'virtualAccountRequests'),
    where('status', '==', 'pending')
  );
  
  const unsubscribe = onSnapshot(
    requestsQuery,
    (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Virtual account requests updated:', requests.length);
      callback(requests);
    },
    (error) => {
      console.error('Error in virtual account requests listener:', error);
      if (errorCallback) {
        errorCallback(error);
      }
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect virtual account requests listener...');
        subscribeToVirtualAccountRequests(callback, errorCallback);
      }, 5000);
    }
  );

  return unsubscribe;
}

// Update global exports
window.databaseService = {
  ...window.databaseService,
  subscribeToUserChanges,
  subscribeToUserTransactions,
  subscribeToAllTransactions,
  subscribeToSettings,
  subscribeToVirtualAccountRequests
};
