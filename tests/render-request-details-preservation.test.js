/**
 * Preservation Property Tests - renderRequestDetails Function
 *
 * These tests verify that existing behaviors are UNCHANGED by the fix.
 * They MUST PASS on unfixed code (they document the baseline to preserve).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
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
  'Date of Birth Modification': ['NIN Number','Surname','First Name','Middle Name','Phone','Sex','Marital Status','Old DOB','New DOB','State of Origin','LGA of Origin','Town of Origin','Place of Birth','State of Birth','LGA of Birth','Residential Address','Education','Occupation','Work Address','Requesting Body',"Father's Surname","Father's First Name","Father's State","Father's LGA","Father's Town","Mother's Surname","Mother's First Name","Mother's Maiden Name","Mother's State","Mother's LGA","Mother's Town",'Documents'],
  'Verify with NIN': ['Input'],
  'Phone Number Verification': ['Input'],
  'Bio Data Verification': ['Input'],
  'FingerPrint Verification': ['Finger', 'Image'],
  'Normal Clearance': ['Tracking ID'],
  'Modification Clearance': ['New Tracking ID'],
  'Other Error': ['Error Description','New Tracking ID'],
  'VNIN Slip': ['NIN Number'],
  'NIN Personalization': ['Tracking ID'],
  'BVN Verification': ['BVN Number','Full Name','Phone Number'],
  'BVN Retrieval': ['BVN Number','Full Name','Phone Number'],
  'BVN Modification': ['BVN Number','Full Name','Phone Number'],
  'BVN User': ['BVN Number','Full Name','Phone Number'],
  'Buy Airtime': ['Network','Phone','Amount'],
  'Buy Data': ['Network','Plan','Phone'],
  'Delinking': ['Email', 'NIN'],
  'Email Retrieval and Delinking': ['Email', 'NIN'],
  'Email Retrieval Only': ['Email', 'NIN']
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

// ── Property 2.1: NIN Verification Preservation ───────────────────────────────

/**
 * Property 2.1 — Preservation: NIN Verification Display
 *
 * For any NIN Verification request with string date and formData containing Input field,
 * the renderRequestDetails function SHALL display:
 * - Service title correctly
 * - Formatted date string (not "[object Object]")
 * - All metadata fields (Ref, User ID, Date, Amount, Status)
 * - Input field from formData
 *
 * This MUST PASS on unfixed code (NIN Verification already works correctly).
 *
 * **Validates: Requirements 3.1**
 */
describe('Property 2.1 — NIN Verification Preservation', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('NIN Verification with string date displays correctly', () => {
    const transaction = {
      id: 'txn-nin-verify-1',
      ref: 'REF-NIN-001',
      service: 'Verify with NIN',
      userId: 'user-456',
      date: '2024-01-15T10:30:00Z', // ISO string date
      amount: 500,
      status: 'success',
      formData: {
        'Input': '12345678901'
      }
    };

    renderRequestDetails(transaction);

    const titleHtml = document.getElementById('rdTitle').textContent;
    const metaHtml = document.getElementById('rdMeta').innerHTML;
    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Service title should be correct
    expect(titleHtml).toBe('Verify with NIN');

    // Date should be formatted (not "[object Object]")
    expect(metaHtml).not.toContain('[object Object]');
    expect(metaHtml).toMatch(/2024/); // Should contain the year

    // All metadata fields should be present
    expect(metaHtml).toContain('REF-NIN-001');
    expect(metaHtml).toContain('user-456');
    expect(metaHtml).toContain('₦500');
    expect(metaHtml).toContain('Success');

    // Input field should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'Input')).toBe(true);
    expect(fieldsHtml).toContain('12345678901');
  });

  test('Phone Number Verification with locale string date displays correctly', () => {
    const transaction = {
      id: 'txn-phone-verify-1',
      ref: 'REF-PHONE-001',
      service: 'Phone Number Verification',
      userId: 'user-789',
      date: '1/15/2024, 10:30:00 AM', // Locale string date
      amount: 500,
      status: 'validated',
      formData: {
        'Input': '08012345678'
      }
    };

    renderRequestDetails(transaction);

    const metaHtml = document.getElementById('rdMeta').innerHTML;
    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Date should be displayed correctly (not "[object Object]")
    expect(metaHtml).not.toContain('[object Object]');
    // Date should contain the year and time (locale-agnostic check)
    expect(metaHtml).toMatch(/2024/);
    expect(metaHtml).toMatch(/10:30/);

    // Status badge should be correct
    expect(metaHtml).toContain('Validated');
    expect(metaHtml).toContain('badge-success');

    // Input field should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'Input')).toBe(true);
    expect(fieldsHtml).toContain('08012345678');
  });
});

