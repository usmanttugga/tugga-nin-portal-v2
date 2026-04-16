/**
 * Data Migration Service Module
 * 
 * Handles migration of data from localStorage to Firestore
 * with duplicate checking and error handling.
 */

import { createUser, getUser, createTransaction } from './database-service.js';
import { getCurrentUser } from './auth-service.js';
import { isFirebaseReady } from './firebase-config.js';

// Migration status key
const MIGRATION_STATUS_KEY = 'tuggaNinPortalV2_tugga_migration_status';
const MIGRATION_DISMISSED_KEY = 'tuggaNinPortalV2_tugga_migration_dismissed';

/**
 * Check if localStorage has data to migrate
 * @returns {boolean} True if migration data exists
 */
export function hasLocalStorageData() {
  const users = localStorage.getItem('tuggaNinPortalV2_tugga_all_users');
  const transactions = localStorage.getItem('tuggaNinPortalV2_tugga_transactions');
  const currentUser = localStorage.getItem('tuggaNinPortalV2_tugga_user');
  
  return !!(users || transactions || currentUser);
}

/**
 * Check if migration is complete
 * @returns {boolean} True if migration is complete
 */
export function isMigrationComplete() {
  const status = localStorage.getItem(MIGRATION_STATUS_KEY);
  return status === 'completed';
}

/**
 * Get migration status
 * @returns {object} Migration status object
 */
export function getMigrationStatus() {
  const statusStr = localStorage.getItem(MIGRATION_STATUS_KEY);
  if (!statusStr) {
    return {
      status: 'not_started',
      completedAt: null,
      error: null
    };
  }
  
  try {
    return JSON.parse(statusStr);
  } catch (error) {
    return {
      status: 'not_started',
      completedAt: null,
      error: null
    };
  }
}

/**
 * Mark migration as complete
 * @param {boolean} success - Whether migration succeeded
 * @param {string} error - Error message if failed
 */
export function markMigrationComplete(success = true, error = null) {
  const status = {
    status: success ? 'completed' : 'failed',
    completedAt: new Date().toISOString(),
    error: error
  };
  
  localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
  console.log('Migration status updated:', status);
}

/**
 * Check if user email already exists in Firestore
 * @param {string} email - User email
 * @returns {Promise<boolean>} True if email exists
 */
export async function checkForDuplicates(email) {
  if (!isFirebaseReady()) {
    return false;
  }

  try {
    // Try to get user by checking current auth user
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.email === email) {
      return true;
    }
    
    // Note: This is a simplified check. In production, you'd query Firestore
    // by email, but that requires a composite index.
    return false;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
}

/**
 * Migrate user data from localStorage to Firestore
 * @param {string} userId - User ID from Firebase Auth
 * @returns {Promise<object>} Migration result
 */
