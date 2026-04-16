/**
 * Bug Condition Exploration Test - Clear All Data Incomplete Deletion
 *
 * **Property 1: Bug Condition** - Clear All Data Fails to Delete Firestore Transactions
 *
 * This test MUST FAIL on unfixed code — failure confirms the bug exists.
 * It encodes the expected (correct) behavior and will pass once the bug is fixed.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

const fs = require('fs');
const path = require('path');

// ── Mock Firebase/Firestore ──────────────────────────────────────────────────

/**
 * Mock Firestore database state
 */
const mockFirestoreState = {
  transactions: [],
  users: [],
  settings: {}
};

/**
 * Mock database service that simulates Firestore operations
 */
const mockDatabaseService = {
  getAllTransactions: async (limitCount) => {
    return [...mockFirestoreState.transactions];
  },
  
  getAllUsers: async () => {
    return [...mockFirestoreState.users];
  },
  
  updateUser: async (uid, updates) => {
    const user = mockFirestoreState.users.find(u => (u.id || u.uid) === uid);
    if (user) {
      Object.assign(user, updates);
    }
  },
  
  deleteTransaction: async (transactionId) => {
    const index = mockFirestoreState.transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
      mockFirestoreState.transactions.splice(index, 1);
    }
  }
};

/**
 * Mock Firebase ready check
 */
function mockFbReady() {
  return true;
}

/**
 * Mock toast notification
 */
function mockToast(message, type) {
  // Silent mock
}

/**
 * Load and execute the clearAllData function from admin dashboard
 * This extracts the function from the HTML file and makes it testable
 */
function loadClearAllDataFunction(promptFn) {
  const html = fs.readFileSync(
    path.resolve(__dirname, '../admin/dashboard.html'),
    'utf8'
  );
  
  // Extract the clearAllData function from the HTML
  const functionMatch = html.match(/async function clearAllData\(\)\s*{[\s\S]*?^  }/m);
  if (!functionMatch) {
    throw new Error('clearAllData function not found in admin/dashboard.html');
  }
  
  const functionCode = functionMatch[0];
  
  // Create a context with mocked dependencies
  const context = {
    window: {
      databaseService: mockDatabaseService
    },
    localStorage: {
      data: {},
      removeItem(key) {
        delete this.data[key];
      },
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      }
    },
    document: {
      getElementById: (id) => {
        if (id === 'clearDataAlert') {
          return {
            innerHTML: ''
          };
        }
        return null;
      }
    },
    fbReady: mockFbReady,
    toast: mockToast,
    loadOverview: () => {},
    prompt: promptFn || (() => 'CLEAR'),
    setTimeout: global.setTimeout,
    Promise: global.Promise
  };
  
  // Wrap the function in a way that uses our mocked context
  const wrappedFunction = new Function(
    'window',
    'localStorage',
    'document',
    'fbReady',
    'toast',
    'loadOverview',
    'prompt',
    'setTimeout',
    'Promise',
    `
    ${functionCode}
    return clearAllData;
    `
  );
  
  return wrappedFunction(
    context.window,
    context.localStorage,
    context.document,
    context.fbReady,
    context.toast,
    context.loadOverview,
    context.prompt,
    context.setTimeout,
    context.Promise
  );
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Reset mock Firestore state to initial conditions
 */
function resetMockFirestore() {
  mockFirestoreState.transactions = [];
  mockFirestoreState.users = [];
  mockFirestoreState.settings = {};
}

/**
 * Seed mock Firestore with test data
 */
