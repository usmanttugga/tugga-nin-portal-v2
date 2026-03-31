/**
 * Bug Condition Exploration Tests
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
 * They encode the expected (correct) behavior and will pass once the bugs are fixed.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

const fs = require('fs');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Load app.js source into the current jsdom window.
 * Strips ES-module `import` statements so Jest/jsdom can eval it.
 */
function loadAppJs() {
  const src = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  // Remove any module-style imports (firebase.js uses them; app.js doesn't, but be safe)
  const stripped = src.replace(/^\s*import\s+.*?;?\s*$/gm, '');
  // Use the global (window) eval so function declarations land on window
  // eslint-disable-next-line no-eval
  (0, eval)(stripped);
}

/**
 * Set up a minimal DOM that mirrors the admin dashboard structure
 * (sidebar + sidebarOverlay + adminProfileModal placeholder).
 */
function setupAdminDOM() {
  document.body.innerHTML = `
    <nav>
      <button class="hamburger" onclick="toggleSidebar()"></button>
      <div class="nav-links">
        <a href="#">Admin Panel</a>
        <a href="#" onclick="logout()" class="nav-logout-link">Logout</a>
      </div>
      <div class="nav-user">
        <div class="avatar" id="adminAvatar" onclick="openAdminProfile()">A</div>
        <button class="btn-logout" onclick="logout()">Logout</button>
      </div>
    </nav>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <div class="sidebar"></div>
    <div class="modal-overlay" id="adminProfileModal">
      <div class="modal">
        <span id="apName"></span>
        <span id="apEmail"></span>
        <span id="apRole"></span>
      </div>
    </div>
  `;
}

// ── Test 1a: toggleSidebar is defined and opens the sidebar ──────────────────

/**
 * Property 1a — Bug Condition: hamburger_tap
 *
 * Calling toggleSidebar() must NOT throw a ReferenceError and must add
 * the class "open" to the .sidebar element.
 *
 * On UNFIXED code: toggleSidebar is not defined → ReferenceError → TEST FAILS
 * After fix: toggleSidebar toggles .open → TEST PASSES
 *
 * Validates: Requirements 1.1, 2.1, 2.4, 2.5
 */
test('1a — toggleSidebar() is defined and adds .open to .sidebar', () => {
  setupAdminDOM();
  loadAppJs();

  // Bug condition check: function must exist
  expect(typeof window.toggleSidebar).toBe('function');

  // Call it once — sidebar should open
  window.toggleSidebar();
  expect(document.querySelector('.sidebar').classList.contains('open')).toBe(true);
});

// ── Test 1b: openAdminProfile is defined and opens the modal ─────────────────

/**
 * Property 1b — Bug Condition: admin_avatar_click
 *
 * Calling openAdminProfile() must NOT throw a ReferenceError and must add
 * the class "open" to #adminProfileModal.
 *
 * On UNFIXED code: openAdminProfile is not defined → ReferenceError → TEST FAILS
 * After fix: openAdminProfile opens the modal → TEST PASSES
 *
 * Validates: Requirements 1.2, 2.2
 */
test('1b — openAdminProfile() is defined and adds .open to #adminProfileModal', () => {
  setupAdminDOM();
  loadAppJs();

  // Seed a user in localStorage so getCurrentUser() returns something
  localStorage.setItem('tugga_user', JSON.stringify({
    id: 2, name: 'Admin User', email: 'admin@tugga.com', role: 'admin'
  }));

  // Bug condition check: function must exist
  expect(typeof window.openAdminProfile).toBe('function');

  // Call it — modal should open
  window.openAdminProfile();
  expect(document.getElementById('adminProfileModal').classList.contains('open')).toBe(true);
});

// ── Test 1c: No duplicate logout anchor in .nav-links ────────────────────────

/**
 * Property 1c — Bug Condition: admin_desktop_render
 *
 * Parsing admin/dashboard.html must yield zero .nav-logout-link elements
 * inside nav .nav-links (the duplicate logout anchor should not be present).
 *
 * On UNFIXED code: the anchor IS present → length > 0 → TEST FAILS
 * After fix: the anchor is removed → length === 0 → TEST PASSES
 *
 * Validates: Requirements 1.3, 2.3
 */
test('1c — admin/dashboard.html has no duplicate .nav-logout-link in nav .nav-links', () => {
  const html = fs.readFileSync(
    path.resolve(__dirname, '../admin/dashboard.html'),
    'utf8'
  );

  // Parse the HTML using jsdom's DOMParser (available in jest-environment-jsdom)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const logoutLinks = doc.querySelectorAll('nav .nav-links .nav-logout-link');
  const logoutBtns  = doc.querySelectorAll('nav .btn-logout');

  // Both being present simultaneously is the bug condition
  const bugCondition = logoutLinks.length > 0 && logoutBtns.length > 0;

  // This assertion FAILS on unfixed code (bugCondition is true → not false)
  expect(bugCondition).toBe(false);
  // Equivalently: no .nav-logout-link should exist in .nav-links
  expect(logoutLinks.length).toBe(0);
});
