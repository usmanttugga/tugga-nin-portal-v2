/**
 * Bug Condition Exploration Test - Clear All Data
 *
 * **Property 1** - clearAllData clears completed transactions and resets wallets,
 * but preserves pending (submitted) requests so admins can still process them.
 *
 * NOTE: Firestore security rules block transaction deletion (audit trail protection).
 * The correct fix marks completed transactions as status:'cleared' via updateTransaction.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

const fs = require('fs');
const path = require('path');

// ── Mock Firebase/Firestore ──────────────────────────────────────────────────

const mockFirestoreState = {
  transactions: [],
  users: []
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
    `${functionMatch[0]}\nreturn clearAllData;`
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

function seedMockFirestore({ completedCount = 0, pendingCount = 0, userCount = 0 }) {
  for (let i = 1; i <= completedCount; i++) {
    mockFirestoreState.transactions.push({
      id: `txn-completed-${i}`,
      userId: `user-${(i % Math.max(userCount, 1)) + 1}`,
      service: 'NIN Verification',
      amount: 500,
      status: 'success',
      date: new Date(),
      ref: `TXN-DONE-${i}`
    });
  }
  for (let i = 1; i <= pendingCount; i++) {
    mockFirestoreState.transactions.push({
      id: `txn-pending-${i}`,
      userId: `user-${(i % Math.max(userCount, 1)) + 1}`,
      service: 'Phone Number Modification',
      amount: 500,
      status: 'submitted',
      date: new Date(),
      ref: `TXN-PEND-${i}`
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('clearAllData: clears history and balances, preserves pending requests', () => {
  beforeEach(() => resetMockFirestore());
  afterEach(() => jest.clearAllMocks());

  /**
   * Property 1: Completed transactions are marked cleared, wallets reset
   */
  test('Property 1: clears completed transactions and resets all wallet balances', async () => {
    seedMockFirestore({ completedCount: 47, pendingCount: 0, userCount: 12 });

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    // All completed transactions should be marked as cleared
    const completed = mockFirestoreState.transactions.filter(t => t.id.startsWith('txn-completed'));
    completed.forEach(t => expect(t.status).toBe('cleared'));

    // All wallet balances should be reset to ₦0
    mockFirestoreState.users.forEach(u => expect(u.wallet).toBe(0));
  });

  /**
   * Property 2: Pending (submitted) requests are NOT cleared — admin must still process them
   */
  test('Property 2: pending (submitted) requests are preserved and not cleared', async () => {
    seedMockFirestore({ completedCount: 20, pendingCount: 5, userCount: 8 });

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    // Pending requests must remain as 'submitted' — admin still needs to process them
    const pending = mockFirestoreState.transactions.filter(t => t.id.startsWith('txn-pending'));
    pending.forEach(t => expect(t.status).toBe('submitted'));

    // Completed ones should be cleared
    const completed = mockFirestoreState.transactions.filter(t => t.id.startsWith('txn-completed'));
    completed.forEach(t => expect(t.status).toBe('cleared'));
  });

  /**
   * Property 3: Works with large transaction counts
   */
  test('Property 3: clears all completed transactions even with large counts', async () => {
    seedMockFirestore({ completedCount: 500, pendingCount: 10, userCount: 50 });

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    const clearedCount = mockFirestoreState.transactions.filter(t => t.status === 'cleared').length;
    expect(clearedCount).toBe(500);

    const stillPending = mockFirestoreState.transactions.filter(t => t.status === 'submitted').length;
    expect(stillPending).toBe(10);

    mockFirestoreState.users.forEach(u => expect(u.wallet).toBe(0));
  });

  /**
   * Preservation: Cancellation does not change anything
   */
  test('Preservation: cancellation does not clear transactions or reset wallets', async () => {
    seedMockFirestore({ completedCount: 10, pendingCount: 3, userCount: 5 });

    const initialWallets = mockFirestoreState.users.map(u => u.wallet);
    const initialStatuses = mockFirestoreState.transactions.map(t => t.status);

    const clearAllData = loadClearAllDataFunction(() => 'CANCEL');
    await clearAllData();

    mockFirestoreState.transactions.forEach((t, i) => expect(t.status).toBe(initialStatuses[i]));
    mockFirestoreState.users.forEach((u, i) => expect(u.wallet).toBe(initialWallets[i]));
  });
});
