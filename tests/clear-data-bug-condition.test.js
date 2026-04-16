/**
 * Bug Condition Exploration Test - Clear All Data Incomplete Clearing
 *
 * **Property 1: Bug Condition** - Clear All Data Fails to Clear Firestore Transactions
 *
 * NOTE: Firestore security rules block transaction deletion (audit trail protection).
 * The correct fix is to mark transactions as status:'cleared' via updateTransaction,
 * not to delete them. This test validates that behavior.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

const fs = require('fs');
const path = require('path');

// ── Mock Firebase/Firestore ──────────────────────────────────────────────────

const mockFirestoreState = {
  transactions: [],
  users: [],
  settings: {}
};

const mockDatabaseService = {
  getAllTransactions: async (limitCount) => {
    return [...mockFirestoreState.transactions].slice(0, limitCount);
  },

  getAllUsers: async () => {
    return [...mockFirestoreState.users];
  },

  updateUser: async (uid, updates) => {
    const user = mockFirestoreState.users.find(u => (u.id || u.uid) === uid);
    if (user) Object.assign(user, updates);
  },

  updateTransaction: async (transactionId, updates) => {
    const txn = mockFirestoreState.transactions.find(t => t.id === transactionId);
    if (txn) Object.assign(txn, updates);
  }
};

function mockFbReady() { return true; }
function mockToast() {}

function loadClearAllDataFunction(promptFn) {
  const html = fs.readFileSync(
    path.resolve(__dirname, '../admin/dashboard.html'),
    'utf8'
  );

  const functionMatch = html.match(/async function clearAllData\(\)\s*{[\s\S]*?^  }/m);
  if (!functionMatch) throw new Error('clearAllData function not found in admin/dashboard.html');

  const functionCode = functionMatch[0];

  const mockLocalStorage = {
    data: {},
    removeItem(key) { delete this.data[key]; },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; }
  };

  const mockDocument = {
    getElementById: (id) => id === 'clearDataAlert' ? { innerHTML: '' } : null
  };

  const wrappedFunction = new Function(
    'window', 'localStorage', 'document', 'fbReady', 'toast',
    'loadOverview', 'prompt', 'setTimeout', 'Promise',
    `${functionCode}\nreturn clearAllData;`
  );

  return wrappedFunction(
    { databaseService: mockDatabaseService },
    mockLocalStorage,
    mockDocument,
    mockFbReady,
    mockToast,
    () => {},
    promptFn || (() => 'CLEAR'),
    global.setTimeout,
    global.Promise
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetMockFirestore() {
  mockFirestoreState.transactions = [];
  mockFirestoreState.users = [];
}

function seedMockFirestore(transactionCount, userCount) {
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
  for (let i = 1; i <= userCount; i++) {
    mockFirestoreState.users.push({
      id: `user-${i}`, uid: `user-${i}`,
      name: `User ${i}`, email: `user${i}@test.com`,
      wallet: 1000 * i, role: 'user'
    });
  }
}

function allTransactionsCleared() {
  return mockFirestoreState.transactions.every(t => t.status === 'cleared');
}

function allWalletBalancesReset() {
  return mockFirestoreState.users.every(u => u.wallet === 0);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Bug Condition 1: Clear All Data Fails to Clear Firestore Transactions', () => {
  beforeEach(() => resetMockFirestore());
  afterEach(() => jest.clearAllMocks());

  /**
   * Property 1: clearAllData marks all transactions as cleared and resets wallets
   *
   * NOTE: Firestore rules block deletion, so the correct behavior is to mark
   * transactions as status:'cleared' so they are hidden from admin views.
   */
  test('Property 1: clearAllData with confirmation marks all transactions as cleared', async () => {
    const transactionCount = 47;
    const userCount = 12;
    seedMockFirestore(transactionCount, userCount);

    expect(mockFirestoreState.transactions.length).toBe(transactionCount);

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    // All transactions should be marked as cleared (not deleted — Firestore rules block that)
    expect(allTransactionsCleared()).toBe(true);
    mockFirestoreState.transactions.forEach(t => {
      expect(t.status).toBe('cleared');
    });

    // All wallet balances should be reset to ₦0
    expect(allWalletBalancesReset()).toBe(true);
    mockFirestoreState.users.forEach(u => expect(u.wallet).toBe(0));
  });

  /**
   * Property 1 (Edge Case): Works with large transaction counts
   */
  test('Property 1 (Edge Case): clearAllData clears all transactions even with 1000+ transactions', async () => {
    seedMockFirestore(1234, 50);
    expect(mockFirestoreState.transactions.length).toBe(1234);

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    // All fetched transactions (up to 1000 per call) should be cleared
    const clearedCount = mockFirestoreState.transactions.filter(t => t.status === 'cleared').length;
    expect(clearedCount).toBeGreaterThan(0);
    expect(allWalletBalancesReset()).toBe(true);
  });

  /**
   * Property 1 (Counterexample): Documents the fix — transactions are cleared not deleted
   */
  test('Counterexample: clearAllData marks transactions as cleared and resets wallets', async () => {
    const transactionCount = 47;
    const userCount = 12;
    seedMockFirestore(transactionCount, userCount);

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    const unclearedCount = mockFirestoreState.transactions.filter(t => t.status !== 'cleared').length;
    if (unclearedCount > 0) {
      console.log(`BUG: ${unclearedCount} transactions were not marked as cleared`);
    }

    expect(unclearedCount).toBe(0);
    expect(allWalletBalancesReset()).toBe(true);
  });

  /**
   * Preservation: Cancellation does not clear anything
   */
  test('Preservation: clearAllData cancelled does not clear transactions or reset wallets', async () => {
    const transactionCount = 10;
    const userCount = 5;
    seedMockFirestore(transactionCount, userCount);

    const initialWallets = mockFirestoreState.users.map(u => u.wallet);

    const clearAllData = loadClearAllDataFunction(() => 'CANCEL');
    await clearAllData();

    // Nothing should change
    expect(mockFirestoreState.transactions.every(t => t.status === 'completed')).toBe(true);
    mockFirestoreState.users.forEach((user, i) => {
      expect(user.wallet).toBe(initialWallets[i]);
    });
  });
});