export async function migrateUserData(userId) {
  if (!isFirebaseReady()) {
    throw new Error('Firebase not ready. Cannot migrate user data.');
  }

  const result = {
    success: false,
    usersCreated: 0,
    errors: []
  };

  try {
    // Get current user from localStorage
    const currentUserStr = localStorage.getItem('tuggaNinPortalV2_tugga_user');
    if (currentUserStr) {
      const userData = JSON.parse(currentUserStr);
      
      // Check if user already exists in Firestore
      const existingUser = await getUser(userId);
      if (!existingUser) {
        // Create user in Firestore
        await createUser(userId, {
          email: userData.email,
          name: userData.name || '',
          phone: userData.phone || '',
          role: userData.role || 'user',
          wallet: userData.wallet || 0,
          nin: userData.nin || '',
          status: userData.status || 'Active'
        });
        
        result.usersCreated++;
        console.log('User migrated to Firestore:', userId);
      } else {
        console.log('User already exists in Firestore:', userId);
      }
    }

    // Get all users from localStorage
    const allUsersStr = localStorage.getItem('tuggaNinPortalV2_tugga_all_users');
    if (allUsersStr) {
      const allUsers = JSON.parse(allUsersStr);
      
      for (const user of allUsers) {
        // Skip if this is the current user (already migrated above)
        if (user.email === JSON.parse(currentUserStr || '{}').email) {
          continue;
        }
        
        // Note: We can't create Firebase Auth users for other users
        // They will need to register themselves
        console.log('Skipping user (needs to register):', user.email);
      }
    }

    result.success = true;
  } catch (error) {
    console.error('Error migrating user data:', error);
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Migrate transactions from localStorage to Firestore
 * @param {string} userId - User ID
 * @returns {Promise<object>} Migration result
 */
export async function migrateTransactions(userId) {
  if (!isFirebaseReady()) {
    throw new Error('Firebase not ready. Cannot migrate transactions.');
  }

  const result = {
    success: false,
    transactionsMigrated: 0,
    errors: []
  };

  try {
    // Get transactions from localStorage
    const transactionsStr = localStorage.getItem('tuggaNinPortalV2_tugga_transactions');
    if (!transactionsStr) {
      result.success = true;
      return result;
    }

    const transactions = JSON.parse(transactionsStr);
    
    // Filter transactions for current user
    const userTransactions = transactions.filter(txn => txn.userId === userId);
    
    for (const txn of userTransactions) {
      try {
        await createTransaction({
          userId: txn.userId || userId,
          service: txn.service,
          details: txn.details || {},
          amount: txn.amount || 0,
          status: txn.status || 'completed',
          ref: txn.ref,
          slipType: txn.slipType || '',
          inputs: txn.inputs || {},
          result: txn.result || null
        });
        
        result.transactionsMigrated++;
      } catch (error) {
        console.error('Error migrating transaction:', error);
        result.errors.push(`Transaction ${txn.ref}: ${error.message}`);
      }
    }

    result.success = true;
  } catch (error) {
    console.error('Error migrating transactions:', error);
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Migrate all data from localStorage to Firestore
 * @param {string} userId - User ID from Firebase Auth
 * @param {function} progressCallback - Callback for progress updates
 * @returns {Promise<object>} Migration result
 */
export async function migrateAllData(userId, progressCallback) {
  if (!isFirebaseReady()) {
    throw new Error('Firebase not ready. Cannot perform migration.');
  }

  const overallResult = {
    success: false,
    userData: null,
    transactions: null,
    errors: []
  };

  try {
    // Step 1: Migrate user data (50% progress)
    if (progressCallback) progressCallback(10, 'Migrating user data...');
    overallResult.userData = await migrateUserData(userId);
    if (progressCallback) progressCallback(50, 'User data migrated');

    // Step 2: Migrate transactions (100% progress)
    if (progressCallback) progressCallback(60, 'Migrating transactions...');
    overallResult.transactions = await migrateTransactions(userId);
    if (progressCallback) progressCallback(100, 'Migration complete');

    // Check if any errors occurred
    const hasErrors = overallResult.userData.errors.length > 0 || 
                     overallResult.transactions.errors.length > 0;

    if (!hasErrors) {
      overallResult.success = true;
      markMigrationComplete(true);
      console.log('✅ Migration completed successfully');
    } else {
      overallResult.errors = [
        ...overallResult.userData.errors,
        ...overallResult.transactions.errors
      ];
      markMigrationComplete(false, overallResult.errors.join('; '));
      console.warn('⚠️ Migration completed with errors:', overallResult.errors);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    overallResult.errors.push(error.message);
    markMigrationComplete(false, error.message);
  }

  return overallResult;
}

/**
 * Check if migration prompt should be shown
 * @returns {boolean} True if prompt should be shown
 */
export function shouldShowMigrationPrompt() {
  // Don't show if Firebase not ready
  if (!isFirebaseReady()) {
    return false;
  }

  // Don't show if migration already complete
  if (isMigrationComplete()) {
    return false;
  }

  // Don't show if no data to migrate
  if (!hasLocalStorageData()) {
    return false;
  }

  // Check if user dismissed the prompt recently
  const dismissedStr = localStorage.getItem(MIGRATION_DISMISSED_KEY);
  if (dismissedStr) {
    const dismissedAt = new Date(dismissedStr);
    const daysSinceDismissal = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Don't show if dismissed within last 7 days
    if (daysSinceDismissal < 7) {
      return false;
    }
  }

  return true;
}

/**
 * Dismiss migration prompt
 */
export function dismissMigrationPrompt() {
  localStorage.setItem(MIGRATION_DISMISSED_KEY, new Date().toISOString());
  console.log('Migration prompt dismissed');
}

/**
 * Reset migration status (for testing)
 */
export function resetMigrationStatus() {
  localStorage.removeItem(MIGRATION_STATUS_KEY);
  localStorage.removeItem(MIGRATION_DISMISSED_KEY);
  console.log('Migration status reset');
}

// Export for global access (backward compatibility)
window.migrationService = {
  hasLocalStorageData,
  isMigrationComplete,
  getMigrationStatus,
  markMigrationComplete,
  checkForDuplicates,
  migrateUserData,
  migrateTransactions,
  migrateAllData,
  shouldShowMigrationPrompt,
  dismissMigrationPrompt,
  resetMigrationStatus
};

console.log('Migration service module loaded');
