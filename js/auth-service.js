/**
 * Firebase Authentication Service Module
 * 
 * Handles user authentication operations including login, registration,
 * logout, and password reset using Firebase Authentication.
 */

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { getAuthInstance, isFirebaseReady } from './firebase-config.js';

// Current authenticated user
let currentAuthUser = null;
let authStateListeners = [];

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} User credential object
 */
export async function loginWithEmail(email, password) {
  const auth = getAuthInstance();
  
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Using localStorage fallback.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentAuthUser = userCredential.user;
    
    console.log('User logged in successfully:', currentAuthUser.uid);
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      emailVerified: userCredential.user.emailVerified
    };
  } catch (error) {
    console.error('Login error:', error);
    throw mapAuthError(error);
  }
}

/**
 * Register new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User's full name
 * @returns {Promise<object>} User credential object
 */
export async function registerWithEmail(email, password, displayName) {
  const auth = getAuthInstance();
  
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Using localStorage fallback.');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentAuthUser = userCredential.user;
    
    // Update user profile with display name
    if (displayName) {
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
    }
    
    console.log('User registered successfully:', currentAuthUser.uid);
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: displayName,
      emailVerified: userCredential.user.emailVerified
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw mapAuthError(error);
  }
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logout() {
  const auth = getAuthInstance();
  
  if (!auth) {
    // Clear local session even if Firebase not available
    currentAuthUser = null;
    localStorage.removeItem('tugga_user');
    return;
  }

  try {
    await signOut(auth);
    currentAuthUser = null;
    localStorage.removeItem('tugga_user');
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    throw mapAuthError(error);
  }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  const auth = getAuthInstance();
  
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Password reset unavailable.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw mapAuthError(error);
  }
}

/**
 * Get current authenticated user
 * @returns {object|null} Current user object or null
 */
export function getCurrentUser() {
  const auth = getAuthInstance();
  
  if (!auth) {
    // Fallback to localStorage
    const storedUser = localStorage.getItem('tugga_user');
    return storedUser ? JSON.parse(storedUser) : null;
  }

  if (auth.currentUser) {
    return {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
      emailVerified: auth.currentUser.emailVerified
    };
  }

  return null;
}

/**
 * Get authentication token
 * @returns {Promise<string|null>} ID token or null
 */
export async function getAuthToken() {
  const auth = getAuthInstance();
  
  if (!auth || !auth.currentUser) {
    return null;
  }

  try {
    const token = await auth.currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
  const auth = getAuthInstance();
  
  if (!auth) {
    // Fallback to localStorage check
    return localStorage.getItem('tugga_user') !== null;
  }

  return auth.currentUser !== null;
}

/**
 * Listen to authentication state changes
 * @param {function} callback - Callback function to handle auth state changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const auth = getAuthInstance();
  
  if (!auth) {
    console.warn('Firebase Auth not available. Auth state listener not registered.');
    return () => {}; // Return empty unsubscribe function
  }

  // Register listener
  authStateListeners.push(callback);

  // Set up Firebase auth state listener
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    currentAuthUser = user;
    
    if (user) {
      console.log('Auth state changed: User logged in', user.uid);
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      });
    } else {
      console.log('Auth state changed: User logged out');
      callback(null);
    }
  });

  // Return unsubscribe function
  return () => {
    unsubscribe();
    authStateListeners = authStateListeners.filter(l => l !== callback);
  };
}

/**
 * Map Firebase auth errors to user-friendly messages
 * @param {Error} error - Firebase error object
 * @returns {Error} Error with user-friendly message
 */
function mapAuthError(error) {
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address format.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
    'auth/invalid-credential': 'Invalid login credentials.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/requires-recent-login': 'Please log in again to perform this action.',
    'auth/expired-action-code': 'This link has expired. Please request a new one.',
    'auth/invalid-action-code': 'Invalid or expired link.',
    'auth/missing-email': 'Please provide an email address.'
  };

  const message = errorMessages[error.code] || error.message || 'An error occurred during authentication.';
  const mappedError = new Error(message);
  mappedError.code = error.code;
  mappedError.originalError = error;
  
  return mappedError;
}

/**
 * Refresh authentication token
 * @returns {Promise<string|null>} New token or null
 */
export async function refreshAuthToken() {
  const auth = getAuthInstance();
  
  if (!auth || !auth.currentUser) {
    return null;
  }

  try {
    const token = await auth.currentUser.getIdToken(true); // Force refresh
    console.log('Auth token refreshed');
    return token;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    return null;
  }
}

/**
 * Update user display name
 * @param {string} displayName - New display name
 * @returns {Promise<void>}
 */
export async function updateDisplayName(displayName) {
  const auth = getAuthInstance();
  
  if (!auth || !auth.currentUser) {
    throw new Error('No user is currently logged in.');
  }

  try {
    await updateProfile(auth.currentUser, { displayName });
    console.log('Display name updated:', displayName);
  } catch (error) {
    console.error('Error updating display name:', error);
    throw mapAuthError(error);
  }
}

/**
 * Check if Firebase Auth is available
 * @returns {boolean} True if Firebase Auth is available
 */
export function isAuthAvailable() {
  return isFirebaseReady() && getAuthInstance() !== null;
}

// Export for global access (backward compatibility)
window.authService = {
  loginWithEmail,
  registerWithEmail,
  logout,
  resetPassword,
  getCurrentUser,
  getAuthToken,
  isAuthenticated,
  onAuthStateChange,
  refreshAuthToken,
  updateDisplayName,
  isAuthAvailable
};

console.log('Auth service module loaded');
