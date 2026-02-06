import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import type { Place } from "../../data";
import type { TravelMode } from "../../App";
import { assertFirebaseConfigured, firestoreDb } from "./firebase";

export type RoutePlanV1 = {
  version: 1;
  id: string;
  name: string;
  myTrip: Place[];
  travelMode: TravelMode;
  departureTime: string;
  createdAtMs: number;
  updatedAtMs: number;
  // Cloud-only metadata; kept optional so local plans share the same type.
  createdAt?: any;
  updatedAt?: any;
};

export type RoutePlanSource = "cloud" | "local";

export type SaveRoutePlanResult = {
  plan: RoutePlanV1;
  source: RoutePlanSource;
};

export type ListRoutePlansResult = {
  plans: RoutePlanV1[];
  source: RoutePlanSource;
};

const mergePlansById = (primary: RoutePlanV1[], secondary: RoutePlanV1[]) => {
  const byId = new Map<string, RoutePlanV1>();
  for (const p of secondary) byId.set(p.id, p);
  for (const p of primary) byId.set(p.id, p);
  return Array.from(byId.values()).sort(
    (a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0),
  );
};

const isPermissionDenied = (e: unknown) => {
  try {
    if (e instanceof FirebaseError) {
      return e.code === "permission-denied";
    }
    const msg = String((e as any)?.message || "");
    return msg.toLowerCase().includes("missing or insufficient permissions");
  } catch {
    return false;
  }
};

const warnedFallbacks = new Set<string>();

const shouldLogFallbacks = (() => {
  try {
    const v = String((import.meta as any)?.env?.VITE_DEBUG_FIREBASE || "")
      .trim()
      .toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  } catch {
    return false;
  }
})();

const warnFallbackOnce = (key: string, ...args: any[]) => {
  if (!shouldLogFallbacks) return;
  if (warnedFallbacks.has(key)) return;
  warnedFallbacks.add(key);
  console.warn(...args);
};

const LEGACY_LOCAL_STORAGE_KEY = "tripoptimizer_route_plans_v1";
const GUEST_LOCAL_STORAGE_KEY = "tripoptimizer_route_plans_v1_guest";

const localStorageKeyForUid = (uid?: string | null) => {
  if (!uid) return GUEST_LOCAL_STORAGE_KEY;
  const safe = String(uid).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `tripoptimizer_route_plans_v1_uid_${safe}`;
};

const migrateLegacyLocalStorageOnce = () => {
  try {
    const legacy = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (!legacy) return;

    const guest = window.localStorage.getItem(GUEST_LOCAL_STORAGE_KEY);
    if (!guest) {
      window.localStorage.setItem(GUEST_LOCAL_STORAGE_KEY, legacy);
    }

    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    // Ignore.
  }
};

