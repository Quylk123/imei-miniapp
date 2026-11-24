import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'vite';
import { createStore } from 'jotai/vanilla';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';

test('auth bootstrap, registration and independent data loading', async t => {
  const scenario = {};
  globalThis.__authTest = scenario;
  const server = await createServer({ configFile: false, server: { middlewareMode: true },
    esbuild: { jsx: 'automatic' },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://imei-test.invalid'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
      'import.meta.env.VITE_ZALO_APP_SECRET': JSON.stringify('test-zalo-secret'),
    },
    ssr: { noExternal: ['zmp-sdk'] },
    resolve: { alias: { '@': new URL('../src', import.meta.url).pathname.replace(/^\/(.:)/, '$1') } },
    plugins: [{ name: 'auth-test-dependencies', enforce: 'pre',
      resolveId(id) {
        if (id === 'zmp-sdk') return '\0mock:sdk';
        if (id === 'zmp-sdk/apis') return '\0mock:sdk-apis';
        for (const path of ['lib/supabase','lib/auth-storage','data/supabase','services/zalo-auth']) {
          if (id === '@/' + path || id.replaceAll('\\', '/').endsWith('/src/' + path)) return '\0mock:@/' + path;
        }
      },
      load(id) {
        if (id === '\0mock:sdk') return `export const authorize=(args)=>globalThis.__authTest.sdkAuthorize ? globalThis.__authTest.sdkAuthorize(args) : Promise.resolve(),
          getUserInfo=(args)=>globalThis.__authTest.sdkProfile(args), getUserID=()=>globalThis.__authTest.sdkId(),
          getSetting=()=>globalThis.__authTest.sdkSettings(),
          getPhoneNumber=()=>globalThis.__authTest.sdkPhone ? globalThis.__authTest.sdkPhone() : Promise.resolve(null),
          getAccessToken=()=>globalThis.__authTest.sdkAccessToken ? globalThis.__authTest.sdkAccessToken() : Promise.resolve(null),
          getStorage=(args)=>globalThis.__authTest.sdkRead(args), setStorage=(args)=>globalThis.__authTest.sdkWrite(args),
          removeStorage=(args)=>globalThis.__authTest.sdkRemove(args),
          nativeStorage={
            getItem:(k)=>globalThis.__authTest.sdkSyncGet ? globalThis.__authTest.sdkSyncGet(k) : null,
            setItem:(k,v)=>globalThis.__authTest.sdkSyncSet && globalThis.__authTest.sdkSyncSet(k,v),
            removeItem:(k)=>globalThis.__authTest.sdkSyncRemove && globalThis.__authTest.sdkSyncRemove(k),
            clear:()=>{},
            getStorageInfo:()=>({currentSize:0,limitSize:5120}),
          };`;
        if (id === '\0mock:sdk-apis') return `export const openChat=async()=>{}, openPhone=async()=>{};`;
        if (id === '\0mock:@/lib/supabase') return `export const supabase = {
          auth: { getSession: () => globalThis.__authTest.session(), setSession: (args) => globalThis.__authTest.setSession(args), signOut: async () => ({error:null}) },
          from: () => ({select: () => ({eq: () => ({maybeSingle: () => globalThis.__authTest.profile()})})})
        };`;
        if (id === '\0mock:@/lib/auth-storage') return `export const authStorageKey = 'sb-test-auth-token';
          export const isZaloMiniApp = () => typeof globalThis.__authTest.isZalo === 'function'
            ? globalThis.__authTest.isZalo()
            : (typeof window !== 'undefined' && (window.location.hostname === 'h5.zdn.vn' || window.location.hostname.endsWith('.h5.zdn.vn')));
          export const bindZaloSessionIdentity=(id)=>{globalThis.__authTest.boundIdentity=id;};
          export const authStorage = {
            getItem: async (k) => globalThis.__authTest.mockAuthStorage ? globalThis.__authTest.mockAuthStorage.getItem(k) : null,
            setItem: async (k, v) => { if (globalThis.__authTest.mockAuthStorage) await globalThis.__authTest.mockAuthStorage.setItem(k, v); },
            removeItem: async (k) => { if (globalThis.__authTest.mockAuthStorage) await globalThis.__authTest.mockAuthStorage.removeItem(k); },
          };`;
        if (id === '\0mock:@/services/zalo-auth') return `export const clearAuthCache=()=>{}, setCachedCustomer=()=>{},
          fullRegistrationFlow=()=>globalThis.__authTest.register(),
          silentReauthFlow=(opts)=>globalThis.__authTest.silentReauth ? globalThis.__authTest.silentReauth(opts) : Promise.resolve(null),
          hasSignedInBefore=async()=>globalThis.__authTest.returningMember,
          rememberMember=async()=>{globalThis.__authTest.returningMember=true;},
          hasExplicitlyLoggedOut=async()=>Boolean(globalThis.__authTest.explicitlyLoggedOut),
          markLoggedOut=async()=>{globalThis.__authTest.explicitlyLoggedOut=true;},
          clearLoggedOut=async()=>{globalThis.__authTest.explicitlyLoggedOut=false;},
          clearStoredSession=async()=>{globalThis.__authTest.sessionCleared=true;};`;
        if (id === '\0mock:@/data/supabase') return `export const fetchMyIMEIs=()=>globalThis.__authTest.imeis(),
          fetchMyOrders=()=>globalThis.__authTest.orders(), fetchBanners=async()=>[], fetchCategories=async()=>[],
          fetchProducts=async()=>[], fetchPackages=async()=>[];`;
      }
    }] });
  try {
    const a = await server.ssrLoadModule('/src/state/atoms.ts');
    const customer = {id:'customer-1',name:'Test',phone:'',imei_ids:[]};
    const flush = () => new Promise(r => setTimeout(r, 0));
    const reset = () => Object.assign(scenario, {
      session: async () => ({data:{session:null},error:null}),
      profile: async () => ({data:customer,error:null}),
      sdkProfile: async () => ({userInfo:{id:'zalo-test',name:'Test'}}),
      sdkAuthorize: async () => {},
      sdkId: async () => 'zalo-test',
      sdkSettings: async () => ({authSetting:{}}),
      sdkPhone: async () => null,
      sdkAccessToken: async () => null,
      sdkSyncGet: () => { throw Error('Not supported'); },
      sdkSyncSet: () => { throw Error('Not supported'); },
      sdkSyncRemove: () => { throw Error('Not supported'); },
      isZalo: undefined,
      mockAuthStorage: undefined,
      boundIdentity: null,
      returningMember: false,
      explicitlyLoggedOut: false,
      sessionCleared: false,
      silentReauth: async () => null,
      register: async () => ({customer}),
      imeis: async () => [],
      orders: async () => []
    });
    await t.test('new visitor completes bootstrap as guest', async () => {
      reset(); const store = createStore();
      assert.equal(store.get(a.authPendingAtom), true);
      await store.set(a.autoLoginAtom);
      assert.equal(store.get(a.authInitializedAtom), true);
      assert.equal(store.get(a.authPendingAtom), false);
      assert.equal(store.get(a.authNeedsSignInAtom), false);
      assert.equal(store.get(a.customerAtom), null);
      assert.equal(store.get(a.authBootstrapErrorAtom), null);
    });
    await t.test('session recovery error remains retryable', async () => {
      reset(); scenario.session = async () => {throw Error('offline');};
      const store = createStore(); await store.set(a.autoLoginAtom);
      assert.ok(store.get(a.authBootstrapErrorAtom));
      assert.equal(store.get(a.authLoadingAtom), false);
      reset(); await store.set(a.autoLoginAtom);
      assert.equal(store.get(a.authBootstrapErrorAtom), null);
    });
    await t.test('registration succeeds even when SIM loading fails; orders still load', async () => {
      reset(); scenario.imeis = async () => {throw Error('offline');};
      scenario.orders = async () => [{id:1}];
      const store = createStore(); await store.set(a.registerMemberAtom); await flush();
      assert.equal(store.get(a.customerAtom).id, customer.id);
      assert.equal(store.get(a.authErrorAtom), null);
      assert.ok(store.get(a.myImeisErrorAtom));
      assert.equal(store.get(a.myOrdersAtom).length, 1);
      scenario.imeis = async () => [{id:'sim'}];
      await store.set(a.refreshCustomerDataAtom);
      assert.equal(store.get(a.myImeisErrorAtom), null);
      assert.equal(store.get(a.myImeisAtom).length, 1);
    });
    await t.test('rejected registration does not become an authenticated customer', async () => {
      reset(); scenario.register = async () => {throw Error('user reject');};
      const store = createStore(); await assert.rejects(store.set(a.registerMemberAtom));
      assert.equal(store.get(a.customerAtom), null);
      assert.match(store.get(a.authErrorAtom), /từ chối/);
      assert.equal(store.get(a.authLoadingAtom), false);
    });
    await t.test('late bootstrap and data responses cannot restore logged-out identity', async () => {
      reset(); let resolve; scenario.session = () => new Promise(r => {resolve=r;});
      const store = createStore(); const pending = store.set(a.autoLoginAtom);
      await store.set(a.logoutAtom);
      assert.equal(scenario.sessionCleared, true);
      resolve({data:{session:{user:{user_metadata:{customer_id:customer.id}}}},error:null});
      await pending; assert.equal(store.get(a.customerAtom), null);
      reset(); let resolveData; scenario.imeis=()=>new Promise(r=>{resolveData=r;});
      await store.set(a.registerMemberAtom); await store.set(a.logoutAtom);
      resolveData([{id:'late-sim'}]); await flush();
      assert.deepEqual(store.get(a.myImeisAtom), []);
      assert.equal(store.get(a.customerDataLoadingAtom), false);
    });
    const {withTimeout} = await server.ssrLoadModule('/src/lib/async.ts');
    await t.test('hanging read times out', async () => {
      await assert.rejects(withTimeout(new Promise(()=>{}), 5), /timed out/);
    });
    const { createSessionStorage } = await server.ssrLoadModule('/src/lib/session-storage.ts');
    const makeStorage = () => {
      const values = new Map();
      return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
      };
    };
    const sessionKey = 'sb-test-auth-token';
    const memberId = 'zalo-test';
    const savedSession = JSON.stringify({ user: { user_metadata: { zalo_id: memberId } } });
    const open = (browser, native, id = memberId) => createSessionStorage(browser, native, async () => id, sessionKey);
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({exp:Math.floor(Date.now()/1000)+3600})}.dGVzdA`;
    const makeCustomerClient = (storage, storageKey) => createClient('https://imei-test.invalid', 'test-anon-key', {
      auth: {storage, storageKey, autoRefreshToken:false},
      global: {fetch: async (url, options) => {
        if (new URL(url).pathname === '/auth/v1/user') {
          return Response.json({id:'auth-test',user_metadata:{zalo_id:memberId}});
        }
        assert.equal(new URL(url).pathname, '/rest/v1/imeis');
        const authenticated = new Headers(options.headers).get('Authorization') === `Bearer ${token}`;
        return Response.json(authenticated ? [{id:'sim-test'}] : []);
      }},
    });

    await t.test('matching legacy session migrates and survives reopening with a fresh WebView', async () => {
      const browser = makeStorage();
      const native = makeStorage();
      browser.setItem(sessionKey, savedSession);
      assert.equal(await open(browser, native, 'different-user').getItem(sessionKey), null);

      assert.equal(await open(browser, native).getItem(sessionKey), savedSession);
      assert.equal(browser.getItem(sessionKey), null);
      const reopened = open(makeStorage(), native);
      assert.equal(await reopened.getItem(sessionKey), savedSession);
      assert.equal(await open(makeStorage(), native, 'different-user').getItem(sessionKey), null);

      const readNative = native.getItem;
      native.getItem = () => { throw Error('Bridge unavailable'); };
      assert.equal(await reopened.getItem(sessionKey), savedSession);
      native.getItem = readNative;

      await reopened.removeItem(sessionKey);
      assert.equal(await open(makeStorage(), native).getItem(sessionKey), null);
    });

    await t.test('browser fallback keeps the current session when Native Storage fails', async () => {
      const browser = makeStorage();
      const native = makeStorage();
      await open(browser, native).setItem(sessionKey, savedSession);
      native.setItem = () => { throw Error('Permission denied'); };
      await open(browser, native).setItem(sessionKey, 'refreshed session');
      assert.equal(await open(browser, native).getItem(sessionKey), 'refreshed session');

      native.removeItem = () => { throw Error('Permission denied'); };
      await open(browser, native).removeItem(sessionKey);
      assert.equal(await open(browser, native).getItem(sessionKey), null);
    });

    await t.test('IMEI requests keep the signed-in token after a Native Storage read fails', async () => {
      const browser = makeStorage();
      const native = makeStorage();
      const client = makeCustomerClient(open(browser, native), sessionKey);
      const signedIn = await client.auth.setSession({access_token:token,refresh_token:'test-only'});
      assert.ok(signedIn.data.session);
      native.getItem = () => { throw Error('Bridge unavailable'); };
      const result = await client.from('imeis').select('id');
      assert.deepEqual(result.data, [{id:'sim-test'}]);
    });

    await t.test('failed Zalo identity lookup keeps browser sessions isolated', async () => {
      const browser = makeStorage();
      const native = makeStorage();
      browser.setItem(sessionKey, savedSession);
      assert.equal(await open(browser, native, null).getItem(sessionKey), null);
      const web = createSessionStorage(browser, native, async () => undefined, sessionKey);
      assert.equal(await web.getItem(sessionKey), savedSession);
    });
    await t.test('login binds Zalo identity after startup lookup fails and the session survives a new WebView', async () => {
      const previousWindow = globalThis.window;
      const openWebView = () => { globalThis.window = {location:{hostname:'h5.zdn.vn'},localStorage:makeStorage()}; };
      const native = new Map();
      Object.assign(scenario, {
        sdkId: async () => undefined,
        sdkSettings: async () => ({authSetting:{}}),
        sdkProfile: async () => assert.fail('Startup must not ask for profile without permission'),
        sdkRead: async ({keys}) => Object.fromEntries(keys.map(key => [key, native.has(key) ? JSON.parse(native.get(key)) : null])),
        sdkWrite: async ({data}) => {
          for (const [key,value] of Object.entries(data)) native.set(key, JSON.stringify(value));
          return {errorKeys:[]};
        },
        sdkRemove: async ({keys}) => {
          for (const key of keys) native.delete(key);
          return {errorKeys:[]};
        },
      });
      try {
        openWebView();
        const first = await server.ssrLoadModule('/src/lib/auth-storage.ts?first-open');
        assert.equal(await first.authStorage.getItem(first.authStorageKey), null);
        first.bindZaloSessionIdentity(memberId);
        const initialClient = makeCustomerClient(first.authStorage, first.authStorageKey);
        const signedIn = await initialClient.auth.setSession({access_token:token,refresh_token:'test-only'});
        assert.ok(signedIn.data.session);
        const browserKey = `${first.authStorageKey}:zalo:${memberId}`;
        const nativeKey = `zmp:${browserKey}`;
        assert.equal(JSON.parse(JSON.parse(native.get(nativeKey))).access_token, token);

        openWebView();
        scenario.sdkSettings = async () => ({authSetting:{'scope.userInfo':true}});
        scenario.sdkProfile = async (args) => {
          assert.deepEqual(args,{autoRequestPermission:false});
          return {userInfo:{id:memberId}};
        };
        const reopened = await server.ssrLoadModule('/src/lib/auth-storage.ts?reopened');
        const reopenedClient = makeCustomerClient(reopened.authStorage, reopened.authStorageKey);
        const result = await reopenedClient.from('imeis').select('id');
        assert.deepEqual(result.data, [{id:'sim-test'}]);
        assert.equal(JSON.parse(window.localStorage.getItem(browserKey)).access_token, token);

        openWebView();
        scenario.sdkId = async () => 'another-zalo-user';
        const different = await server.ssrLoadModule('/src/lib/auth-storage.ts?another-user');
        assert.equal(await different.authStorage.getItem(different.authStorageKey), null);

        openWebView();
        scenario.sdkId = async () => memberId;
        native.clear();
        native.set(browserKey, savedSession); // Raw JSON written by an older build without zmp: prefix.
        window.localStorage.setItem(browserKey, 'JTIyJTdCY29ycnVwdGVk'); // Corrupted base64 from key collision.
        const migrated = await server.ssrLoadModule('/src/lib/auth-storage.ts?old-native-data');
        assert.deepEqual(JSON.parse(await migrated.authStorage.getItem(migrated.authStorageKey)), JSON.parse(savedSession));
        await migrated.authStorage.removeItem(migrated.authStorageKey);
        assert.equal(native.has(browserKey), false);
        assert.equal(native.has(nativeKey), false);
        assert.equal(await migrated.authStorage.getItem(migrated.authStorageKey), null);
      } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        reset();
      }
    });
    await t.test('nativeStorage sync persistence, one-time migration from legacy getStorage, and removeItem fallback', async () => {
      const previousWindow = globalThis.window;
      const openWebView = () => { globalThis.window = {location:{hostname:'h5.zdn.vn'},localStorage:makeStorage()}; };
      const syncStore = new Map();
      const legacyStore = new Map();
      let asyncReadCalls = 0;
      let asyncWriteCalls = 0;
      let asyncRemoveCalls = 0;
      Object.assign(scenario, {
        sdkId: async () => memberId,
        sdkSettings: async () => ({authSetting:{}}),
        sdkSyncGet: (k) => syncStore.get(k) ?? null,
        sdkSyncSet: (k, v) => { syncStore.set(k, v); },
        sdkSyncRemove: (k) => { syncStore.delete(k); },
        sdkRead: async ({keys}) => {
          asyncReadCalls++;
          return Object.fromEntries(keys.map(k => [k, legacyStore.has(k) ? JSON.parse(legacyStore.get(k)) : null]));
        },
        sdkWrite: async ({data}) => {
          asyncWriteCalls++;
          for (const [k, v] of Object.entries(data)) legacyStore.set(k, JSON.stringify(v));
          return {errorKeys:[]};
        },
        sdkRemove: async ({keys}) => {
          asyncRemoveCalls++;
          for (const k of keys) legacyStore.delete(k);
          return {errorKeys:[]};
        },
      });
      try {
        openWebView();
        const first = await server.ssrLoadModule('/src/lib/auth-storage.ts?sync-first');
        await first.authStorage.setItem(first.authStorageKey, savedSession);
        const browserKey = `${first.authStorageKey}:zalo:${memberId}`;
        assert.equal(asyncWriteCalls, 0);
        assert.equal(syncStore.get(`ns:${browserKey}`), savedSession);

        openWebView();
        const reopened = await server.ssrLoadModule('/src/lib/auth-storage.ts?sync-reopen');
        assert.equal(await reopened.authStorage.getItem(reopened.authStorageKey), savedSession);
        assert.equal(asyncReadCalls, 0);

        syncStore.clear();
        legacyStore.set(`zmp:${browserKey}`, JSON.stringify(savedSession));
        openWebView();
        const migrated = await server.ssrLoadModule('/src/lib/auth-storage.ts?sync-migrate');
        assert.equal(await migrated.authStorage.getItem(migrated.authStorageKey), savedSession);
        assert.equal(asyncReadCalls, 1);
        assert.equal(syncStore.get(`ns:${browserKey}`), savedSession);
        assert.equal(syncStore.get(`ns:checked:${browserKey}`), '1');

        syncStore.delete(`ns:${browserKey}`);
        openWebView();
        const checkedMiss = await server.ssrLoadModule('/src/lib/auth-storage.ts?sync-checked');
        assert.equal(await checkedMiss.authStorage.getItem(checkedMiss.authStorageKey), null);
        assert.equal(asyncReadCalls, 1);

        syncStore.set(`ns:${browserKey}`, savedSession);
        legacyStore.set(`zmp:${browserKey}`, JSON.stringify(savedSession));
        scenario.sdkSyncRemove = () => {};
        await checkedMiss.authStorage.removeItem(checkedMiss.authStorageKey);
        assert.equal(asyncRemoveCalls, 1);
        assert.equal(legacyStore.has(`zmp:${browserKey}`), false);
      } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        reset();
      }
    });
    await t.test('transient getUserID failure does not permanently cache null and recovers on retry', async () => {
      const previousWindow = globalThis.window;
      const syncStore = new Map();
      globalThis.window = {location:{hostname:'h5.zdn.vn'},localStorage:makeStorage()};
      Object.assign(scenario, {
        sdkId: async () => { throw Error('Bridge initializing'); },
        sdkSettings: async () => ({authSetting:{}}),
        sdkSyncGet: (k) => syncStore.get(k) ?? null,
        sdkSyncSet: (k, v) => { syncStore.set(k, v); },
        sdkSyncRemove: (k) => { syncStore.delete(k); },
        sdkRead: async () => ({}),
        sdkWrite: async () => ({errorKeys:[]}),
        sdkRemove: async () => ({errorKeys:[]}),
      });
      try {
        const mod = await server.ssrLoadModule('/src/lib/auth-storage.ts?transient-id');
        syncStore.set(`ns:${mod.authStorageKey}:zalo:${memberId}`, savedSession);
        assert.equal(await mod.authStorage.getItem(mod.authStorageKey), null);
        scenario.sdkId = async () => memberId;
        assert.equal(await mod.authStorage.getItem(mod.authStorageKey), savedSession);
      } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        reset();
      }
    });
    await t.test('real registration rejects missing, failed and mismatched sessions', async () => {
      const service = await server.ssrLoadModule('/src/services/zalo-auth.ts');
      const originalFetch = globalThis.fetch;
      try {
        let payload = {customer};
        globalThis.fetch = async () => ({ok:true,json:async()=>payload});
        await assert.rejects(service.fullRegistrationFlow(), /no session/);
        payload = {customer,session:{access_token:'test-only',refresh_token:'test-only'}};
        scenario.setSession=async()=>({data:{session:null},error:Error('invalid session')});
        await assert.rejects(service.fullRegistrationFlow(), /invalid session/);
        scenario.setSession=async()=>({data:{session:{user:{user_metadata:{customer_id:'other'}}}},error:null});
        await assert.rejects(service.fullRegistrationFlow(), /does not match/);
        scenario.setSession=async()=>{
          assert.equal(scenario.boundIdentity,memberId);
          return {data:{session:{user:{user_metadata:{customer_id:customer.id}}}},error:null};
        };
        assert.equal((await service.fullRegistrationFlow()).customer.id,customer.id);
      } finally { globalThis.fetch=originalFetch; }
    });
    await t.test('direct my-imei offers Zalo sign-in when no session can be restored', async () => {
      reset(); const store=createStore(); await store.set(a.autoLoginAtom);
      const {default: MyImeiPage}=await server.ssrLoadModule('/src/pages/my-imei/index.tsx');
      const render=()=>renderToString(React.createElement(Provider,{store},
        React.createElement(MemoryRouter,{initialEntries:['/my-imei?campaign=test']},React.createElement(MyImeiPage))));
      assert.match(render(), /Đăng nhập bằng Zalo/);
      assert.doesNotMatch(render(), /Đăng ký thành viên/);
      store.set(a.authBootstrapErrorAtom,'Phiên lỗi');
      assert.match(render(), /Thử khôi phục phiên/);
      store.set(a.authBootstrapErrorAtom,null);
      store.set(a.customerAtom,customer);
      store.set(a.myImeisErrorAtom,'Không tải được SIM');
      assert.match(render(), /Thử tải lại/);
      assert.doesNotMatch(render(), /Chưa có SIM nào<\/h/);
    });
    await t.test('auth screens avoid prompting returning members to register again', async () => {
      reset();
      scenario.returningMember = true;
      const store = createStore();
      const {default: AuthPage} = await server.ssrLoadModule('/src/pages/auth/index.tsx');
      const {default: AccountPage} = await server.ssrLoadModule('/src/pages/account/index.tsx');
      const render = (Page) => renderToString(React.createElement(Provider, {store},
        React.createElement(MemoryRouter, null, React.createElement(Page))));
      for (const Page of [AuthPage, AccountPage]) {
        assert.match(render(Page), /Đang khôi phục phiên đăng nhập/);
        assert.doesNotMatch(render(Page), /[Đđ]ăng ký/);
      }
      await store.set(a.autoLoginAtom);
      assert.equal(store.get(a.customerAtom), null);
      for (const Page of [AuthPage, AccountPage]) {
        assert.match(render(Page), /Đăng nhập lại bằng Zalo/);
        assert.doesNotMatch(render(Page), /[Đđ]ăng ký/);
      }
      scenario.session = async () => ({data:{session:{user:{user_metadata:{customer_id:customer.id}}}},error:null});
      await store.set(a.autoLoginAtom);
      assert.match(render(AccountPage), /Test/);
      assert.doesNotMatch(render(AccountPage), /Đăng nhập lại bằng Zalo|[Đđ]ăng ký/);
    });
    await t.test('autoLoginAtom silently restores session unless explicitly logged out, and guards late reauth races', async () => {
      reset();
      let silentCalls = 0;
      scenario.silentReauth = async () => {
        silentCalls++;
        return {customer};
      };
      scenario.imeis = async () => [{id:'sim-silent'}];
      scenario.orders = async () => [{id:42}];
      const store = createStore();
      const ok = await store.set(a.autoLoginAtom);
      await flush();
      assert.equal(ok, true);
      assert.equal(silentCalls, 1);
      assert.equal(store.get(a.customerAtom)?.id, customer.id);
      assert.equal(store.get(a.myImeisAtom).length, 1);
      assert.equal(store.get(a.myOrdersAtom).length, 1);
      assert.equal(store.get(a.authBootstrapErrorAtom), null);

      await store.set(a.logoutAtom);
      assert.equal(scenario.explicitlyLoggedOut, true);
      assert.equal(store.get(a.customerAtom), null);

      const afterLogout = await store.set(a.autoLoginAtom);
      assert.equal(afterLogout, false);
      assert.equal(silentCalls, 1);
      assert.equal(store.get(a.customerAtom), null);

      await store.set(a.registerMemberAtom);
      await flush();
      assert.equal(scenario.explicitlyLoggedOut, false);
      assert.equal(store.get(a.customerAtom)?.id, customer.id);

      const reopenedStore = createStore();
      const okAfterReopen = await reopenedStore.set(a.autoLoginAtom);
      await flush();
      assert.equal(okAfterReopen, true);
      assert.equal(silentCalls, 2);

      reset();
      let resolveSilent;
      let startedSilent;
      const silentStarted = new Promise(r => { startedSilent = r; });
      scenario.silentReauth = () => {
        startedSilent();
        return new Promise(r => { resolveSilent = r; });
      };
      const raceStore = createStore();
      const pending = raceStore.set(a.autoLoginAtom);
      await silentStarted;
      await raceStore.set(a.logoutAtom);
      resolveSilent({customer});
      const raceResult = await pending;
      assert.equal(raceResult, false);
      assert.equal(raceStore.get(a.customerAtom), null);
    });
    await t.test('real silentReauthFlow respects Zalo environment, granted scopes, and explicit logout', async () => {
      reset();
      const previousWindow = globalThis.window;
      const originalFetch = globalThis.fetch;
      try {
        const service = await server.ssrLoadModule('/src/services/zalo-auth.ts?silent-flow');

        let settingCalls = 0;
        let authorizeCalls = 0;
        let profileCalls = 0;
        let phoneCalls = 0;
        let fetchCalls = 0;
        let setSessionCalls = 0;
        let lastAuthBody = null;

        scenario.sdkAuthorize = async () => { authorizeCalls++; };
        scenario.sdkSettings = async () => { settingCalls++; return {authSetting:{}}; };
        scenario.sdkProfile = async (args) => {
          profileCalls++;
          assert.deepEqual(args, {autoRequestPermission:false});
          return {userInfo:{id:memberId,name:'Test',avatar:''}};
        };
        scenario.sdkPhone = async () => { phoneCalls++; return {token:'phone-token'}; };
        scenario.sdkAccessToken = async () => 'zalo-access-token';
        scenario.setSession = async (args) => {
          setSessionCalls++;
          assert.equal(args.access_token, token);
          return {data:{session:{user:{user_metadata:{customer_id:customer.id}}}},error:null};
        };
        globalThis.fetch = async (url, options) => {
          fetchCalls++;
          const u = String(url);
          if (u.startsWith('https://graph.zalo.me/')) {
            return {ok:true, json:async () => ({error:0, data:{number:'84901234567'}})};
          }
          lastAuthBody = JSON.parse(options.body);
          return {ok:true, json:async () => ({customer, session:{access_token:token, refresh_token:'refresh-1'}, is_new_customer:false})};
        };

        globalThis.window = {location:{hostname:'localhost'},localStorage:makeStorage()};
        assert.equal(await service.silentReauthFlow(), null);
        assert.equal(settingCalls, 0);

        globalThis.window = {location:{hostname:'h5.zdn.vn'},localStorage:makeStorage()};
        assert.equal(await service.silentReauthFlow(), null);
        assert.equal(settingCalls, 1);
        assert.equal(authorizeCalls, 0);
        assert.equal(profileCalls, 0);
        assert.equal(phoneCalls, 0);
        assert.equal(fetchCalls, 0);

        scenario.sdkSettings = async () => { settingCalls++; return {authSetting:{'scope.userInfo':true}}; };
        const noPhoneRes = await service.silentReauthFlow();
        assert.equal(noPhoneRes?.customer.id, customer.id);
        assert.equal(authorizeCalls, 0);
        assert.equal(profileCalls, 1);
        assert.equal(phoneCalls, 0);
        assert.equal(fetchCalls, 1);
        assert.equal(setSessionCalls, 1);
        assert.equal(scenario.boundIdentity, memberId);
        assert.equal(lastAuthBody.phone, null);

        scenario.sdkSettings = async () => { settingCalls++; return {authSetting:{'scope.userInfo':true,'scope.userPhonenumber':true}}; };
        const withPhoneRes = await service.silentReauthFlow();
        assert.equal(withPhoneRes?.customer.id, customer.id);
        assert.equal(authorizeCalls, 0);
        assert.equal(profileCalls, 2);
        assert.equal(phoneCalls, 1);
        assert.equal(lastAuthBody.phone, '0901234567');

        scenario.mockAuthStorage = makeStorage();
        await service.markLoggedOut();
        const prevFetchCalls = fetchCalls;
        const prevSetSessionCalls = setSessionCalls;
        const loggedOutRes = await service.silentReauthFlow();
        assert.equal(loggedOutRes, null);
        assert.equal(fetchCalls, prevFetchCalls);
        assert.equal(setSessionCalls, prevSetSessionCalls);
      } finally {
        globalThis.fetch = originalFetch;
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        reset();
      }
    });
  } finally { await server.close(); delete globalThis.__authTest; }
});
