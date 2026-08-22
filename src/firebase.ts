import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch
} from 'firebase/firestore';

// Cau hinh Firebase doc tu bien moi truong (file .env.local khi chay tai may,
// hoac Environment Variables tren Vercel khi deploy).
// Luu y: cac gia tri nay von duoc thiet ke de cong khai o phia trinh duyet;
// viec bao ve du lieu dua vao Firestore Security Rules (xem firestore.rules).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firestoreDatabaseId =
  import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    'Thieu cau hinh Firebase. Hay dien cac bien VITE_FIREBASE_* trong file .env.local ' +
      '(hoac trong Environment Variables tren Vercel). Xem huong dan o README.md.',
  );
}

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with experimentalForceLongPolling to bypass potential WebSocket blocks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firestoreDatabaseId);

export const firebaseProjectId = firebaseConfig.projectId as string;

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};
