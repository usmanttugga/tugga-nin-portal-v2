/**
 * Wallet and Payment Service Module
 * 
 * Handles wallet operations and Paystack payment integration
 * for funding user wallets.
 */

import { 
  updateWalletBalance, 
  createTransaction, 
  getUser, 
  updateUser,
  createVirtualAccountRequest,
  assignVirtualAccount as dbAssignVirtualAccount,
  updateTransaction
} from './database-service.js';
import { getCurrentUser } from './auth-service.js';
import { isFirebaseReady } from './firebase-config.js';

// Paystack public key (replace with your actual key)
const PAYSTACK_PUBLIC_KEY = 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY';

/**
 * Get user wallet balance
 * @param {string} userId - User ID
 * @returns {Promise<number>} Wallet balance
 */
export async function getWalletBalance(userId) {
  if (!isFirebaseReady()) {
    // Fallback to localStorage
    const userStr = localStorage.getItem('tugga_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.wallet || 0;
    }
    return 0;
  }

  try {
    const user = await getUser(userId);
    return user ? (user.wallet || 0) : 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
}

/**
 * Deduct amount from wallet
 * @param {string} userId - User ID
 * @param {number} amount - Amount to deduct
 * @param {string} reason - Reason for deduction
 * @returns {Promise<number>} New wallet balance
 */
export async function deductFromWallet(userId, amount, reason) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Check current balance
  const currentBalance = await getWalletBalance(userId);
  if (currentBalance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  if (!isFirebaseReady()) {
    // Fallback to localStorage
    const userStr = localStorage.getItem('tugga_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      user.wallet = (user.wallet || 0) - amount;
      localStorage.setItem('tugga_user', JSON.stringify(user));
      
      // Record transaction in localStorage
      const transactions = JSON.parse(localStorage.getItem('tugga_transactions') || '[]');
      transactions.push({
        userId: userId,
        service: 'Wallet Deduction',
        details: { reason },
        amount: -amount,
        status: 'completed',
        date: new Date().toISOString(),
        ref: generateRef()
      });
      localStorage.setItem('tugga_transactions', JSON.stringify(transactions));
      
      return user.wallet;
    }
    throw new Error('User not found');
  }

  try {
    // Update wallet in Firestore
    const newBalance = await updateWalletBalance(userId, -amount);
    
    // Create transaction record
    await createTransaction({
      userId: userId,
      service: 'Wallet Deduction',
      details: { reason },
      amount: -amount,
      status: 'completed',
      ref: generateRef()
    });
    
    console.log('Wallet deducted:', amount, 'New balance:', newBalance);
    return newBalance;
  } catch (error) {
    console.error('Error deducting from wallet:', error);
    throw error;
  }
}

/**
 * Fund wallet (create funding transaction)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to fund
 * @param {string} method - Payment method
 * @returns {Promise<object>} Transaction object
 */
export async function fundWallet(userId, amount, method = 'paystack') {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  if (!isFirebaseReady()) {
    throw new Error('Firebase not ready. Wallet funding requires Firebase connection.');
  }

  try {
    // Create pending funding transaction
    const transactionId = await createTransaction({
      userId: userId,
      service: 'Wallet Funding',
      details: { method, amount },
      amount: amount,
      status: 'pending',
      ref: generateRef()
    });
    
    console.log('Funding transaction created:', transactionId);
    
    return {
      transactionId,
      amount,
      method
    };
  } catch (error) {
    console.error('Error creating funding transaction:', error);
    throw error;
  }
}

/**
 * Initialize Paystack payment
 * @param {object} options - Payment options
 * @returns {Promise<void>}
 */
export async function initializePaystackPayment(options) {
  const {
    email,
    amount,
    userId,
    onSuccess,
    onClose
  } = options;

  // Check if Paystack is loaded
  if (typeof PaystackPop === 'undefined') {
    throw new Error('Paystack library not loaded. Please include Paystack script in your HTML.');
  }

  // Check if Firebase is ready
  if (!isFirebaseReady()) {
    throw new Error('Firebase not ready. Please configure Firebase before funding wallet.');
  }

  try {
    // Create funding transaction
    const transaction = await fundWallet(userId, amount / 100); // Paystack uses kobo
    
    // Initialize Paystack popup
    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: amount, // Amount in kobo
      currency: 'NGN',
      ref: transaction.ref || generateRef(),
      metadata: {
        userId: userId,
        transactionId: transaction.transactionId
      },
      callback: function(response) {
        console.log('Payment successful:', response);
        handlePaystackCallback(response, userId, transaction.transactionId, onSuccess);
      },
      onClose: function() {
        console.log('Payment popup closed');
        if (onClose) onClose();
      }
    });

    handler.openIframe();
  } catch (error) {
    console.error('Error initializing Paystack payment:', error);
    throw error;
  }
}

