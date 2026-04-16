/**
 * Error Handler Module
 * 
 * Provides consistent error handling, user-friendly messages,
 * and offline mode indicators across the application.
 */

// Firebase error code to user-friendly message mapping
const FIREBASE_ERROR_MESSAGES = {
  // Auth errors
  'auth/invalid-email': 'Invalid email address format.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/requires-recent-login': 'Please log in again to perform this action.',
  'auth/invalid-credential': 'Invalid login credentials. Please try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
  'auth/missing-email': 'Please provide an email address.',
  'auth/expired-action-code': 'This link has expired. Please request a new one.',
  'auth/invalid-action-code': 'Invalid or expired link. Please request a new one.',

  // Firestore errors
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This record already exists.',
  'resource-exhausted': 'Service temporarily unavailable. Please try again.',
  'failed-precondition': 'Operation failed. Please refresh and try again.',
  'aborted': 'Operation was aborted. Please try again.',
  'out-of-range': 'Invalid data range. Please check your input.',
  'unimplemented': 'This feature is not yet available.',
  'internal': 'An internal error occurred. Please try again.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'data-loss': 'Data error occurred. Please contact support.',
  'unauthenticated': 'Please log in to continue.',

  // Network errors
  'network-error': 'Network error. Please check your internet connection.',
  'timeout': 'Request timed out. Please try again.',
};

// Transient errors that can be retried
const RETRYABLE_ERRORS = [
  'unavailable',
  'network-request-failed',
  'network-error',
  'timeout',
  'resource-exhausted',
  'internal'
];

/**
 * Get user-friendly error message from Firebase error
 * @param {Error} error - Firebase error object
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';

  // Check Firebase error code
  if (error.code && FIREBASE_ERROR_MESSAGES[error.code]) {
    return FIREBASE_ERROR_MESSAGES[error.code];
  }

  // Check for common error patterns in message
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  if (msg.includes('permission') || msg.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }
  if (msg.includes('not found')) {
    return 'The requested data was not found.';
  }
  if (msg.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Return original message or generic fallback
  return error.message || 'An error occurred. Please try again.';
}

/**
 * Check if an error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if error can be retried
 */
export function isRetryableError(error) {
  if (!error) return false;
  return RETRYABLE_ERRORS.some(code =>
    error.code === code ||
    (error.message || '').toLowerCase().includes(code)
  );
}

/**
 * Display error message in a UI element
 * @param {string} elementId - ID of the element to show error in
 * @param {Error|string} error - Error object or message string
 * @param {object} options - Display options
 */
export function showError(elementId, error, options = {}) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const message = typeof error === 'string' ? error : getErrorMessage(error);
  const showRetry = options.onRetry && isRetryableError(error);

  const retryBtn = showRetry
    ? `<button onclick="(${options.onRetry.toString()})()" style="margin-left:8px;background:none;border:1px solid currentColor;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:0.8rem">Retry</button>`
    : '';

  const reportBtn = options.showReport
    ? `<button onclick="reportError('${encodeURIComponent(message)}')" style="margin-left:8px;background:none;border:1px solid currentColor;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:0.8rem">Report Issue</button>`
    : '';

  el.innerHTML = `<div class="alert alert-error" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
    <span>❌ ${message}</span>
    <span>${retryBtn}${reportBtn}</span>
  </div>`;
  el.style.display = 'block';

  // Log to console with context
  console.error('[ErrorHandler]', message, error);
}

/**
 * Display success message in a UI element
 * @param {string} elementId - ID of the element
 * @param {string} message - Success message
 * @param {number} autoClear - Auto-clear after ms (0 = no auto-clear)
 */
export function showSuccess(elementId, message, autoClear = 3000) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = `<div class="alert alert-success">✅ ${message}</div>`;
  el.style.display = 'block';

  if (autoClear > 0) {
    setTimeout(() => {
      el.innerHTML = '';
      el.style.display = 'none';
    }, autoClear);
  }
}

/**
 * Report an error (logs context for debugging)
 * @param {string} encodedMessage - URL-encoded error message
 */
export function reportError(encodedMessage) {
  const message = decodeURIComponent(encodedMessage);
  const context = {
    message,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    firebaseReady: window.isFirebaseReady ? window.isFirebaseReady() : false,
    online: navigator.onLine
  };
  console.error('[Error Report]', context);
  alert('Error details have been logged. Please contact support if the issue persists.\n\nError: ' + message);
}

// ── Offline Mode Indicator ──────────────────────────────

let offlineBanner = null;
let onlineStatusListeners = [];

/**
 * Initialize offline mode detection and banner
 */
export function initOfflineDetection() {
  // Create offline banner if it doesn't exist
  if (!document.getElementById('offlineBanner')) {
    const banner = document.createElement('div');
    banner.id = 'offlineBanner';
    banner.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: #1a1a1a;
      text-align: center;
      padding: 8px 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    banner.innerHTML = '⚠️ Offline mode — changes will sync when you reconnect';
    document.body.prepend(banner);
    offlineBanner = banner;
  } else {
    offlineBanner = document.getElementById('offlineBanner');
  }

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Set initial state
  if (!navigator.onLine) {
    handleOffline();
  }
}

function handleOnline() {
  if (offlineBanner) offlineBanner.style.display = 'none';
  onlineStatusListeners.forEach(fn => fn(true));
  console.log('✅ Back online');

  // Trigger sync if Firebase is available
  if (window.firebaseInitialized && window.isFirebaseReady()) {
    console.log('Triggering sync after reconnection...');
  }
}

function handleOffline() {
  if (offlineBanner) offlineBanner.style.display = 'block';
  onlineStatusListeners.forEach(fn => fn(false));
  console.warn('⚠️ Gone offline - operating in offline mode');
}

/**
 * Add listener for online status changes
 * @param {function} fn - Callback(isOnline: boolean)
 */
export function onOnlineStatusChange(fn) {
  onlineStatusListeners.push(fn);
  return () => {
    onlineStatusListeners = onlineStatusListeners.filter(l => l !== fn);
  };
}

/**
 * Check if currently online
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine;
}

// ── Global Error Handler ────────────────────────────────

/**
 * Set up global unhandled error catching
 */
export function initGlobalErrorHandler() {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    console.error('[Unhandled Promise Rejection]', error);

    // Handle Firebase unauthenticated errors
    if (error && error.code === 'unauthenticated') {
      console.warn('User unauthenticated - redirecting to login');
      localStorage.removeItem('tugga_user');
      window.location.href = '../index.html';
    }
  });

  window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error || event.message);
  });
}

// Export for global access
window.errorHandler = {
  getErrorMessage,
  isRetryableError,
  showError,
  showSuccess,
  reportError,
  initOfflineDetection,
  onOnlineStatusChange,
  isOnline,
  initGlobalErrorHandler
};

console.log('Error handler module loaded');
