import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthModal } from "../components/AuthModal";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "../services/firebase/firebase";
import {
  getFirebaseUserSnapshot,
  signInAnonymously,
  signInWithGoogle,
  signOut,
} from "../services/firebase/auth";

export type AuthUser = {
  id: string; // Firebase uid
  name: string; // displayName or fallback
  email?: string;
  isAnonymous?: boolean;
  photoURL?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  openAuth: () => void;
  closeAuth: () => void;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
};

const formatAuthError = (e: any): string => {
  const code = String(e?.code || "");
  const msg = String(e?.message || e || "登录失败");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (code === "auth/unauthorized-domain") {
    return [
      "Firebase 拒绝了本域名的登录（auth/unauthorized-domain）。",
      origin ? `当前域名：${origin}` : undefined,
      "请到 Firebase Console -> Authentication -> Settings -> Authorized domains 添加该域名。",
      "本地开发常见需要同时加：localhost、127.0.0.1。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (code === "auth/operation-not-allowed") {
    return [
      "Firebase 未启用该登录方式（auth/operation-not-allowed）。",
      "请到 Firebase Console -> Authentication -> Sign-in method 启用 Google。",
    ].join("\n");
  }

  if (code === "auth/popup-blocked") {
    return [
      "浏览器拦截了登录弹窗（auth/popup-blocked）。",
      "请在浏览器网站设置里允许 Pop-ups，然后重试。",
    ].join("\n");
  }

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return "登录弹窗已关闭，请重试。";
  }

  return code ? `${msg}\n(${code})` : msg;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isFirebaseConfigured = Boolean(firebaseAuth);

  const firebaseConfigHint = useMemo(() => {
    const lines = [
      "Firebase 未配置：当前环境没有检测到 VITE_FIREBASE_*。",
      "- 本地开发：在 trippilot/.env 设置 VITE_FIREBASE_* 后重启 dev server",
      "- Vercel 部署：Project Settings → Environment Variables 设置 VITE_FIREBASE_* 后重新部署",
    ];
    return lines.join("\n");
  }, []);

  useEffect(() => {
    if (!firebaseAuth) return;

    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      if ((import.meta as any)?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.log("Firebase onAuthStateChanged", u);
      }
      const snap = getFirebaseUserSnapshot(u);
      if (!snap) {
        setUser(null);
        return;
      }

      // Clear any lingering auth errors once we have a user.
      setAuthError(null);
      const display = (snap.displayName || snap.email || "User").trim();
      setUser({
        id: snap.uid,
        name: display,
        email: snap.email,
        isAnonymous: snap.isAnonymous,
        photoURL: snap.photoURL,
      });
    });

    return () => unsub();
  }, []);

  const openAuth = useCallback(() => {
    if (!firebaseAuth) {
      setAuthError(firebaseConfigHint);
    }
    setIsAuthOpen(true);
  }, [firebaseConfigHint]);
  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  const ensureFirebaseOrShowHint = useCallback(() => {
    if (firebaseAuth) return true;
    setAuthError(firebaseConfigHint);
    setIsAuthOpen(true);
    return false;
  }, [firebaseConfigHint]);

  const doSignInWithGoogle = useCallback(async () => {
    try {
      setAuthError(null);
      if (!ensureFirebaseOrShowHint()) return;
      await signInWithGoogle();
      setIsAuthOpen(false);
    } catch (e: any) {
      setAuthError(formatAuthError(e));
    }
  }, [ensureFirebaseOrShowHint]);

  const doSignInAnonymously = useCallback(async () => {
    try {
      setAuthError(null);
      if (!ensureFirebaseOrShowHint()) return;
      await signInAnonymously();
      setIsAuthOpen(false);
    } catch (e: any) {
      const msg = String(e?.message || e || "登录失败");
      setAuthError(msg);
    }
  }, [ensureFirebaseOrShowHint]);

  const doSignOut = useCallback(async () => {
    try {
      setAuthError(null);
      await signOut();
      setIsAuthOpen(false);
    } catch (e: any) {
      const msg = String(e?.message || e || "退出失败");
      setAuthError(msg);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      openAuth,
      closeAuth,
      signInWithGoogle: doSignInWithGoogle,
      signInAnonymously: doSignInAnonymously,
      signOut: doSignOut,
      authError,
    }),
    [
      user,
      openAuth,
      closeAuth,
      doSignInWithGoogle,
      doSignInAnonymously,
      doSignOut,
      authError,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        open={isAuthOpen}
        user={user}
        onClose={closeAuth}
        onSignInWithGoogle={doSignInWithGoogle}
        onSignInAnonymously={doSignInAnonymously}
        onSignOut={doSignOut}
        error={authError}
        disabled={!isFirebaseConfigured}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
