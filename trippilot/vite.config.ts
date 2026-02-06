import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const popupHelpRewritePlugin = () => {
  const rewrite = (req: any) => {
    const url = String(req?.url || "");
    if (url === "/popup-help/en" || url === "/popup-help/en/") {
      req.url = "/popup-help/en/index.html";
    }
    if (url === "/popup-help/ja" || url === "/popup-help/ja/") {
      req.url = "/popup-help/ja/index.html";
    }
    if (url === "/popup-help/ko" || url === "/popup-help/ko/") {
      req.url = "/popup-help/ko/index.html";
    }
    if (url === "/popup-help/fr" || url === "/popup-help/fr/") {
      req.url = "/popup-help/fr/index.html";
    }
    if (url === "/popup-help/es" || url === "/popup-help/es/") {
      req.url = "/popup-help/es/index.html";
    }
    if (url === "/popup-help/de" || url === "/popup-help/de/") {
      req.url = "/popup-help/de/index.html";
    }
    if (url === "/popup-help/pt" || url === "/popup-help/pt/") {
      req.url = "/popup-help/pt/index.html";
    }
    if (url === "/popup-help/ru" || url === "/popup-help/ru/") {
      req.url = "/popup-help/ru/index.html";
    }
    if (url === "/popup-help" || url === "/popup-help/") {
      req.url = "/popup-help/index.html";
    }
  };

  return {
    name: "popup-help-rewrite",
    configureServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        rewrite(req);
        next();
      });
    },
  };
};

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";
  const env = isTest
    ? ({} as Record<string, string>)
    : loadEnv(mode, __dirname, "");
  // Never bake real secrets into test builds.
  // IMPORTANT: Only VITE_* vars should ever reach the browser bundle.
  // Do NOT fall back to GEMINI_API_KEY here (that's meant for server-side proxy functions).
  const geminiKey = (
    isTest ? "test-key" : (env.VITE_GEMINI_API_KEY ?? "")
  ).trim();
  const fb = {
    apiKey: (env.VITE_FIREBASE_API_KEY ?? "").trim(),
    authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN ?? "").trim(),
    projectId: (env.VITE_FIREBASE_PROJECT_ID ?? "").trim(),
    storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET ?? "").trim(),
    messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "").trim(),
    appId: (env.VITE_FIREBASE_APP_ID ?? "").trim(),
  };
  return {
    envDir: __dirname,
    server: {
      port: 3000,
      host: "0.0.0.0",
      headers: {
        // Firebase Auth (Google) uses a popup + polling window.closed.
        // COOP=same-origin can break that; allow popups during local dev.
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Embedder-Policy": "unsafe-none",
      },
    },
    preview: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Embedder-Policy": "unsafe-none",
      },
    },
    plugins: [popupHelpRewritePlugin(), react()],
    define: {
      // Some upstream templates expect process.env.*; keep these aligned with our actual .env usage.
      "process.env.API_KEY": JSON.stringify(geminiKey),
      "process.env.GEMINI_API_KEY": JSON.stringify(geminiKey),
      "process.env.VITE_GEMINI_API_KEY": JSON.stringify(geminiKey),
      __GEMINI_API_KEY__: JSON.stringify(geminiKey),
      __GMAPS_API_KEY__: JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY ?? ""),

      // Firebase config fallback (not secrets, but keeps runtime robust).
      __FIREBASE_API_KEY__: JSON.stringify(fb.apiKey),
      __FIREBASE_AUTH_DOMAIN__: JSON.stringify(fb.authDomain),
      __FIREBASE_PROJECT_ID__: JSON.stringify(fb.projectId),
      __FIREBASE_STORAGE_BUCKET__: JSON.stringify(fb.storageBucket),
      __FIREBASE_MESSAGING_SENDER_ID__: JSON.stringify(fb.messagingSenderId),
      __FIREBASE_APP_ID__: JSON.stringify(fb.appId),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