const safeParseJson = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const newId = () => {
  try {
    if (
      typeof globalThis !== "undefined" &&
      "crypto" in globalThis &&
      typeof (globalThis as any).crypto?.randomUUID === "function"
    ) {
      return (globalThis as any).crypto.randomUUID();
    }
  } catch {
    // Ignore.
  }

  return `plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const userPlansCollection = (uid: string) => {
  assertFirebaseConfigured();
  return collection(firestoreDb!, "users", uid, "tripoptimizer_routePlans_v1");
};

const userPlanDoc = (uid: string, id: string) => {
  assertFirebaseConfigured();
  return doc(firestoreDb!, "users", uid, "tripoptimizer_routePlans_v1", id);
};

const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (!v || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

// Firestore rejects `undefined` anywhere in a document (even nested inside arrays/objects).
const stripUndefinedDeep = (value: any): any => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    // Keep array shape; drop undefined entries.
    return value
      .map((it) => stripUndefinedDeep(it))
      .filter((it) => it !== undefined);
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const next = stripUndefinedDeep(v);
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  // Preserve non-plain objects (e.g., Firestore FieldValue from serverTimestamp()).
  return value;
};

export const listRoutePlansLocal = (uid?: string | null): RoutePlanV1[] => {
  try {
    migrateLegacyLocalStorageOnce();
    const raw = window.localStorage.getItem(localStorageKeyForUid(uid));
    if (!raw) return [];
    const parsed = safeParseJson(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((p: any) => p && typeof p === "object" && p.version === 1)
      .sort(
        (a: any, b: any) =>
          Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0),
      );
  } catch {
    return [];
  }
};

const writeRoutePlansLocal = (plans: RoutePlanV1[], uid?: string | null) => {
  try {
    migrateLegacyLocalStorageOnce();
    window.localStorage.setItem(
      localStorageKeyForUid(uid),
      JSON.stringify(plans),
    );
  } catch {
    // Ignore.
  }
};

export const saveRoutePlanLocal = (
  input: Omit<RoutePlanV1, "version" | "createdAtMs" | "updatedAtMs" | "id"> & {
    id?: string;
    createdAtMs?: number;
  },
  uid?: string | null,
): RoutePlanV1 => {
  const now = Date.now();
  const id = input.id || newId();
  const createdAtMs = Number(input.createdAtMs || now);

  const plan: RoutePlanV1 = {
    version: 1,
    id,
    name: String(input.name || "Untitled Trip"),
    myTrip: Array.isArray(input.myTrip) ? input.myTrip : [],
    travelMode: input.travelMode,
    departureTime: String(input.departureTime || ""),
    createdAtMs,
    updatedAtMs: now,
  };

  const existing = listRoutePlansLocal(uid);
  const next = [plan, ...existing.filter((p) => p.id !== id)];
  writeRoutePlansLocal(next, uid);
  return plan;
};

export const deleteRoutePlanLocal = (id: string, uid?: string | null) => {
  const existing = listRoutePlansLocal(uid);
  const next = existing.filter((p) => p.id !== id);
  writeRoutePlansLocal(next, uid);
};

export const saveRoutePlanCloud = async (
  uid: string,
  input: Omit<RoutePlanV1, "version" | "createdAtMs" | "updatedAtMs" | "id"> & {
    id?: string;
  },
): Promise<RoutePlanV1> => {
  const now = Date.now();
  const id = input.id || newId();

  const plan: RoutePlanV1 = {
    version: 1,
    id,
    name: String(input.name || "Untitled Trip"),
    myTrip: Array.isArray(input.myTrip) ? input.myTrip : [],
    travelMode: input.travelMode,
    departureTime: String(input.departureTime || ""),
    createdAtMs: now,
    updatedAtMs: now,
  };

  const docData = stripUndefinedDeep({
    ...plan,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(userPlanDoc(uid, id), docData, { merge: true });

  return plan;
};

export const listRoutePlansCloud = async (
  uid: string,
): Promise<RoutePlanV1[]> => {
  const q = query(userPlansCollection(uid), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  const plans: RoutePlanV1[] = [];

  snap.forEach((d) => {
    const data: any = d.data();
    if (!data || typeof data !== "object") return;
    if (data.version !== 1) return;

    plans.push({
      version: 1,
      id: d.id,
      name: String(data.name || "Untitled Trip"),
      myTrip: Array.isArray(data.myTrip) ? data.myTrip : [],
      travelMode: data.travelMode,
      departureTime: String(data.departureTime || ""),
      createdAtMs: Number(data.createdAtMs || 0),
      updatedAtMs: Number(data.updatedAtMs || 0),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  });

  return plans;
};

export const deleteRoutePlanCloud = async (uid: string, id: string) => {
  await deleteDoc(userPlanDoc(uid, id));
};

export const saveRoutePlan = async (
  uid: string | null | undefined,
  input: Omit<RoutePlanV1, "version" | "createdAtMs" | "updatedAtMs" | "id"> & {
    id?: string;
  },
): Promise<SaveRoutePlanResult> => {
  if (!uid) {
    throw new Error("请先登录后再保存到 My Trips。");
  }

  if (uid && firestoreDb) {
    try {
      const plan = await saveRoutePlanCloud(uid, input);
      return { plan, source: "cloud" };
    } catch (e) {
      if (!isPermissionDenied(e)) throw e;
      warnFallbackOnce(
        "cloud-save-permission-denied",
        "Cloud save denied; falling back to localStorage",
        e,
      );
      const plan = saveRoutePlanLocal(input, uid);
      return { plan, source: "local" };
    }
  }

  const plan = saveRoutePlanLocal(input, uid);
  return { plan, source: "local" };
};

export const listRoutePlans = async (
  uid: string | null | undefined,
): Promise<ListRoutePlansResult> => {
  if (!uid) {
    return { plans: [], source: "local" };
  }

  if (uid && firestoreDb) {
    const localPlans = listRoutePlansLocal(uid);
    try {
      const plans = await listRoutePlansCloud(uid);
      return { plans: mergePlansById(plans, localPlans), source: "cloud" };
    } catch (e) {
      if (!isPermissionDenied(e)) throw e;
      warnFallbackOnce(
        "cloud-list-permission-denied",
        "Cloud list denied; falling back to localStorage",
        e,
      );
      return { plans: localPlans, source: "local" };
    }
  }
  return { plans: listRoutePlansLocal(uid), source: "local" };
};

export const deleteRoutePlan = async (
  uid: string | null | undefined,
  id: string,
) => {
  if (!uid) return;

  if (uid && firestoreDb) {
    try {
      await deleteRoutePlanCloud(uid, id);
      deleteRoutePlanLocal(id, uid);
      return;
    } catch (e) {
      if (!isPermissionDenied(e)) throw e;
      warnFallbackOnce(
        "cloud-delete-permission-denied",
        "Cloud delete denied; falling back to localStorage",
        e,
      );
      deleteRoutePlanLocal(id, uid);
      return;
    }
  }
  deleteRoutePlanLocal(id, uid);
};
