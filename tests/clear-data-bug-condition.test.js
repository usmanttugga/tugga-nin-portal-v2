/**
 * clearAllData Tests
 *
 * clearAllData resets all user wallet balances to ₦0 and clears localStorage.
 * It does NOT modify transaction records in Firestore (rules block deletion,
 * and marking them would hide real user requests from the admin).
 *
 * **Validates: Requirements 2.2, 2.3, 2.4**
 */

const fs = require('fs');
const path = require('path');

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

const mockLocalStorage = {
  data: {},
  removeItem(key) { delete this.data[key]; },
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; }
};

function loadClearAllDataFunction(promptFn) {
  const html = fs.readFileSync(
    path.resolve(__dirname, '../admin/dashboard.html'),
    'utf8'
  );

  const functionMatch = html.match(/async function clearAllData\(\)\s*{[\s\S]*?^  }/m);
  if (!functionMatch) throw new Error('clearAllData function not found in admin/dashboard.html');

  const mockDocument = {
    getElementById: (id) => id === 'clearDataAlert' ? { innerHTML: '' } : null
  };

  const wrappedFunction = new Function(
    'window', 'localStorage', 'document', 'fbReady', 'toast',
    'loadOverview', 'loadUsers', 'prompt', 'setTimeout', 'Promise',
    `${functionMatch[0]}\nreturn clearAllData;`
  );

  return wrappedFunction(
    { databaseService: mockDatabaseService },
    mockLocalStorage,
    mockDocument,
    mockFbReady,
    mockToast,
    () => {},
    () => {},
    promptFn || (() => 'CLEAR'),
    global.setTimeout,
    global.Promise
  );
}

function resetMockFirestore() {
  mockFirestoreState.transactions = [];
  mockFirestoreState.users = [];
  mockLocalStorage.data = {};
}

function seedMockFirestore({ txnCount = 0, userCount = 0 }) {
  for (let i = 1; i <= txnCount; i++) {
    mockFirestoreState.transactions.push({
      id: `txn-${i}`,
      userId: `user-${(i % Math.max(userCount, 1)) + 1}`,
      service: 'NIN Verification',
      amount: 500,
      status: i % 3 === 0 ? 'submitted' : 'success',
      date: new Date(),
      ref: `TXN-${i}`
    });
  }
  for (let i = 1; i <= userCount; i++) {
    mockFirestoreState.users.push({
      id: `user-${i}`, uid: `user-${i}`,
      name: `User ${i}`, wallet: 1000 * i, role: 'user'
    });
  }
}

describe('clearAllData: resets wallet balances, preserves all transactions', () => {
  beforeEach(() => resetMockFirestore());
  afterEach(() => jest.clearAllMocks());

  test('resets all user wallet balances to ₦0', async () => {
    seedMockFirestore({ txnCount: 10, userCount: 5 });

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    mockFirestoreState.users.forEach(u => expect(u.wallet).toBe(0));
  });

  test('does NOT modify any transaction statuses', async () => {
    seedMockFirestore({ txnCount: 20, userCount: 5 });
    const originalStatuses = mockFirestoreState.transactions.map(t => t.status);

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    // All transactions must remain exactly as they were
    mockFirestoreState.transactions.forEach((t, i) => {
      expect(t.status).toBe(originalStatuses[i]);
    });
  });

  test('clears localStorage transaction cache', async () => {
    seedMockFirestore({ txnCount: 5, userCount: 3 });
    mockLocalStorage.data['tuggaNinPortalV2_tugga_txns'] = JSON.stringify([{ id: 'old' }]);

    const clearAllData = loadClearAllDataFunction(() => 'CLEAR');
    await clearAllData();

    expect(mockLocalStorage.getItem('tuggaNinPortalV2_tugga_txns')).toBeNull();
  });

  test('cancellation does not change anything', async () => {
    seedMockFirestore({ txnCount: 10, userCount: 5 });
    const initialWallets = mockFirestoreState.users.map(u => u.wallet);
    const initialStatuses = mockFirestoreState.transactions.map(t => t.status);

    const clearAllData = loadClearAllDataFunction(() => 'CANCEL');
    await clearAllData();

    mockFirestoreState.users.forEach((u, i) => expect(u.wallet).toBe(initialWallets[i]));
    mockFirestoreState.transactions.forEach((t, i) => expect(t.status).toBe(initialStatuses[i]));
  });
});
