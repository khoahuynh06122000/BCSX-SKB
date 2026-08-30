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

/**
 * Đăng nhập Google — LUÔN HỎI CHỌN TÀI KHOẢN.
 *
 * Mặc định, khi trình duyệt chỉ đang đăng nhập một tài khoản Google thì
 * `signInWithPopup` KHÔNG hỏi gì cả: cửa sổ bật lên rồi tự đóng, đăng nhập
 * thẳng vào đúng tài khoản đó. Người dùng bấm Đăng xuất rồi bấm Đăng nhập lại
 * vẫn quay về tài khoản cũ, không có cách nào đổi sang tài khoản khác —
 * đúng chuyện đã gặp.
 *
 * Chú ý: `signOut` của app chỉ kết thúc phiên CỦA APP. Phiên Google trong
 * trình duyệt là của Google, app không đụng tới được — nên phải hỏi ở chỗ này
 * chứ không sửa được ở chỗ đăng xuất.
 *
 * `prompt: "select_account"` bắt Google bày màn hình chọn tài khoản mỗi lần,
 * kể cả khi chỉ có một tài khoản. Mất thêm một cú bấm, đổi lấy việc máy dùng
 * chung luôn đổi được người.
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

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
