import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot,
  collection, addDoc, getDocs, query, where, updateDoc, increment, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDX31m2k1OOzedDQHAbpvgP15mxLjBRdwc",
  authDomain: "tugga-nin.firebaseapp.com",
  projectId: "tugga-nin",
  storageBucket: "tugga-nin.firebasestorage.app",
  messagingSenderId: "63922868228",
  appId: "1:63922868228:web:45bfadf123e9b493b82551"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

window.fbAuth = auth;
window.fbDB = db;
window.fbStorage = storage;
window.fbStorageRef = ref;
window.fbUploadBytes = uploadBytes;
window.fbGetDownloadURL = getDownloadURL;
window.fbDoc = doc;
window.fbSetDoc = setDoc;
window.fbGetDoc = getDoc;
window.fbOnSnapshot = onSnapshot;
window.fbCollection = collection;
window.fbAddDoc = addDoc;
window.fbGetDocs = getDocs;
window.fbQuery = query;
window.fbWhere = where;
window.fbUpdateDoc = updateDoc;
window.fbIncrement = increment;
window.fbDeleteDoc = deleteDoc;
window.fbCreateUser = createUserWithEmailAndPassword;
window.fbSignIn = signInWithEmailAndPassword;
window.fbSignOut = signOut;
window.fbOnAuthStateChanged = onAuthStateChanged;
window.fbResetPassword = sendPasswordResetEmail;
window.fbReady = true;

console.log("✅ Firebase ready");
