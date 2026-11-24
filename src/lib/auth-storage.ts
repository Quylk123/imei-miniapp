import { getSetting, getStorage, getUserID, getUserInfo, nativeStorage, removeStorage, setStorage } from "zmp-sdk";
import { withTimeout } from "@/lib/async";
import { createSessionStorage } from "@/lib/session-storage";

const url = import.meta.env.VITE_SUPABASE_URL as string;
if (!url) throw new Error("Missing VITE_SUPABASE_URL");
export const authStorageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

const IDENTITY_TIMEOUT_MS = 6000;
const ASYNC_STORAGE_TIMEOUT_MS = 4000;
const LEGACY_MIGRATION_TIMEOUT_MS = 2500;

let resolvedIdentity: string | undefined;
let pendingIdentity: Promise<string | null> | undefined;

export function isZaloMiniApp() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "h5.zdn.vn" || host.endsWith(".h5.zdn.vn");
}

async function resolveZaloId(): Promise<string | null> {
  try {
    const id = await withTimeout(getUserID({}), IDENTITY_TIMEOUT_MS);
    if (id) return id;
  } catch {
    // The bridge may still be initializing when the app opens.
  }

  try {
    const { authSetting } = await withTimeout(getSetting({}), IDENTITY_TIMEOUT_MS);
    if (!authSetting?.["scope.userInfo"]) return null;
    const { userInfo } = await withTimeout(
      getUserInfo({ autoRequestPermission: false }),
      IDENTITY_TIMEOUT_MS,
    );
    return userInfo?.id || null;
  } catch {
    return null;
  }
}

function getZaloId(): Promise<string | null | undefined> {
  if (!isZaloMiniApp()) return Promise.resolve(undefined);
  if (resolvedIdentity) return Promise.resolve(resolvedIdentity);
  if (!pendingIdentity) {
    pendingIdentity = resolveZaloId()
      .then((id) => {
        if (id) resolvedIdentity = id;
        return id;
      })
      .finally(() => {
        pendingIdentity = undefined;
      });
  }
  return pendingIdentity;
}

export function bindZaloSessionIdentity(zaloId: string) {
  if (zaloId && isZaloMiniApp()) {
    resolvedIdentity = zaloId;
    pendingIdentity = undefined;
  }
}

// Official synchronous nativeStorage uses its own prefix (`ns:`) storing raw UTF-8 strings,
// isolated from deprecated async setStorage (`zmp:`) whose fallback base64-encodes values.
const NATIVE_SYNC_PREFIX = "ns:";
const NATIVE_MIGRATED_PREFIX = "ns:checked:";
const LEGACY_ASYNC_PREFIX = "zmp:";

function readSyncNative(storageKey: string): { supported: boolean; value: string | null } {
  try {
    const value = nativeStorage.getItem(storageKey);
    return { supported: true, value: value ? value : null };
  } catch {
    return { supported: false, value: null };
  }
}

function writeSyncNative(storageKey: string, value: string): boolean {
  try {
    nativeStorage.setItem(storageKey, value);
    return true;
  } catch {
    return false;
  }
}

function removeSyncNative(storageKeys: string[]): boolean {
  try {
    for (const storageKey of storageKeys) {
      nativeStorage.removeItem(storageKey);
    }
    // zmp-sdk's LocalResourceStorage fallback does not implement removeSynchronize(),
    // so verify that every key was actually cleared before skipping async removeStorage.
    return storageKeys.every((storageKey) => !nativeStorage.getItem(storageKey));
  } catch {
    return false;
  }
}

const zaloStorage = {
  async getItem(key: string) {
    const syncKey = `${NATIVE_SYNC_PREFIX}${key}`;
    const migratedKey = `${NATIVE_MIGRATED_PREFIX}${key}`;
    const legacyKey = `${LEGACY_ASYNC_PREFIX}${key}`;

    const syncResult = readSyncNative(syncKey);
    if (syncResult.value !== null) return syncResult.value;

    if (syncResult.supported && readSyncNative(migratedKey).value === "1") {
      return null;
    }

    const timeout = syncResult.supported ? LEGACY_MIGRATION_TIMEOUT_MS : ASYNC_STORAGE_TIMEOUT_MS;
    const entries = await withTimeout(getStorage({ keys: [legacyKey, key] }), timeout);
    const raw = entries?.[legacyKey] ?? entries?.[key];
    if (raw == null || raw === "") {
      if (syncResult.supported) writeSyncNative(migratedKey, "1");
      return null;
    }

    const normalized = typeof raw === "string" ? raw : JSON.stringify(raw);
    if (syncResult.supported) {
      writeSyncNative(syncKey, normalized);
      writeSyncNative(migratedKey, "1");
    }
    return normalized;
  },
  async setItem(key: string, value: string) {
    const syncKey = `${NATIVE_SYNC_PREFIX}${key}`;
    const migratedKey = `${NATIVE_MIGRATED_PREFIX}${key}`;
    if (writeSyncNative(syncKey, value)) {
      writeSyncNative(migratedKey, "1");
      return;
    }

    const legacyKey = `${LEGACY_ASYNC_PREFIX}${key}`;
    const result = await withTimeout(
      setStorage({ data: { [legacyKey]: value } }),
      ASYNC_STORAGE_TIMEOUT_MS,
    );
    if (result?.errorKeys?.includes(legacyKey)) throw new Error("Zalo could not store the session");
  },
  async removeItem(key: string) {
    const syncKey = `${NATIVE_SYNC_PREFIX}${key}`;
    const legacyKey = `${LEGACY_ASYNC_PREFIX}${key}`;
    if (removeSyncNative([syncKey, legacyKey, key])) return;

    const result = await withTimeout(
      removeStorage({ keys: [syncKey, legacyKey, key] }),
      ASYNC_STORAGE_TIMEOUT_MS,
    );
    if (result?.errorKeys?.includes(syncKey) || result?.errorKeys?.includes(legacyKey)) {
      throw new Error("Zalo could not remove the session");
    }
  },
};

export const authStorage = createSessionStorage({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
}, zaloStorage, getZaloId, authStorageKey);