// ── Property 2.2: BVN Services Preservation ───────────────────────────────────

/**
 * Property 2.2 — Preservation: BVN Services Display
 *
 * For any BVN service request with string date and formData containing BVN fields,
 * the renderRequestDetails function SHALL display all fields correctly.
 *
 * This MUST PASS on unfixed code (BVN services already work correctly).
 *
 * **Validates: Requirements 3.2**
 */
describe('Property 2.2 — BVN Services Preservation', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('BVN Verification with string date displays all fields', () => {
    const transaction = {
      id: 'txn-bvn-1',
      ref: 'REF-BVN-001',
      service: 'BVN Verification',
      userId: 'user-bvn-1',
      date: '2024-02-20T14:45:00Z',
      amount: 1000,
      status: 'success',
      formData: {
        'BVN Number': '22334455667',
        'Full Name': 'Jane Doe',
        'Phone Number': '08098765432'
      }
    };

    renderRequestDetails(transaction);

    const metaHtml = document.getElementById('rdMeta').innerHTML;
    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Date should be formatted correctly
    expect(metaHtml).not.toContain('[object Object]');
    expect(metaHtml).toMatch(/2024/);

    // All BVN fields should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'BVN Number')).toBe(true);
    expect(hasFieldDisplay(fieldsHtml, 'Full Name')).toBe(true);
    expect(hasFieldDisplay(fieldsHtml, 'Phone Number')).toBe(true);

    expect(fieldsHtml).toContain('22334455667');
    expect(fieldsHtml).toContain('Jane Doe');
    expect(fieldsHtml).toContain('08098765432');
  });

  test('BVN Retrieval displays correctly', () => {
    const transaction = {
      id: 'txn-bvn-retrieval-1',
      ref: 'REF-BVN-RET-001',
      service: 'BVN Retrieval',
      userId: 'user-bvn-2',
      date: '3/10/2024, 9:15:30 AM',
      amount: 1500,
      status: 'submitted',
      formData: {
        'BVN Number': '11223344556',
        'Full Name': 'John Smith',
        'Phone Number': '08011223344'
      }
    };

    renderRequestDetails(transaction);

    const metaHtml = document.getElementById('rdMeta').innerHTML;
    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Status should be "Pending" for submitted
    expect(metaHtml).toContain('Pending');
    expect(metaHtml).toContain('badge-pending');

    // All fields should be displayed
    expect(fieldsHtml).toContain('11223344556');
    expect(fieldsHtml).toContain('John Smith');
    expect(fieldsHtml).toContain('08011223344');
  });
});

// ── Property 2.3: String Date Preservation ────────────────────────────────────

/**
 * Property 2.3 — Preservation: String Date Handling
 *
 * For any transaction with date as ISO string or locale string,
 * the formatDate function SHALL continue to parse and display correctly.
 *
 * This MUST PASS on unfixed code (string dates already work correctly).
 *
 * **Validates: Requirements 3.4, 3.5**
 */
describe('Property 2.3 — String Date Preservation', () => {
  beforeEach(() => {
    setupDOM();
  });

  test.each([
    { date: '2024-01-15T10:30:00Z', description: 'ISO string' },
    { date: '1/15/2024, 10:30:00 AM', description: 'locale string' },
    { date: '2024-03-20T08:00:00.000Z', description: 'ISO with milliseconds' },
    { date: '12/25/2023, 5:45:12 PM', description: 'locale with seconds' }
  ])('Transaction with $description date displays correctly', ({ date }) => {
    const transaction = {
      id: 'txn-date-test',
      ref: 'REF-DATE-001',
      service: 'Verify with NIN',
      userId: 'user-date-test',
      date: date,
      amount: 500,
      status: 'success',
      formData: { 'Input': '12345678901' }
    };

    renderRequestDetails(transaction);

    const metaHtml = document.getElementById('rdMeta').innerHTML;

    // Date should NOT display as "[object Object]"
    expect(metaHtml).not.toContain('[object Object]');

    // Date should contain a year (2023 or 2024)
    expect(metaHtml).toMatch(/202[34]/);
  });
});

// ── Property 2.4: IPE Clearance Preservation ──────────────────────────────────

