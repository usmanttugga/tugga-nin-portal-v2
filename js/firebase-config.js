/**
 * Firebase Configuration and Initialization Module
 * 
 * This module handles Firebase SDK initialization and provides
 * access to Firebase services (Auth, Firestore, Storage).
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Authentication (Email/Password)
 * 3. Enable Firestore Database
 * 4. Enable Storage
 * 5. Copy your Firebase config and replace the placeholder below
 */

// Import Firebase SDK (v9+ modular)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase configuration object
// Firebase configuration for TUGGA NIN Portal
const firebaseConfig = {
  apiKey: "AIzaSyACkRMalt16wnoT1RHsHDmPYTEB4Xv2N3A",
  authDomain: "tugga-nin-portal-v2-c0439.firebaseapp.com",
  projectId: "tugga-nin-portal-v2-c0439",
  storageBucket: "tugga-nin-portal-v2-c0439.firebasestorage.app",
  messagingSenderId: "325601902054",
  appId: "1:325601902054:web:053f16a1de4110f4966a27"
};

// Global Firebase instances
let app = null;
let auth = null;
let db = null;
let storage = null;
let firebaseReady = false;
let initializationError = null;

/**
 * Initialize Firebase services
 * @returns {Promise<boolean>} True if initialization succeeds, false otherwise
 */
export async function initializeFirebase() {
  try {
    // Check if Firebase config is placeholder
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
      console.warn("Firebase not configured. Using localStorage fallback mode.");
      console.warn("To enable Firebase, update firebase-config.js with your Firebase credentials.");
      firebaseReady = false;
      return false;
    }

    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized");

    // Initialize Auth
    auth = getAuth(app);
    console.log("Firebase Auth initialized");

    // Initialize Firestore
    db = getFirestore(app);
    
    // Enable offline persistence
    try {
      await enableIndexedDbPersistence(db);
      console.log("Firestore offline persistence enabled");
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open, persistence enabled in first tab only");
      } else if (err.code === 'unimplemented') {
        console.warn("Browser doesn't support persistence");
      }
    }
    console.log("Firestore initialized");

    // Initialize Storage
    storage = getStorage(app);
    console.log("Firebase Storage initialized");

    // Connect to emulators in development (optional)
    if (window.location.hostname === 'localhost' && window.USE_FIREBASE_EMULATORS) {
      connectAuthEmulator(auth, "http://localhost:9099");
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, "localhost", 9199);
      console.log("Connected to Firebase emulators");
    }

    firebaseReady = true;
    console.log("✅ Firebase connected successfully");
    return true;

  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    initializationError = error;
    firebaseReady = false;
    
    // Display user-friendly error
    if (error.code === 'auth/invalid-api-key') {
      console.error("Invalid Firebase API key. Please check your configuration.");
    } else if (error.code === 'auth/network-request-failed') {
      console.error("Network error. Please check your internet connection.");
    } else {
      console.error("Failed to connect to Firebase:", error.message);
    }
    
    return false;
  }
}

/**
 * Get Firebase Auth instance
 * @returns {Auth|null} Firebase Auth instance or null if not initialized
 */
export function getAuthInstance() {
  if (!firebaseReady) {
    console.warn("Firebase not ready. Auth operations will fail.");
    return null;
  }
  return auth;
}

/**
 * Get Firestore instance
 * @returns {Firestore|null} Firestore instance or null if not initialized
 */
export function getFirestoreInstance() {
  if (!firebaseReady) {
    console.warn("Firebase not ready. Firestore operations will fail.");
    return null;
  }
  return db;
}

/**
 * Get Firebase Storage instance
 * @returns {Storage|null} Storage instance or null if not initialized
 */
export function getStorageInstance() {
  if (!firebaseReady) {
    console.warn("Firebase not ready. Storage operations will fail.");
    return null;
  }
  return storage;
}

/**
 * Check if Firebase is ready
 * @returns {boolean} True if Firebase is initialized and ready
 */
export function isFirebaseReady() {
  return firebaseReady;
}

/**
 * Get initialization error if any
 * @returns {Error|null} Initialization error or null
 */
export function getInitializationError() {
  return initializationError;
}

/**
 * Get Firebase configuration status
 * @returns {object} Configuration status object
 */
export function getConfigStatus() {
  return {
    configured: firebaseConfig.apiKey !== "YOUR_API_KEY",
    ready: firebaseReady,
    error: initializationError ? initializationError.message : null,
    services: {
      auth: auth !== null,
      firestore: db !== null,
      storage: storage !== null
    }
  };
}

// Auto-initialize on module load
initializeFirebase().catch(err => {
  console.error("Auto-initialization failed:", err);
});

// Export for global access (backward compatibility)
window.firebaseConfig = {
  initializeFirebase,
  getAuth: getAuthInstance,
  getFirestore: getFirestoreInstance,
  getStorage: getStorageInstance,
  isFirebaseReady,
  getInitializationError,
  getConfigStatus
};
