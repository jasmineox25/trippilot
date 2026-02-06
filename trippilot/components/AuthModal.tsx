import React, { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../contexts/AuthContext";
import { Icon } from "./Icon";
import { useI18n } from "../i18n/react";

export const AuthModal: React.FC<{
  open: boolean;
  user: AuthUser | null;
  onClose: () => void;
  onSignInWithGoogle: () => Promise<void>;
  onSignInAnonymously: () => Promise<void>;
  onSignOut: () => Promise<void>;
  error?: string | null;
  disabled?: boolean;
}> = ({
  open,
  user,
  onClose,
  onSignInWithGoogle,
  onSignInAnonymously,
  onSignOut,
  error,
  disabled,
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const { l, locale } = useI18n();

  const popupHelpHref = useMemo(() => {
    const base = String(locale || "en")
      .toLowerCase()
      .split("-")[0];
    if (base === "zh") return "/popup-help/";
    if (base === "ja") return "/popup-help/ja/";
    if (base === "ko") return "/popup-help/ko/";
    if (base === "fr") return "/popup-help/fr/";
    if (base === "es") return "/popup-help/es/";
    if (base === "de") return "/popup-help/de/";
    if (base === "pt") return "/popup-help/pt/";
    if (base === "ru") return "/popup-help/ru/";
    return "/popup-help/en/";
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    setIsBusy(false);
  }, [open]);

  const hasError = useMemo(
    () => Boolean(error && String(error).trim()),
    [error],
  );

  const showPopupHelp = useMemo(() => {
    if (!hasError) return false;
    const msg = String(error).toLowerCase();
    return (
      msg.includes("popup") ||
      msg.includes("pop-ups") ||
      msg.includes("popups") ||
      msg.includes("auth/popup-blocked")
    );
  }, [error, hasError]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label={l("关闭", "Close")}
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="account_circle" className="text-[22px]" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {l("账号", "Account")}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {l(
                    "Firebase 登录（可同步到云端）",
                    "Firebase sign-in (syncs to the cloud)",
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300"
              aria-label={l("关闭", "Close")}
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="p-4">
            {hasError ? (
              <div className="mb-3 text-xs text-rose-700 dark:text-rose-200 font-bold bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                {String(error)}
              </div>
            ) : null}

            {showPopupHelp ? (
              <div className="mb-3 text-xs leading-snug text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                <div className="font-extrabold flex items-center gap-2">
                  <Icon name="info" className="text-[18px]" />
                  {l(
                    "弹窗被拦截？按以下步骤允许弹窗",
                    "Popup blocked? Allow pop-ups with these steps",
                  )}
                </div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">
                  {l(
                    "1) 点击浏览器地址栏左侧的“锁/网站”图标",
                    "1) Click the lock/site icon on the left of the address bar",
                  )}
                  <br />
                  {l(
                    "2) 打开“网站设置 / Site settings”",
                    "2) Open “Site settings”",
                  )}
                  <br />
                  {l(
                    "3) 将 “Pop-ups / Pop-ups and redirects” 设为 Allow",
                    "3) Set “Pop-ups / Pop-ups and redirects” to Allow",
                  )}
                  <br />
                  {l(
                    "4) 刷新页面后再点一次“使用 Google 登录（弹窗）”",
                    "4) Refresh and try “Continue with Google (popup)” again",
                  )}
                </div>
              </div>
            ) : null}

            {user ? (
              <div>
                <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                  {l("当前登录：", "Signed in as: ")}
                  <span className="font-extrabold">{user.name}</span>
                </div>
                {user.email ? (
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {user.email}
                  </div>
                ) : null}
                {user.isAnonymous ? (
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-200 font-bold">
                    {l(
                      "匿名账号（建议之后绑定 Google 账号）",
                      "Anonymous account (you can link Google later)",
                    )}
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      try {
                        await onSignOut();
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold"
                  >
                    {l("退出登录", "Sign out")}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                  >
                    {l("关闭", "Close")}
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {l(
                    "提示：登录后会把行程同步到 Firestore。",
                    "Tip: signing in syncs your trips to Firestore.",
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isBusy || disabled}
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      await onSignInWithGoogle();
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-primary text-white font-extrabold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Icon name="login" className="text-[18px]" />
                  {l(
                    "使用 Google 登录（弹窗）",
                    "Continue with Google (popup)",
                  )}
                </button>

                <div className="text-[11px] leading-snug text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                  <div className="font-bold">
                    {l(
                      "若弹窗没出现，请允许 Pop-ups",
                      "If the popup didn’t appear, allow pop-ups",
                    )}
                  </div>
                  <div className="mt-0.5">
                    {l(
                      "地址栏左侧图标 → 网站设置 → Pop-ups（and redirects）→ Allow。",
                      "Address bar icon → Site settings → Pop-ups (and redirects) → Allow.",
                    )}
                  </div>
                  <div className="mt-1">
                    <a
                      href={popupHelpHref}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold"
                    >
                      {l(
                        "查看图文教程（含 PC/手机各浏览器）",
                        "Open the step-by-step guide (desktop & mobile browsers)",
                      )}
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isBusy || disabled}
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      await onSignInAnonymously();
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {l(
                    "先匿名使用（可稍后绑定）",
                    "Continue as guest (link later)",
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