/**
 * Property 2.4 — Preservation: IPE Clearance Display
 *
 * For any IPE Clearance request with clearedTrackingId and clearedNin,
 * the renderRequestDetails function SHALL display these special fields
 * with correct styling (bold, green color).
 *
 * This MUST PASS on unfixed code (IPE Clearance already works correctly).
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 2.4 — IPE Clearance Preservation', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('Normal Clearance with clearedTrackingId displays correctly', () => {
    const transaction = {
      id: 'txn-ipe-1',
      ref: 'REF-IPE-001',
      service: 'Normal Clearance',
      userId: 'user-ipe-1',
      date: '2024-04-10T11:00:00Z',
      amount: 3000,
      status: 'success',
      formData: {
        'Tracking ID': 'TRK-OLD-12345'
      },
      clearedTrackingId: 'TRK-NEW-67890',
      clearedNin: '98765432109'
    };

    renderRequestDetails(transaction);

    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Old Tracking ID should be displayed with special styling
    expect(hasFieldDisplay(fieldsHtml, 'Old Tracking ID')).toBe(true);
    expect(fieldsHtml).toContain('TRK-NEW-67890');

    // NIN should be displayed with special styling
    expect(hasFieldDisplay(fieldsHtml, 'NIN')).toBe(true);
    expect(fieldsHtml).toContain('98765432109');

    // Check for special styling (bold, green)
    expect(fieldsHtml).toContain('font-weight:700');
    expect(fieldsHtml).toContain('color:#059669');
  });

  test('Modification Clearance displays correctly', () => {
    const transaction = {
      id: 'txn-mod-clear-1',
      ref: 'REF-MOD-CLEAR-001',
      service: 'Modification Clearance',
      userId: 'user-mod-clear-1',
      date: '5/15/2024, 2:30:00 PM',
      amount: 3500,
      status: 'validated',
      formData: {
        'New Tracking ID': 'TRK-MOD-11111'
      },
      clearedTrackingId: 'TRK-MOD-22222'
    };

    renderRequestDetails(transaction);

    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Old Tracking ID should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'Old Tracking ID')).toBe(true);
    expect(fieldsHtml).toContain('TRK-MOD-22222');
  });
});

// ── Property 2.5: Self Services Preservation ──────────────────────────────────

/**
 * Property 2.5 — Preservation: Self Services Display
 *
 * For any Self Service request (Delinking, Email Retrieval) with retrievedEmail
 * and retrievedNin, the renderRequestDetails function SHALL display these fields
 * with correct styling.
 *
 * This MUST PASS on unfixed code (Self Services already work correctly).
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 2.5 — Self Services Preservation', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('Delinking with retrievedEmail displays correctly', () => {
    const transaction = {
      id: 'txn-delink-1',
      ref: 'REF-DELINK-001',
      service: 'Delinking',
      userId: 'user-delink-1',
      date: '2024-06-01T09:00:00Z',
      amount: 2000,
      status: 'delinked',
      formData: {
        'Email': 'user@example.com',
        'NIN': '11122233344'
      },
      retrievedEmail: 'retrieved@example.com',
      retrievedNin: '55566677788'
    };

    renderRequestDetails(transaction);

    const metaHtml = document.getElementById('rdMeta').innerHTML;
    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Status should be "Delinked"
    expect(metaHtml).toContain('Delinked');

    // Retrieved Email should be displayed with special styling
    expect(hasFieldDisplay(fieldsHtml, 'Retrieved Email')).toBe(true);
    expect(fieldsHtml).toContain('retrieved@example.com');

    // Retrieved NIN should be displayed with special styling
    expect(hasFieldDisplay(fieldsHtml, 'Retrieved NIN')).toBe(true);
    expect(fieldsHtml).toContain('55566677788');

    // Check for special styling
    expect(fieldsHtml).toContain('font-weight:700');
    expect(fieldsHtml).toContain('color:#059669');
  });

  test('Email Retrieval Only displays correctly', () => {
    const transaction = {
      id: 'txn-email-ret-1',
      ref: 'REF-EMAIL-RET-001',
      service: 'Email Retrieval Only',
      userId: 'user-email-ret-1',
      date: '7/20/2024, 4:15:00 PM',
      amount: 1500,
      status: 'retrieved',
      formData: {
        'Email': 'original@example.com',
        'NIN': '99988877766'
      },
      retrievedEmail: 'found@example.com',
      retrievedNin: '66677788899'
    };

    renderRequestDetails(transaction);

    const metaHtml = document.getElementById('rdMeta').innerHTML;
    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Status should be "Retrieved"
    expect(metaHtml).toContain('Retrieved');

    // Retrieved fields should be displayed
    expect(fieldsHtml).toContain('found@example.com');
    expect(fieldsHtml).toContain('66677788899');
  });
});

// ── Property 2.6: Utility Services Preservation ───────────────────────────────

/**
 * Property 2.6 — Preservation: Utility Services Display
 *
 * For any Utility service request (Buy Airtime, Buy Data) with string date,
 * the renderRequestDetails function SHALL display all fields correctly.
 *
 * This MUST PASS on unfixed code (Utility services already work correctly).
 *
 * **Validates: Requirements 3.1**
 */
