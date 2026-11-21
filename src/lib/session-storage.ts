export interface SessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type NativeSessionStorage = {
  [Method in keyof SessionStorage]: (...args: Parameters<SessionStorage[Method]>) =>
    ReturnType<SessionStorage[Method]> | Promise<ReturnType<SessionStorage[Method]>>;
};

export function createSessionStorage(
  browser: SessionStorage,
  native: NativeSessionStorage,
  getZaloId: () => Promise<string | null | undefined>,
  sessionKey: string,
) {
  const memory = new Map<string, string>();
  const scopedKey = (key: string, id: string) => `${key}:zalo:${id}`;

  function read(store: SessionStorage, key: string) {
    try { return store.getItem(key) ?? null; }
    catch { return null; }
  }

  function remove(store: SessionStorage, key: string) {
    try { store.removeItem(key); }
    catch { /* Storage may be disabled in this WebView. */ }
  }

  function writeBrowser(key: string, value: string) {
    try {
      browser.setItem(key, value);
      memory.delete(key);
    } catch {
      memory.set(key, value);
    }
  }

  async function readNative(key: string) {
    try { return await native.getItem(key); }
    catch { return null; }
  }

  async function writeScoped(key: string, value: string) {
    // Keep the active WebView independent of the native bridge after sign-in.
    writeBrowser(key, value);
    try {
      await native.setItem(key, value);
    } catch {
      // Native Storage can be unavailable on older Zalo clients or without permission.
    }
  }

  function legacySessionFor(id: string) {
    const raw = read(browser, sessionKey);
    if (!raw) return null;
    try { return JSON.parse(raw)?.user?.user_metadata?.zalo_id === id ? raw : null; }
    catch { return null; }
  }

  return {
    async getItem(key: string) {
      const id = await getZaloId();
      if (id === undefined) return memory.get(key) ?? read(browser, key);
      if (id === null) return memory.get(key) ?? null;
      const scoped = scopedKey(key, id);
      const value = memory.get(scoped) ?? read(browser, scoped);
      if (value !== null) return value || null;

      const restored = await readNative(scoped);
      if (restored) {
        writeBrowser(scoped, restored);
        return restored;
      }

      const legacy = key === sessionKey ? legacySessionFor(id) : null;
      if (legacy) {
        await writeScoped(scoped, legacy);
        remove(browser, key);
      }
      return legacy;
    },
    async setItem(key: string, value: string) {
      const id = await getZaloId();
      if (id === undefined) writeBrowser(key, value);
      else if (id === null) memory.set(key, value);
      else await writeScoped(scopedKey(key, id), value);
    },
    async removeItem(key: string) {
      const id = await getZaloId();
      if (id === undefined) {
        memory.delete(key);
        remove(browser, key);
        return;
      }
      if (id === null) {
        memory.delete(key);
        return;
      }
      const scoped = scopedKey(key, id);
      memory.delete(scoped);
      remove(browser, scoped);
      // A failed native deletion must not revive a signed-out session from storage.
      try {
        await native.removeItem(scoped);
        if (await native.getItem(scoped)) writeBrowser(scoped, "");
      } catch {
        writeBrowser(scoped, "");
      }
      if (key === sessionKey && legacySessionFor(id)) remove(browser, key);
    },
  };
}