/**
 * Handle Paystack payment callback
 * @param {object} response - Paystack response
 * @param {string} userId - User ID
 * @param {string} transactionId - Transaction ID
 * @param {function} onSuccess - Success callback
 */
export async function handlePaystackCallback(response, userId, transactionId, onSuccess) {
  if (!isFirebaseReady()) {
    console.error('Firebase not ready. Cannot process payment callback.');
    return;
  }

  try {
    if (response.status === 'success') {
      // Get transaction amount
      const amount = response.amount / 100; // Convert from kobo to naira
      
      // Update wallet balance
      const newBalance = await updateWalletBalance(userId, amount);
      
      // Update transaction status
      await updateTransaction(transactionId, {
        status: 'success',
        paymentReference: response.reference,
        paymentDetails: response
      });
      
      console.log('✅ Payment processed successfully. New balance:', newBalance);
      
      // Call success callback
      if (onSuccess) {
        onSuccess({
          amount,
          newBalance,
          reference: response.reference
        });
      }
    } else {
      // Payment failed
      await updateTransaction(transactionId, {
        status: 'failed',
        paymentReference: response.reference,
        paymentDetails: response
      });
      
      console.error('❌ Payment failed:', response);
    }
  } catch (error) {
    console.error('Error handling payment callback:', error);
  }
}

/**
 * Request virtual account
 * Creates a virtual account request in Firestore for admin processing
 * Validates: Requirements 10.1, 10.2
 * 
 * @param {string} userId - User ID
 * @returns {Promise<string>} Request ID
 */
export async function requestVirtualAccount(userId) {
  if (!isFirebaseReady()) {
    throw new Error('Firebase not ready. Virtual account requests require Firebase connection.');
  }

  try {
    // Fetch user data from Firestore
    const user = await getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a virtual account assigned
    if (user.virtualAccount) {
      throw new Error('You already have a virtual account assigned');
    }

    // Create virtual account request in Firestore
    const requestId = await createVirtualAccountRequest(userId, {
      name: user.name,
      email: user.email,
      phone: user.phone
    });
    
    console.log('✅ Virtual account request created:', requestId);
    return requestId;
  } catch (error) {
    console.error('❌ Error requesting virtual account:', error);
    throw error;
  }
}

/**
 * Get virtual account details for a user
 * Retrieves assigned virtual account from user document
 * Validates: Requirements 10.4, 10.5
 * 
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Virtual account details or null if not assigned
 */
export async function getVirtualAccount(userId) {
  if (!isFirebaseReady()) {
    // Fallback to localStorage
    const userStr = localStorage.getItem('tugga_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.virtualAccount || null;
    }
    return null;
  }

  try {
    const user = await getUser(userId);
    if (!user) {
      console.warn('User not found:', userId);
      return null;
    }
    
    return user.virtualAccount || null;
  } catch (error) {
    console.error('❌ Error getting virtual account:', error);
    return null;
  }
}

/**
 * Assign virtual account to user (admin only)
 * Updates user document with virtual account details
 * Validates: Requirements 10.2, 10.3, 10.6, 10.7
 * 
 * @param {string} userId - User ID
 * @param {object} accountDetails - Virtual account details
 * @param {string} accountDetails.bank - Bank name
 * @param {string} accountDetails.accountNumber - Account number
 * @param {string} accountDetails.accountName - Account name
 * @returns {Promise<void>}
 */
export async function assignVirtualAccount(userId, accountDetails) {
  if (!isFirebaseReady()) {
    throw new Error('Firebase not ready. Cannot assign virtual account.');
  }

  // Validate required fields
  if (!accountDetails.bank || !accountDetails.accountNumber || !accountDetails.accountName) {
    throw new Error('Missing required account details: bank, accountNumber, accountName');
  }

  try {
    // Use database service to assign virtual account
    await dbAssignVirtualAccount(userId, {
      bank: accountDetails.bank,
      accountNumber: accountDetails.accountNumber,
      accountName: accountDetails.accountName
    });
    
    console.log('✅ Virtual account assigned to user:', userId);
  } catch (error) {
    console.error('❌ Error assigning virtual account:', error);
    throw error;
  }
}

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
 * Validate Paystack configuration
 * @returns {boolean} True if Paystack is configured
 */
export function isPaystackConfigured() {
  return PAYSTACK_PUBLIC_KEY !== 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY';
}

// Export for global access (backward compatibility)
window.walletService = {
  getWalletBalance,
  deductFromWallet,
  fundWallet,
  initializePaystackPayment,
  handlePaystackCallback,
  requestVirtualAccount,
  getVirtualAccount,
  assignVirtualAccount,
  isPaystackConfigured
};

console.log('Wallet service module loaded');