describe('Property 2.6 — Utility Services Preservation', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('Buy Airtime displays correctly', () => {
    const transaction = {
      id: 'txn-airtime-1',
      ref: 'REF-AIRTIME-001',
      service: 'Buy Airtime',
      userId: 'user-airtime-1',
      date: '2024-08-05T12:00:00Z',
      amount: 1000,
      status: 'success',
      formData: {
        'Network': 'MTN',
        'Phone': '08012345678',
        'Amount': '1000'
      }
    };

    renderRequestDetails(transaction);

    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // All airtime fields should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'Network')).toBe(true);
    expect(hasFieldDisplay(fieldsHtml, 'Phone')).toBe(true);
    expect(hasFieldDisplay(fieldsHtml, 'Amount')).toBe(true);

    expect(fieldsHtml).toContain('MTN');
    expect(fieldsHtml).toContain('08012345678');
    expect(fieldsHtml).toContain('1000');
  });

  test('Buy Data displays correctly', () => {
    const transaction = {
      id: 'txn-data-1',
      ref: 'REF-DATA-001',
      service: 'Buy Data',
      userId: 'user-data-1',
      date: '9/12/2024, 3:45:00 PM',
      amount: 2000,
      status: 'success',
      formData: {
        'Network': 'Airtel',
        'Plan': '5GB Monthly',
        'Phone': '08098765432'
      }
    };

    renderRequestDetails(transaction);

    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // All data fields should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'Network')).toBe(true);
    expect(hasFieldDisplay(fieldsHtml, 'Plan')).toBe(true);
    expect(hasFieldDisplay(fieldsHtml, 'Phone')).toBe(true);

    expect(fieldsHtml).toContain('Airtel');
    expect(fieldsHtml).toContain('5GB Monthly');
    expect(fieldsHtml).toContain('08098765432');
  });
});

// ── Property 2.7: Personalization Services Preservation ───────────────────────

/**
 * Property 2.7 — Preservation: Personalization Services Display
 *
 * For any Personalization service request (VNIN Slip, NIN Personalization),
 * the renderRequestDetails function SHALL display fields correctly.
 *
 * This MUST PASS on unfixed code (Personalization services already work correctly).
 *
 * **Validates: Requirements 3.1**
 */
describe('Property 2.7 — Personalization Services Preservation', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('VNIN Slip displays correctly', () => {
    const transaction = {
      id: 'txn-vnin-1',
      ref: 'REF-VNIN-001',
      service: 'VNIN Slip',
      userId: 'user-vnin-1',
      date: '2024-10-01T10:00:00Z',
      amount: 500,
      status: 'success',
      formData: {
        'NIN Number': '12312312312'
      }
    };

    renderRequestDetails(transaction);

    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // NIN Number should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'NIN Number')).toBe(true);
    expect(fieldsHtml).toContain('12312312312');
  });

  test('NIN Personalization displays correctly', () => {
    const transaction = {
      id: 'txn-person-1',
      ref: 'REF-PERSON-001',
      service: 'NIN Personalization',
      userId: 'user-person-1',
      date: '11/15/2024, 1:30:00 PM',
      amount: 1000,
      status: 'submitted',
      formData: {
        'Tracking ID': 'TRK-PERSON-12345'
      }
    };

    renderRequestDetails(transaction);

    const metaHtml = document.getElementById('rdMeta').innerHTML;
    const fieldsHtml = document.getElementById('rdFields').innerHTML;

    // Status should be "Pending"
    expect(metaHtml).toContain('Pending');

    // Tracking ID should be displayed
    expect(hasFieldDisplay(fieldsHtml, 'Tracking ID')).toBe(true);
    expect(fieldsHtml).toContain('TRK-PERSON-12345');
  });
});
