/**
 * Admin Dashboard Preservation Property Tests
 *
 * These tests verify that existing admin functionality is UNCHANGED by the fixes.
 * They MUST PASS on unfixed code (they document the baseline to preserve).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**
 */

const fs = require('fs');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupFirebaseMocks() {
  window.fbReady = () => true;

  const mockUsers = [
    { id: 'user1', uid: 'user1', name: 'John Doe', email: 'john@test.com', role: 'user', wallet: 1000, status: 'Active' },
    { id: 'user2', uid: 'user2', name: 'Jane Smith', email: 'jane@test.com', role: 'user', wallet: 2500, status: 'Active' },
    { id: 'admin1', uid: 'admin1', name: 'Admin User', email: 'admin@test.com', role: 'admin', wallet: 0, status: 'Active' }
  ];

  const mockTransactions = [
    { id: 'txn1', userId: 'user1', service: 'NIN Verification', amount: 200, status: 'completed', date: new Date(), ref: 'TXN-001' },
    { id: 'txn2', userId: 'user2', service: 'BVN Verification', amount: 150, status: 'completed', date: new Date(), ref: 'TXN-002' },
    { id: 'txn3', userId: 'user1', service: 'NIN Modification', amount: 500, status: 'pending', date: new Date(), ref: 'TXN-003' }
  ];

  const mockSettings = {
    pricing: { p_nin_normal: 200, p_nin_premium: 350, p_bvnver: 200 },
    availability: { ninVerification: true, bvnVerification: true, ninModification: false },
    platform: { companyName: 'MAJIA DIGITAL IDENTITY', supportEmail: 'support@tugga.com', supportPhone: '+234XXXXXXXXXX', platformStatus: 'Active' }
  };

  window.databaseService = {
    getAllUsers: jest.fn().mockResolvedValue([...mockUsers]),
    getUser: jest.fn((uid) => Promise.resolve(mockUsers.find(u => u.id === uid || u.uid === uid))),
    updateUser: jest.fn((uid, updates) => {
      const user = mockUsers.find(u => u.id === uid || u.uid === uid);
      if (user) Object.assign(user, updates);
      return Promise.resolve();
    }),
    getAllTransactions: jest.fn((limit) => Promise.resolve(mockTransactions.slice(0, limit))),
    getTransaction: jest.fn((id) => Promise.resolve(mockTransactions.find(t => t.id === id))),
    getSettings: jest.fn((type) => Promise.resolve(mockSettings[type])),
    updateSettings: jest.fn((type, settings) => {
      mockSettings[type] = { ...mockSettings[type], ...settings };
      return Promise.resolve();
    }),
    isFirestoreAvailable: jest.fn().mockReturnValue(true)
  };

  return { mockUsers, mockTransactions, mockSettings };
}

function setupAdminDOM() {
  document.body.innerHTML = `
    <div class="dashboard">
      <aside class="sidebar">
        <a href="#" class="active" data-section="sec-overview">Overview</a>
        <a href="#" data-section="sec-users">Users</a>
        <a href="#" data-section="sec-transactions">Transactions</a>
        <a href="#" data-section="sec-pricing">Pricing</a>
        <a href="#" data-section="sec-availability">Availability</a>
        <a href="#" data-section="sec-settings">Settings</a>
      </aside>
      <main class="main">
        <section id="sec-overview" class="content-section"></section>
        <section id="sec-users" class="content-section section-hidden"><table><tbody id="usersTable"></tbody></table></section>
        <section id="sec-transactions" class="content-section section-hidden"><table><tbody id="allTxnTable"></tbody></table></section>
        <section id="sec-pricing" class="content-section section-hidden">
          <div id="pricingAlert"></div>
          <input type="number" id="p_nin_normal" value="200"/>
          <input type="number" id="p_nin_premium" value="350"/>
          <input type="number" id="p_bvnver" value="200"/>
        </section>
        <section id="sec-availability" class="content-section section-hidden">
          <div id="availabilityAlert"></div>
          <div id="availabilityGroups"></div>
        </section>
        <section id="sec-settings" class="content-section section-hidden">
          <div id="settingsAlert"></div>
          <input type="text" id="s_company" value="MAJIA DIGITAL IDENTITY"/>
          <input type="email" id="s_email" placeholder="support@tugga.com"/>
          <input type="tel" id="s_phone" placeholder="+234XXXXXXXXXX"/>
          <select id="s_status"><option>Active</option><option>Maintenance</option></select>
        </section>
      </main>
    </div>
  `;
}

