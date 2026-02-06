import {
  GoogleAuthProvider,
  browserLocalPersistence,
  signInAnonymously as firebaseSignInAnonymously,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { assertFirebaseConfigured, firebaseAuth } from "./firebase";

const prepareGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

const ensurePersistence = async () => {
  try {
    await setPersistence(firebaseAuth!, browserLocalPersistence);
  } catch {
    // Ignore and let Firebase pick a fallback persistence.
  }
};

export const getFirebaseUserSnapshot = (user: User | null) => {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || undefined,
    isAnonymous: Boolean(user.isAnonymous),
    photoURL: user.photoURL || undefined,
  };
};

export const signInWithGoogle = async () => {
  assertFirebaseConfigured();
  const provider = prepareGoogleProvider();
  await ensurePersistence();

  await signInWithPopup(firebaseAuth!, provider);
};

export const signInAnonymously = async () => {
  assertFirebaseConfigured();
  await ensurePersistence();
  return firebaseSignInAnonymously(firebaseAuth!);
};

export const signOut = async () => {
  assertFirebaseConfigured();
  return firebaseSignOut(firebaseAuth!);
};
