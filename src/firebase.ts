import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with experimentalForceLongPolling to bypass potential WebSocket blocks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  collection,
  doc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile
};
