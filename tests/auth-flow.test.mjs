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
    define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://imei-test.invalid') },
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
        if (id === '\0mock:sdk') return `export const authorize=async()=>{},
          getUserInfo=(args)=>globalThis.__authTest.sdkProfile(args), getUserID=()=>globalThis.__authTest.sdkId(),
          getSetting=()=>globalThis.__authTest.sdkSettings(), getPhoneNumber=async()=>null, getAccessToken=async()=>null,
          getStorage=(args)=>globalThis.__authTest.sdkRead(args), setStorage=(args)=>globalThis.__authTest.sdkWrite(args),
          removeStorage=(args)=>globalThis.__authTest.sdkRemove(args);`;
        if (id === '\0mock:sdk-apis') return `export const openChat=async()=>{}, openPhone=async()=>{};`;
        if (id === '\0mock:@/lib/supabase') return `export const supabase = {
          auth: { getSession: () => globalThis.__authTest.session(), setSession: () => globalThis.__authTest.setSession(), signOut: async () => ({error:null}) },
          from: () => ({select: () => ({eq: () => ({maybeSingle: () => globalThis.__authTest.profile()})})})
        };`;
        if (id === '\0mock:@/lib/auth-storage') return `export const authStorageKey = 'sb-test-auth-token';
          export const bindZaloSessionIdentity=(id)=>{globalThis.__authTest.boundIdentity=id;};
          export const authStorage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };`;
        if (id === '\0mock:@/services/zalo-auth') return `export const clearAuthCache=()=>{}, setCachedCustomer=()=>{},
          fullRegistrationFlow=()=>globalThis.__authTest.register(),
          hasSignedInBefore=async()=>globalThis.__authTest.returningMember,
          rememberMember=async()=>{globalThis.__authTest.returningMember=true;},
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
      boundIdentity: null,
      returningMember: false, sessionCleared: false,
      register: async () => ({customer}), imeis: async () => [], orders: async () => []
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
        const nativeKey = `${first.authStorageKey}:zalo:${memberId}`;
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
        assert.equal(JSON.parse(window.localStorage.getItem(nativeKey)).access_token, token);

        openWebView();
        scenario.sdkId = async () => 'another-zalo-user';
        const different = await server.ssrLoadModule('/src/lib/auth-storage.ts?another-user');
        assert.equal(await different.authStorage.getItem(different.authStorageKey), null);

        openWebView();
        scenario.sdkId = async () => memberId;
        native.set(nativeKey, savedSession); // Raw JSON written by an older build.
        const migrated = await server.ssrLoadModule('/src/lib/auth-storage.ts?old-native-data');
        assert.deepEqual(JSON.parse(await migrated.authStorage.getItem(migrated.authStorageKey)), JSON.parse(savedSession));
        await migrated.authStorage.removeItem(migrated.authStorageKey);
        assert.equal(native.has(nativeKey), false);
        assert.equal(await migrated.authStorage.getItem(migrated.authStorageKey), null);
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
  } finally { await server.close(); delete globalThis.__authTest; }
});
