// ── Auth ──────────────────────────────────────────────
const USERS = [
  { id: 1, name: "John Doe", email: "user@tugga.com", password: "user123", role: "user", wallet: 5000, nin: "12345678901", phone: "08012345678", registeredAt: "2024-01-15" },
  { id: 2, name: "Admin User", email: "admin@tugga.com", password: "admin123", role: "admin", wallet: 0, nin: "", phone: "08098765432", registeredAt: "2024-01-01" }
];

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("tugga_user") || "null");
}

let currentUser = getCurrentUser();

function login(email, password) {
  // Check hardcoded users first
  let user = USERS.find(u => u.email === email && u.password === password);
  
  // If not found, check localStorage users
  if (!user) {
    const storedUsers = JSON.parse(localStorage.getItem("tugga_all_users") || "[]");
    user = storedUsers.find(u => u.email === email && u.password === password);
  }
  
  if (!user) return null;
  if (user.status === 'Suspended') return { suspended: true };
  
  // Don't store password in session
  const userSession = { ...user };
  delete userSession.password;
  
  localStorage.setItem("tugga_user", JSON.stringify(userSession));
  return userSession;
}

function logout() {
  // Sign out from Firebase if available
  if (window.authService && window.authService.logout) {
    window.authService.logout().catch(err => console.warn('Firebase logout error:', err));
  }
  localStorage.removeItem("tugga_user");
  window.location.href = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/')
    ? '../index.html' : 'index.html';
}

function requireAuth(role) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "../index.html";
    return null;
  }
  // Allow admins to access user dashboard, but not vice versa
  if (role && user.role !== role) {
    // If requesting user role and user is admin, allow access
    if (role === "user" && user.role === "admin") {
      return user;
    }
    // Otherwise, redirect to login
    window.location.href = "../index.html";
    return null;
  }
  return user;
}

// ── Transactions ──────────────────────────────────────
let transactions = JSON.parse(localStorage.getItem("tugga_txns") || "[]");

function addTransaction(userId, service, details, amount, status = "success") {
  const txn = {
    id: "TXN" + Date.now(),
    userId, service, details, amount, status,
    date: new Date().toLocaleString()
  };
  // Save to localStorage always (offline support)
  transactions.unshift(txn);
  localStorage.setItem("tugga_txns", JSON.stringify(transactions));

  // Also save to Firestore if Firebase is ready
  if (window.firebaseInitialized && window.isFirebaseReady && window.isFirebaseReady() && window.databaseService) {
    window.databaseService.createTransaction({
      userId, service, details, amount, status,
      ref: txn.id,
      date: new Date().toISOString()
    }).catch(err => console.warn('Firestore transaction sync failed:', err));
  }

  return txn;
}

function getUserTransactions(userId) {
  return transactions.filter(t => t.userId === userId);
}

// Sync wallet balance to Firestore (called after local wallet changes)
function syncWalletToFirebase() {
  if (!window.firebaseInitialized || !window.isFirebaseReady || !window.isFirebaseReady()) return;
  const user = getCurrentUser();
  if (!user) return;
  const userId = user.uid || user.id;
  const wallet = user.wallet || 0;
  if (window.databaseService) {
    window.databaseService.updateUser(userId, { wallet })
      .catch(err => console.warn('Wallet sync to Firestore failed:', err));
  }
}

// ── Modal ─────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

// Modals only close via their close button — clicking outside does NOT close them

// ── Show Section ──────────────────────────────────────
function showSection(id) {
  document.querySelectorAll(".content-section").forEach(s => s.classList.add("section-hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("section-hidden");
  document.querySelectorAll(".sidebar a").forEach(a => {
    a.classList.toggle("active", a.dataset.section === id);
  });
  return false; // prevent anchor jump
}

// ── Toggle Sidebar ────────────────────────────────────
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

// ── Open Admin Profile ────────────────────────────────
function openAdminProfile() {
  var admin = getCurrentUser();
  if (!admin) return;
  document.getElementById('apName').textContent = admin.name;
  document.getElementById('apEmail').textContent = admin.email;
  document.getElementById('apRole').textContent = admin.role;
  openModal('adminProfileModal');
}

// ── Format Currency ───────────────────────────────────
function fmt(n) { return "\u20A6" + Number(n).toLocaleString(); }

// ── Toast ─────────────────────────────────────────────
function toast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = "alert alert-" + type;
  t.style.cssText = "position:fixed;top:80px;right:20px;z-index:9999;min-width:280px;box-shadow:0 4px 12px rgba(0,0,0,0.15)";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3500);
}
