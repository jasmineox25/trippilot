import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Place } from "../../data";
import type { TravelMode } from "../../App";
import { assertFirebaseConfigured, firestoreDb } from "./firebase";

export type CloudTripStateV1 = {
  version: 1;
  myTrip: Place[];
  travelMode: TravelMode;
  departureTime: string;
  updatedAt?: any;
};

const stripUndefinedDeep = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isNaN(value)) return null;

  if (Array.isArray(value)) {
    const out = value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined);
    return out;
  }

  if (typeof value === "object") {
    // Keep special Firestore sentinel values (e.g., serverTimestamp()).
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = stripUndefinedDeep(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return value;
};

const userDoc = (uid: string) => {
  assertFirebaseConfigured();
  return doc(firestoreDb!, "users", uid);
};

export const loadCloudTripState = async (
  uid: string,
): Promise<CloudTripStateV1 | null> => {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  const data: any = snap.data();
  if (!data || typeof data !== "object") return null;

  // Stored under a namespaced field to avoid collisions.
  const v: any = data.tripoptimizer_v1;
  if (!v || typeof v !== "object") return null;
  if (v.version !== 1) return null;
  if (!Array.isArray(v.myTrip)) return null;
  if (typeof v.travelMode !== "string") return null;
  if (typeof v.departureTime !== "string") return null;

  return {
    version: 1,
    myTrip: v.myTrip,
    travelMode: v.travelMode,
    departureTime: v.departureTime,
    updatedAt: v.updatedAt,
  };
};

export const saveCloudTripState = async (
  uid: string,
  state: Omit<CloudTripStateV1, "updatedAt">,
) => {
  const docData = stripUndefinedDeep({
    tripoptimizer_v1: {
      ...state,
      updatedAt: serverTimestamp(),
    },
  });

  await setDoc(userDoc(uid), docData, { merge: true });
};
