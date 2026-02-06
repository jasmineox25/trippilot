import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { assertFirebaseConfigured, firestoreDb } from "./firebase";

export type CommunityTripV1 = {
  version: 1;
  id: string;
  title: string;
  description?: string;
  share: string; // encoded ShareTripPayload (v1 legacy or v2 compact)
  ownerUid: string;
  ownerName?: string;
  createdAtMs: number;
  updatedAtMs: number;
  createdAt?: any;
  updatedAt?: any;
};

export type PublishCommunityTripInput = {
  title: string;
  description?: string;
  share: string;
  ownerName?: string;
};

const COLLECTION = "tripoptimizer_communityTrips_v1";

const isPermissionDenied = (e: unknown) => {
  try {
    if (e instanceof FirebaseError) return e.code === "permission-denied";
    const msg = String((e as any)?.message || "");
    return msg.toLowerCase().includes("missing or insufficient permissions");
  } catch {
    return false;
  }
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const communityTripIdFromShare = async (share: string): Promise<string> => {
  const normalized = String(share || "").trim();
  try {
    if (
      typeof globalThis !== "undefined" &&
      (globalThis as any).crypto?.subtle
    ) {
      const data = new TextEncoder().encode(normalized);
      const digest = await (globalThis as any).crypto.subtle.digest(
        "SHA-256",
        data,
      );
      const hex = toHex(new Uint8Array(digest));
      return `ct_${hex.slice(0, 24)}`;
    }
  } catch {
    // Ignore.
  }

  // Fallback: deterministic-ish ID.
  const safe = normalized.slice(0, 120).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `ct_${safe}_${Math.random().toString(16).slice(2, 8)}`;
};

const communityCollection = () => {
  assertFirebaseConfigured();
  return collection(firestoreDb!, COLLECTION);
};

const communityDoc = (id: string) => {
  assertFirebaseConfigured();
  return doc(firestoreDb!, COLLECTION, id);
};

export const publishCommunityTrip = async (
  uid: string | null | undefined,
  input: PublishCommunityTripInput,
): Promise<{ id: string }> => {
  if (!uid) throw new Error("请先登录后再发布到社区。");
  if (!firestoreDb) {
    throw new Error(
      "Firebase 未配置：无法发布到社区。请先配置 Firebase 再重试。",
    );
  }

  const title = String(input.title || "")
    .trim()
    .slice(0, 80);
  if (!title) throw new Error("请填写标题。");

  const description = String(input.description || "")
    .trim()
    .slice(0, 280);
  const share = String(input.share || "").trim();
  if (!share) throw new Error("缺少分享数据。");

  const now = Date.now();
  const id = await communityTripIdFromShare(share);

  const ownerName = input.ownerName
    ? String(input.ownerName).trim().slice(0, 60)
    : "";

  const docData: any = {
    version: 1,
    id,
    title,
    share,
    ownerUid: uid,
    createdAtMs: now,
    updatedAtMs: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (description) docData.description = description;
  if (ownerName) docData.ownerName = ownerName;

  try {
    await setDoc(communityDoc(id), docData, { merge: true });
    return { id };
  } catch (e) {
    if (isPermissionDenied(e)) {
      throw new Error(
        "发布到社区被拒绝：请检查 Firestore 安全规则（需要允许读取 community 集合，并允许登录用户写入自己的帖子）。",
      );
    }
    throw e;
  }
};

export const unpublishCommunityTrip = async (
  uid: string | null | undefined,
  id: string,
): Promise<void> => {
  if (!uid) throw new Error("请先登录。");
  if (!firestoreDb) {
    throw new Error(
      "Firebase 未配置：无法取消发布。请先配置 Firebase 再重试。",
    );
  }

  const ref = communityDoc(String(id || "").trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data: any = snap.data();
  if (data?.ownerUid && String(data.ownerUid) !== uid) {
    throw new Error("你没有权限取消发布这条行程。");
  }

  try {
    await deleteDoc(ref);
  } catch (e) {
    if (isPermissionDenied(e)) {
      throw new Error(
        "取消发布被拒绝：请检查 Firestore 安全规则（需要允许作者删除自己的帖子）。",
      );
    }
    throw e;
  }
};

export const listCommunityTrips = async (args?: {
  max?: number;
}): Promise<CommunityTripV1[]> => {
  if (!firestoreDb) return [];
  const max = Math.max(1, Math.min(50, Number(args?.max || 20)));

  const q = query(
    communityCollection(),
    orderBy("updatedAt", "desc"),
    limit(max),
  );
  const snap = await getDocs(q);

  const items: CommunityTripV1[] = [];
  snap.forEach((d) => {
    const data: any = d.data();
    if (!data || typeof data !== "object") return;
    if (data.version !== 1) return;

    items.push({
      version: 1,
      id: d.id,
      title: String(data.title || "Untitled"),
      description:
        typeof data.description === "string"
          ? String(data.description)
          : undefined,
      share: String(data.share || ""),
      ownerUid: String(data.ownerUid || ""),
      ownerName:
        typeof data.ownerName === "string" ? String(data.ownerName) : undefined,
      createdAtMs: Number(data.createdAtMs || 0),
      updatedAtMs: Number(data.updatedAtMs || 0),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  });

  return items;
};
