import { getSetting, getStorage, getUserID, getUserInfo, removeStorage, setStorage } from "zmp-sdk";
import { withTimeout } from "@/lib/async";
import { createSessionStorage } from "@/lib/session-storage";

const url = import.meta.env.VITE_SUPABASE_URL as string;
if (!url) throw new Error("Missing VITE_SUPABASE_URL");
export const authStorageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

let identity: Promise<string | null> | undefined;
const bridgeTimeout = 1500;

function isZaloMiniApp() {
  return typeof window !== "undefined" && window.location.hostname === "h5.zdn.vn";
}

async function resolveZaloId(): Promise<string | null> {
  try {
    const id = await withTimeout(getUserID({}), bridgeTimeout);
    if (id) return id;
  } catch {
    // The bridge may still be initializing when the app opens.
  }

  try {
    return await withTimeout(getSetting({}).then(async ({ authSetting }) => {
      if (!authSetting["scope.userInfo"]) return null;
      const { userInfo } = await getUserInfo({ autoRequestPermission: false });
      return userInfo.id || null;
    }), bridgeTimeout);
  } catch {
    return null;
  }
}

function getZaloId(): Promise<string | null | undefined> {
  return isZaloMiniApp() ? (identity ??= resolveZaloId()) : Promise.resolve(undefined);
}

export function bindZaloSessionIdentity(zaloId: string) {
  if (zaloId && isZaloMiniApp()) identity = Promise.resolve(zaloId);
}

const zaloStorage = {
  async getItem(key: string) {
    const entries = await withTimeout(getStorage({ keys: [key] }), bridgeTimeout);
    const value = entries[key];
    if (value == null || typeof value === "string") return value ?? null;
    // Older releases wrote raw JSON through the synchronous Zalo API.
    return JSON.stringify(value);
  },
  async setItem(key: string, value: string) {
    const result = await withTimeout(setStorage({ data: { [key]: value } }), bridgeTimeout);
    if (result?.errorKeys?.includes(key)) throw new Error("Zalo could not store the session");
  },
  async removeItem(key: string) {
    const result = await withTimeout(removeStorage({ keys: [key] }), bridgeTimeout);
    if (result?.errorKeys?.includes(key)) throw new Error("Zalo could not remove the session");
  },
};

export const authStorage = createSessionStorage({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
}, zaloStorage, getZaloId, authStorageKey);
