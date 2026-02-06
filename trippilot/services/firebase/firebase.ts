import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

declare const __FIREBASE_API_KEY__: string;
declare const __FIREBASE_AUTH_DOMAIN__: string;
declare const __FIREBASE_PROJECT_ID__: string;
declare const __FIREBASE_STORAGE_BUCKET__: string;
declare const __FIREBASE_MESSAGING_SENDER_ID__: string;
declare const __FIREBASE_APP_ID__: string;

const env = (k: string): string => {
  const v = (import.meta as any)?.env?.[k];
  if (typeof v === "string") return v.trim();

  // Fallback for cases where import.meta.env doesn't expose expected keys.
  switch (k) {
    case "VITE_FIREBASE_API_KEY":
      return String(__FIREBASE_API_KEY__ ?? "").trim();
    case "VITE_FIREBASE_AUTH_DOMAIN":
      return String(__FIREBASE_AUTH_DOMAIN__ ?? "").trim();
    case "VITE_FIREBASE_PROJECT_ID":
      return String(__FIREBASE_PROJECT_ID__ ?? "").trim();
    case "VITE_FIREBASE_STORAGE_BUCKET":
      return String(__FIREBASE_STORAGE_BUCKET__ ?? "").trim();
    case "VITE_FIREBASE_MESSAGING_SENDER_ID":
      return String(__FIREBASE_MESSAGING_SENDER_ID__ ?? "").trim();
    case "VITE_FIREBASE_APP_ID":
      return String(__FIREBASE_APP_ID__ ?? "").trim();
    default:
      return "";
  }
};

const firebaseConfig = {
  apiKey: env("VITE_FIREBASE_API_KEY"),
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: env("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("VITE_FIREBASE_APP_ID"),
};

const hasConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const firebaseApp = (() => {
  if (!hasConfig) return null;
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
})();

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestoreDb = firebaseApp ? getFirestore(firebaseApp) : null;

// Ensure auth state persists across reloads/redirects in the browser.
// (Helps avoid "returned from Google but not logged in" situations.)
if (firebaseAuth) {
  setPersistence(firebaseAuth, browserLocalPersistence).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn("Failed to set Firebase auth persistence", e);
  });
}

export const assertFirebaseConfigured = () => {
  if (!firebaseApp || !firebaseAuth || !firestoreDb) {
    throw new Error(
      "Firebase 未配置：请设置 VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID 等环境变量并重启 dev server。",
    );
  }
};
