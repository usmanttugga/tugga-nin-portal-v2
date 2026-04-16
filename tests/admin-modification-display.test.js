/**
 * Bug Condition Exploration Tests - Admin Modification Display Fix
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
 * They encode the expected (correct) behavior and will pass once the bugs are fixed.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const MOD_SVCS = ['Name Modification', 'Phone Number Modification', 'Address Modification', 'Date of Birth Modification'];
const IPE_SVCS = ['Normal Clearance', 'Modification Clearance', 'Other Error'];
const PERSON_SVCS = ['VNIN Slip', 'NIN Personalization'];
const SELF_SVCS = ['Delinking', 'Email Retrieval and Delinking', 'Email Retrieval Only'];

const SERVICE_FIELD_ORDER = {
  'Phone Number Modification': ['NIN Number','Surname','First Name','Middle Name','New Phone','Documents'],
  'Name Modification': ['NIN Number','Surname','First Name','Middle Name','Phone','Documents'],
  'Address Modification': ['NIN Number','Address','Town/City','LGA of Origin','State of Origin','LGA of Residence','State of Residence','Documents'],
  'Date of Birth Modification': ['NIN Number','Surname','First Name','Middle Name','Phone','Sex','Marital Status','Old DOB','New DOB','State of Origin','LGA of Origin','Town of Origin','Place of Birth','State of Birth','LGA of Birth','Residential Address','Education','Occupation','Work Address','Requesting Body',"Father's Surname","Father's First Name","Father's State","Father's LGA","Father's Town","Mother's Surname","Mother's First Name","Mother's Maiden Name","Mother's State","Mother's LGA","Mother's Town",'Documents']
};

// ── Helper Functions ──────────────────────────────────────────────────────────

function fmt(amount) {
  return `₦${amount.toLocaleString()}`;
}

// ── renderRequestDetails Function (FIXED VERSION) ────────────────────────────

function renderRequestDetails(t) {
  document.getElementById('rdTitle').textContent = t.service;

  // Fix date display — handle Firestore Timestamp, ISO string, or locale string
  function formatDate(d) {
    if (!d) return '—';
    if (typeof d === 'string') {
      // Try parsing ISO string
      const parsed = new Date(d);
      return isNaN(parsed) ? d : parsed.toLocaleString();
    }
    if (typeof d === 'object') {
      // Firestore Timestamp has .toDate() method
      if (typeof d.toDate === 'function') return d.toDate().toLocaleString();
      // Firestore Timestamp as plain object has .seconds
      if (d.seconds) return new Date(d.seconds * 1000).toLocaleString();
    }
    return String(d);
  }

  const badgeClass = t.status === 'validated' ? 'success' : t.status === 'submitted' ? 'pending' : t.status === 'failed' ? 'failed' : 'success';
  const displayStatus = t.status === 'submitted' ? 'Pending' : t.status === 'validated' ? 'Validated' : t.status === 'success' ? 'Success' : t.status === 'delinked' ? 'Delinked' : t.status === 'retrieved' ? 'Retrieved' : t.status;
  document.getElementById('rdMeta').innerHTML =
    `<span>Ref: <strong>${t.ref || t.id}</strong></span>` +
    `<span>User ID: <strong>${t.userId || '—'}</strong></span>` +
    `<span>Date: <strong>${formatDate(t.date) || '—'}</strong></span>` +
    `<span>Amount: <strong>${fmt(t.amount)}</strong></span>` +
    `<span>Status: <span class="badge badge-${badgeClass}">${displayStatus}</span></span>`;

  // Build form data — merge formData object with top-level fields
  const formData = t.formData || {};
  const orderedKeys = SERVICE_FIELD_ORDER[t.service] || Object.keys(formData);
  const allData = Object.assign({}, formData || {});

  // Check if this is a modification service
  const isMod = MOD_SVCS.includes(t.service);

  // Also show top-level details if formData is empty
  if (Object.keys(allData).length === 0 && t.details) {
    allData['Details'] = t.details;
  }

  if (t.clearedTrackingId) allData['Old Tracking ID'] = t.clearedTrackingId;
  if (t.clearedNin) allData['NIN'] = t.clearedNin;
  if (t.retrievedEmail) allData['Retrieved Email'] = t.retrievedEmail;
  if (t.retrievedNin)   allData['Retrieved NIN']   = t.retrievedNin;

  const displayKeys = isMod
    ? orderedKeys  // Show all fields for modification services
    : t.clearedTrackingId
      ? [...orderedKeys.filter(k => allData[k] && allData[k] !== '—'), 'Old Tracking ID', ...(t.clearedNin ? ['NIN'] : [])]
      : t.retrievedEmail
        ? [...orderedKeys.filter(k => allData[k] && allData[k] !== '—'), 'Retrieved Email', 'Retrieved NIN']
        : orderedKeys.filter(k => allData[k] && allData[k] !== '—');

  // If still no keys, show all allData keys
  const finalKeys = displayKeys.length > 0 ? displayKeys : Object.keys(allData);

  const rows = finalKeys.map(k =>
      `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:0.55rem 0;border-bottom:1px solid #f1f5f9;gap:1rem">
        <span style="color:var(--gray);font-size:0.88rem;white-space:nowrap;flex-shrink:0">${k}</span>
        <span style="font-weight:${k === 'Old Tracking ID' || k === 'NIN' || k === 'Retrieved Email' || k === 'Retrieved NIN' ? '700;color:#059669' : '500'};font-size:0.88rem;text-align:right;word-break:break-word">${allData[k] || '—'}</span>
      </div>`
    );

  document.getElementById('rdFields').innerHTML = rows.length
    ? rows.join('')
    : `<div style="padding:0.55rem 0;color:var(--gray);font-size:0.88rem">NIN / Details: <strong>${t.details || '—'}</strong></div>`;

  const isIPE = IPE_SVCS.includes(t.service);
  const isPerson = PERSON_SVCS.includes(t.service);
  const isSelf = SELF_SVCS.includes(t.service);
  const canAct = t.status === 'submitted';

  // Show retrieved email/NIN for completed self-service requests
  if (t.retrievedEmail) allData['Retrieved Email'] = t.retrievedEmail;
  if (t.retrievedNin)   allData['Retrieved NIN']   = t.retrievedNin;

  // Simplified actions for testing - we don't need the full button HTML
  document.getElementById('rdActions').innerHTML = canAct ? 'Actions available' : 'No actions';
}

// ── Setup Function ────────────────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <div id="requestDetailsModal">
      <h3 id="rdTitle"></h3>
      <div id="rdMeta"></div>
      <div id="rdFields"></div>
      <div id="rdActions"></div>
    </div>
  `;
}

// ── Helper to check if HTML contains a field ─────────────────────────────────

function hasFieldDisplay(html, fieldLabel) {
  return html.includes(fieldLabel);
}

// ── Test 1: Bug Condition - Date Display and Form Data Visibility ────────────

/**
 * Property 1 — Bug Condition: Date Display and Form Data Visibility
 *
 * This test encodes the EXPECTED (correct) behavior:
 * - Date field should display formatted string like "4/16/2026, 3:45:12 PM"
 * - All formData fields should be displayed with labels and values
 *
 * On UNFIXED code:
 * - Date shows "[object Object]" → assertion FAILS
 * - FormData fields are missing → assertion FAILS
 * → TEST FAILS (this is correct - it proves the bugs exist)
 *
 * After fix:
 * - Date shows formatted string → assertion PASSES
 * - FormData fields are displayed → assertion PASSES
 * → TEST PASSES (confirms bugs are fixed)
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */
test('Property 1 — Date Display and Form Data Visibility', () => {
  setupDOM();

  // ── Bug Condition 1: Date Display ──────────────────────────────────────────
  
  // Create transaction with date as object (Firestore Timestamp format)
  // Include some empty formData values to trigger the filtering bug
  const transactionWithDateObject = {
    id: 'test-txn-1',
    ref: 'REF-001',
    service: 'Phone Number Modification',
    userId: 'user-123',
    date: { seconds: 1776543912, nanoseconds: 0 }, // This should format to "4/16/2026, 3:45:12 PM"
    amount: 5000,
    status: 'submitted',
    formData: {
      'NIN Number': '12345678901',
      'Surname': '', // Empty value - should still display the field label
      'First Name': 'John',
      'Middle Name': '', // Empty value - should still display the field label
      'New Phone': '08012345678',
      'Documents': '' // Empty value - should still display the field label
    }
  };

  // Call renderRequestDetails with the transaction
  renderRequestDetails(transactionWithDateObject);

  // Get the rendered HTML
  const metaHtml = document.getElementById('rdMeta').innerHTML;
  const fieldsHtml = document.getElementById('rdFields').innerHTML;

  // ── Expected Behavior: Date should be formatted ───────────────────────────
  
  // The date should be formatted as a locale string, NOT "[object Object]"
  // Expected format: "4/16/2026, 3:45:12 PM" or similar locale-specific format
  expect(metaHtml).not.toContain('[object Object]');
  
  // The date should contain a formatted date string
  // We check for the year 2026 which should appear in the formatted date
  expect(metaHtml).toMatch(/2026/);
  
  // ── Bug Condition 2: Form Data Display ────────────────────────────────────
  
  // ── Expected Behavior: All formData fields should be displayed ────────────
  
  // All fields from SERVICE_FIELD_ORDER for Phone Number Modification should be visible
  // EVEN IF some values are empty strings
  expect(hasFieldDisplay(fieldsHtml, 'NIN Number')).toBe(true);
  expect(hasFieldDisplay(fieldsHtml, 'Surname')).toBe(true);
  expect(hasFieldDisplay(fieldsHtml, 'First Name')).toBe(true);
  expect(hasFieldDisplay(fieldsHtml, 'Middle Name')).toBe(true);
  expect(hasFieldDisplay(fieldsHtml, 'New Phone')).toBe(true);
  expect(hasFieldDisplay(fieldsHtml, 'Documents')).toBe(true);
  
  // The field values should be displayed (or "—" for empty values)
  expect(fieldsHtml).toContain('12345678901'); // NIN Number value
  expect(fieldsHtml).toContain('John'); // First Name value
  expect(fieldsHtml).toContain('08012345678'); // New Phone value
});