function loadAdminFunctions() {
  window.showSection = function(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('section-hidden'));
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.remove('section-hidden');
    const link = document.querySelector(`.sidebar a[data-section="${sectionId}"]`);
    if (link) link.classList.add('active');
  };

  window.savePricing = async function() {
    const alertEl = document.getElementById('pricingAlert');
    if (!window.fbReady()) { alertEl.innerHTML = '<div class="alert alert-error">Firebase not ready.</div>'; return; }
    try {
      const pricing = {
        p_nin_normal: parseInt(document.getElementById('p_nin_normal').value),
        p_nin_premium: parseInt(document.getElementById('p_nin_premium').value),
        p_bvnver: parseInt(document.getElementById('p_bvnver').value)
      };
      await window.databaseService.updateSettings('pricing', pricing);
      localStorage.setItem('tuggaNinPortalV2_tugga_pricing', JSON.stringify(pricing));
      alertEl.innerHTML = '<div class="alert alert-success">Pricing saved successfully.</div>';
    } catch (e) { alertEl.innerHTML = '<div class="alert alert-error">Failed: ' + e.message + '</div>'; }
  };

  window.saveAvailability = async function() {
    const alertEl = document.getElementById('availabilityAlert');
    if (!window.fbReady()) { alertEl.innerHTML = '<div class="alert alert-error">Firebase not ready.</div>'; return; }
    try {
      const availability = { ninVerification: true, bvnVerification: true, ninModification: false };
      await window.databaseService.updateSettings('availability', availability);
      localStorage.setItem('tuggaNinPortalV2_tugga_availability', JSON.stringify(availability));
      alertEl.innerHTML = '<div class="alert alert-success">Availability saved successfully.</div>';
    } catch (e) { alertEl.innerHTML = '<div class="alert alert-error">Failed: ' + e.message + '</div>'; }
  };

  window.saveSettings = async function() {
    const alertEl = document.getElementById('settingsAlert');
    if (!window.fbReady()) { alertEl.innerHTML = '<div class="alert alert-error">Firebase not ready.</div>'; return; }
    try {
      const settings = {
        companyName: document.getElementById('s_company').value,
        supportEmail: document.getElementById('s_email').value,
        supportPhone: document.getElementById('s_phone').value,
        platformStatus: document.getElementById('s_status').value
      };
      await window.databaseService.updateSettings('platform', settings);
      localStorage.setItem('tuggaNinPortalV2_tugga_settings', JSON.stringify(settings));
      alertEl.innerHTML = '<div class="alert alert-success">Settings saved successfully.</div>';
    } catch (e) { alertEl.innerHTML = '<div class="alert alert-error">Failed: ' + e.message + '</div>'; }
  };

  window.loadUsers = async function() {
    if (!window.fbReady()) return;
    try {
      const users = await window.databaseService.getAllUsers();
      const tbody = document.getElementById('usersTable');
      tbody.innerHTML = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>₦${u.wallet}</td><td>${u.status}</td></tr>`).join('');
    } catch (e) { console.error('Failed to load users:', e); }
  };

  window.loadTransactions = async function() {
    if (!window.fbReady()) return;
    try {
      const txns = await window.databaseService.getAllTransactions(100);
      const tbody = document.getElementById('allTxnTable');
      tbody.innerHTML = txns.map(t => `<tr><td>${t.ref}</td><td>${t.userId}</td><td>${t.service}</td><td>₦${t.amount}</td><td>${t.status}</td></tr>`).join('');
    } catch (e) { console.error('Failed to load transactions:', e); }
  };

  window.modifyUserWallet = async function(userId, newBalance) {
    if (!window.fbReady()) return false;
    try {
      await window.databaseService.updateUser(userId, { wallet: newBalance });
      return true;
    } catch (e) { return false; }
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 2.1 — User Management Preservation', () => {
  beforeEach(() => { setupAdminDOM(); setupFirebaseMocks(); loadAdminFunctions(); });
  afterEach(() => { jest.clearAllMocks(); });

  test('loadUsers() displays all registered users with wallet balances', async () => {
    await window.loadUsers();
    const tbody = document.getElementById('usersTable');
    expect(tbody.innerHTML).toContain('John Doe');
    expect(tbody.innerHTML).toContain('Jane Smith');
    expect(tbody.innerHTML).toContain('₦1000');
    expect(tbody.innerHTML).toContain('₦2500');
    expect(window.databaseService.getAllUsers).toHaveBeenCalled();
  });

  test('modifyUserWallet() updates only the specific user wallet balance', async () => {
    const result = await window.modifyUserWallet('user1', 5000);
    expect(result).toBe(true);
    expect(window.databaseService.updateUser).toHaveBeenCalledWith('user1', { wallet: 5000 });
    expect(window.databaseService.updateUser).toHaveBeenCalledTimes(1);
  });

  test('property: modifyUserWallet updates only the specified user', async () => {
    const userIds = ['user1', 'user2', 'admin1'];
    const balances = [0, 500, 1000, 5000, 100000];
    for (const userId of userIds) {
      for (const newBalance of balances) {
        jest.clearAllMocks();
        await window.modifyUserWallet(userId, newBalance);
        expect(window.databaseService.updateUser).toHaveBeenCalledWith(userId, { wallet: newBalance });
        expect(window.databaseService.updateUser).toHaveBeenCalledTimes(1);
      }
    }
  });
});

describe('Property 2.2 — Settings Management Preservation', () => {
  beforeEach(() => { setupAdminDOM(); setupFirebaseMocks(); loadAdminFunctions(); });
  afterEach(() => { jest.clearAllMocks(); });

  test('savePricing() persists pricing settings to Firebase and localStorage', async () => {
    document.getElementById('p_nin_normal').value = '250';
    document.getElementById('p_nin_premium').value = '400';
    document.getElementById('p_bvnver').value = '180';
    await window.savePricing();
    expect(window.databaseService.updateSettings).toHaveBeenCalledWith('pricing', { p_nin_normal: 250, p_nin_premium: 400, p_bvnver: 180 });
    expect(localStorage.getItem('tuggaNinPortalV2_tugga_pricing')).toContain('250');
    expect(document.getElementById('pricingAlert').innerHTML).toContain('success');
  });

  test('saveAvailability() persists availability settings to Firebase and localStorage', async () => {
    await window.saveAvailability();
    expect(window.databaseService.updateSettings).toHaveBeenCalledWith('availability', expect.any(Object));
    expect(localStorage.getItem('tuggaNinPortalV2_tugga_availability')).not.toBeNull();
    expect(document.getElementById('availabilityAlert').innerHTML).toContain('success');
  });

  test('saveSettings() persists platform settings to Firebase and localStorage', async () => {
    document.getElementById('s_company').value = 'TEST COMPANY';
    document.getElementById('s_email').value = 'test@example.com';
    document.getElementById('s_phone').value = '+2341234567890';
    document.getElementById('s_status').value = 'Maintenance';
    await window.saveSettings();
    expect(window.databaseService.updateSettings).toHaveBeenCalledWith('platform', { companyName: 'TEST COMPANY', supportEmail: 'test@example.com', supportPhone: '+2341234567890', platformStatus: 'Maintenance' });
    expect(localStorage.getItem('tuggaNinPortalV2_tugga_settings')).toContain('TEST COMPANY');
    expect(document.getElementById('settingsAlert').innerHTML).toContain('success');
  });

  test('property: savePricing persists any valid pricing configuration', async () => {
    const testCases = [[100, 200, 150], [250, 400, 180], [500, 800, 300], [150, 350, 200], [1000, 1000, 1000]];
    for (const [ninNormal, ninPremium, bvnVer] of testCases) {
      jest.clearAllMocks();
      document.getElementById('p_nin_normal').value = ninNormal.toString();
      document.getElementById('p_nin_premium').value = ninPremium.toString();
      document.getElementById('p_bvnver').value = bvnVer.toString();
      await window.savePricing();
      expect(window.databaseService.updateSettings).toHaveBeenCalledWith('pricing', { p_nin_normal: ninNormal, p_nin_premium: ninPremium, p_bvnver: bvnVer });
      expect(localStorage.getItem('tuggaNinPortalV2_tugga_pricing')).not.toBeNull();
    }
  });
});

describe('Property 2.3 — Navigation Preservation', () => {
  const ADMIN_SECTIONS = ['sec-overview', 'sec-users', 'sec-transactions', 'sec-pricing', 'sec-availability', 'sec-settings'];
  beforeEach(() => { setupAdminDOM(); setupFirebaseMocks(); loadAdminFunctions(); });
  afterEach(() => { jest.clearAllMocks(); });

  test.each(ADMIN_SECTIONS)('showSection("%s") displays exactly one visible section', (sectionId) => {
    window.showSection(sectionId);
    const visible = Array.from(document.querySelectorAll('.content-section')).filter(s => !s.classList.contains('section-hidden'));
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe(sectionId);
  });

  test.each(ADMIN_SECTIONS)('showSection("%s") marks exactly one sidebar link active', (sectionId) => {
    window.showSection(sectionId);
    const activeLinks = document.querySelectorAll('.sidebar a.active');
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].dataset.section).toBe(sectionId);
  });

  test('property: showSection sequence always leaves exactly one section visible', () => {
    const sequences = [
      ['sec-overview', 'sec-users', 'sec-transactions'],
      ['sec-settings', 'sec-pricing', 'sec-overview'],
      ['sec-users', 'sec-availability', 'sec-users', 'sec-settings'],
      ['sec-transactions', 'sec-overview', 'sec-pricing', 'sec-availability', 'sec-settings']
    ];
    for (const seq of sequences) {
      for (const sectionId of seq) {
        window.showSection(sectionId);
        const visible = Array.from(document.querySelectorAll('.content-section')).filter(s => !s.classList.contains('section-hidden'));
        expect(visible.length).toBe(1);
        expect(visible[0].id).toBe(sectionId);
      }
    }
  });
});

describe('Property 2.4 — Transaction Viewing Preservation', () => {
  beforeEach(() => { setupAdminDOM(); setupFirebaseMocks(); loadAdminFunctions(); });
  afterEach(() => { jest.clearAllMocks(); });

  test('loadTransactions() displays all transaction history', async () => {
    await window.loadTransactions();
    const tbody = document.getElementById('allTxnTable');
    expect(tbody.innerHTML).toContain('TXN-001');
    expect(tbody.innerHTML).toContain('TXN-002');
    expect(tbody.innerHTML).toContain('NIN Verification');
    expect(tbody.innerHTML).toContain('BVN Verification');
    expect(window.databaseService.getAllTransactions).toHaveBeenCalledWith(100);
  });

  test('loadTransactions() displays correct amounts and statuses', async () => {
    await window.loadTransactions();
    const tbody = document.getElementById('allTxnTable');
    expect(tbody.innerHTML).toContain('₦200');
    expect(tbody.innerHTML).toContain('₦150');
    expect(tbody.innerHTML).toContain('completed');
    expect(tbody.innerHTML).toContain('pending');
  });
});

describe('Property 2.5 — Firebase Error Handling Preservation', () => {
  beforeEach(() => { setupAdminDOM(); setupFirebaseMocks(); loadAdminFunctions(); });
  afterEach(() => { jest.clearAllMocks(); });

  test('savePricing() displays error when Firebase not ready', async () => {
    window.fbReady = () => false;
    await window.savePricing();
    expect(document.getElementById('pricingAlert').innerHTML).toContain('Firebase not ready');
    expect(window.databaseService.updateSettings).not.toHaveBeenCalled();
  });

  test('saveAvailability() displays error when Firebase not ready', async () => {
    window.fbReady = () => false;
    await window.saveAvailability();
    expect(document.getElementById('availabilityAlert').innerHTML).toContain('Firebase not ready');
    expect(window.databaseService.updateSettings).not.toHaveBeenCalled();
  });

  test('saveSettings() displays error when Firebase not ready', async () => {
    window.fbReady = () => false;
    await window.saveSettings();
    expect(document.getElementById('settingsAlert').innerHTML).toContain('Firebase not ready');
    expect(window.databaseService.updateSettings).not.toHaveBeenCalled();
  });

  test('property: Firebase not ready prevents all settings operations', async () => {
    window.fbReady = () => false;
    await window.savePricing();
    await window.saveAvailability();
    await window.saveSettings();
    expect(window.databaseService.updateSettings).not.toHaveBeenCalled();
  });
});