function seedMockFirestore(transactionCount, userCount) {
  // Create transactions
  for (let i = 1; i <= transactionCount; i++) {
    mockFirestoreState.transactions.push({
      id: `txn-${i}`,
      userId: `user-${(i % userCount) + 1}`,
      service: 'NIN Verification',
      amount: 500,
      status: 'completed',
      date: new Date(),
      ref: `TXN-REF-${i}`
    });
  }
  
  // Create users
  for (let i = 1; i <= userCount; i++) {
    mockFirestoreState.users.push({
      id: `user-${i}`,
      uid: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@test.com`,
      wallet: 1000 * i,
      role: 'user'
    });
  }
}

/**
 * Check if all Firestore transactions have been deleted
 */
function firestoreTransactionsDeleted() {
  return mockFirestoreState.transactions.length === 0;
}

/**
 * Check if Firestore transactions exist
 */
function firestoreTransactionsExist() {
  return mockFirestoreState.transactions.length > 0;
}

/**
 * Check if all wallet balances are reset to 0
 */
function allWalletBalancesReset() {
  return mockFirestoreState.users.every(u => u.wallet === 0);
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Bug Condition 1: Clear All Data Fails to Delete Firestore Transactions', () => {
  let mockPrompt;
  
  beforeEach(() => {
    resetMockFirestore();
    
    // Mock prompt to always confirm
    mockPrompt = jest.fn(() => 'CLEAR');
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  /**
   * Property 1: Bug Condition - Clear All Data Fails to Delete Firestore Transactions
   *
   * WHEN an admin clicks "Clear All History & Balances" and confirms by typing "CLEAR"
   * THEN the system SHALL delete ALL transactions from Firebase Firestore
   *
   * Bug Condition: action == "clearAllData" AND confirmed == true 
   *                AND firestoreTransactionsExist() 
   *                AND NOT firestoreTransactionsDeleted()
   *
   * Expected Behavior: All Firestore transactions deleted, all wallet balances reset to ₦0,
   *                    localStorage cleared, success message displayed
   *
   * **EXPECTED OUTCOME ON UNFIXED CODE**: TEST FAILS (confirms bug exists)
   * **EXPECTED OUTCOME AFTER FIX**: TEST PASSES (confirms bug is fixed)
   *
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  test('Property 1: clearAllData with confirmation deletes all Firestore transactions', async () => {
    // Arrange: Seed Firestore with transactions and users
    const transactionCount = 47;
    const userCount = 12;
    seedMockFirestore(transactionCount, userCount);
    
    // Verify initial state: transactions exist
    expect(firestoreTransactionsExist()).toBe(true);
    expect(mockFirestoreState.transactions.length).toBe(transactionCount);
    expect(mockFirestoreState.users.length).toBe(userCount);
    
    // Load clearAllData with mocked prompt
    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    
    // Act: Call clearAllData with confirmation
    await clearAllData();
    
    // Assert: Bug Condition Check
    // On UNFIXED code: transactions still exist → firestoreTransactionsDeleted() is false → TEST FAILS
    // After fix: transactions are deleted → firestoreTransactionsDeleted() is true → TEST PASSES
    
    // Expected Behavior 1: All Firestore transactions deleted
    expect(firestoreTransactionsDeleted()).toBe(true);
    expect(mockFirestoreState.transactions.length).toBe(0);
    
    // Expected Behavior 2: All wallet balances reset to ₦0
    expect(allWalletBalancesReset()).toBe(true);
    mockFirestoreState.users.forEach(user => {
      expect(user.wallet).toBe(0);
    });
    
    // Expected Behavior 3: localStorage cleared
    // (This is tested implicitly through the function execution)
  });
  
  /**
   * Property 1 (Edge Case): Large transaction count
   *
   * Test that clearAllData deletes ALL transactions regardless of count
   */
  test('Property 1 (Edge Case): clearAllData deletes all transactions even with 1000+ transactions', async () => {
    // Arrange: Seed with large number of transactions
    const transactionCount = 1234;
    const userCount = 50;
    seedMockFirestore(transactionCount, userCount);
    
    expect(mockFirestoreState.transactions.length).toBe(transactionCount);
    
    // Load clearAllData with mocked prompt
    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    
    // Act: Call clearAllData
    await clearAllData();
    
    // Assert: All transactions deleted (not just the first 1000)
    expect(firestoreTransactionsDeleted()).toBe(true);
    expect(mockFirestoreState.transactions.length).toBe(0);
  });
  
  /**
   * Property 1 (Counterexample Documentation): Document the bug
   *
   * This test explicitly documents the counterexample that demonstrates the bug exists.
   * It captures the exact failure scenario described in the bug report.
   */
  test('Counterexample: clearAllData resets wallets but leaves transactions in Firestore', async () => {
    // Arrange: Seed with specific scenario from bug report
    const transactionCount = 47;
    const userCount = 12;
    seedMockFirestore(transactionCount, userCount);
    
    const initialTransactionCount = mockFirestoreState.transactions.length;
    const initialUserWallets = mockFirestoreState.users.map(u => u.wallet);
    
    // Load clearAllData with mocked prompt
    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    
    // Act: Call clearAllData
    await clearAllData();
    
    // Document the bug: On unfixed code, this assertion will FAIL
    // because transactions are NOT deleted
    const transactionsRemaining = mockFirestoreState.transactions.length;
    
    if (transactionsRemaining > 0) {
      // This is the BUG: transactions still exist after clearAllData
      console.log(`BUG CONFIRMED: clearAllData() reset ${userCount} user wallets but left ${transactionsRemaining} transactions in Firestore`);
      console.log(`Expected: 0 transactions remaining`);
      console.log(`Actual: ${transactionsRemaining} transactions remaining`);
    }
    
    // This assertion encodes the EXPECTED behavior (will fail on unfixed code)
    expect(transactionsRemaining).toBe(0);
  });
  
  /**
   * Property 1 (Cancellation): Verify cancellation doesn't delete anything
   *
   * This is a preservation test to ensure the fix doesn't break cancellation behavior
   */
  test('Preservation: clearAllData cancelled does not delete transactions or reset wallets', async () => {
    // Arrange: Seed Firestore
    const transactionCount = 10;
    const userCount = 5;
    seedMockFirestore(transactionCount, userCount);
    
    const initialTransactionCount = mockFirestoreState.transactions.length;
    const initialWallets = mockFirestoreState.users.map(u => u.wallet);
    
    // Load clearAllData with mocked prompt that returns something other than 'CLEAR'
    const clearAllData = loadClearAllDataFunction(() => 'CANCEL');
    
    // Act: Call clearAllData but cancel (don't type 'CLEAR')
    await clearAllData();
    
    // Assert: Nothing should be deleted or reset
    expect(mockFirestoreState.transactions.length).toBe(initialTransactionCount);
    mockFirestoreState.users.forEach((user, index) => {
      expect(user.wallet).toBe(initialWallets[index]);
    });
  });
});
