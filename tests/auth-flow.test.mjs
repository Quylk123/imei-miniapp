import assert from 'node:assert/strict';
import { test } from 'node:test';
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
    ssr: { noExternal: ['zmp-sdk'] },
    resolve: { alias: { '@': new URL('../src', import.meta.url).pathname.replace(/^\/(.:)/, '$1') } },
    plugins: [{ name: 'auth-test-dependencies', enforce: 'pre',
      resolveId(id) {
        if (id === 'zmp-sdk') return '\0mock:sdk';
        for (const path of ['lib/supabase','data/supabase','services/zalo-auth']) {
          if (id === '@/' + path || id.replaceAll('\\', '/').endsWith('/src/' + path)) return '\0mock:@/' + path;
        }
      },
      load(id) {
        if (id === '\0mock:sdk') return `export const authorize=async()=>{}, getUserInfo=async()=>({userInfo:{id:'zalo-test',name:'Test'}}), getPhoneNumber=async()=>null, getAccessToken=async()=>null;`;
        if (id === '\0mock:@/lib/supabase') return `export const supabase = {
          auth: { getSession: () => globalThis.__authTest.session(), setSession: () => globalThis.__authTest.setSession(), signOut: async () => ({error:null}) },
          from: () => ({select: () => ({eq: () => ({maybeSingle: () => globalThis.__authTest.profile()})})})
        };`;
        if (id === '\0mock:@/services/zalo-auth') return `export const clearAuthCache=()=>{}, setCachedCustomer=()=>{},
          fullRegistrationFlow=()=>globalThis.__authTest.register();`;
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
      register: async () => ({customer}), imeis: async () => [], orders: async () => []
    });
    await t.test('new visitor completes bootstrap as guest', async () => {
      reset(); const store = createStore();
      await store.set(a.autoLoginAtom);
      assert.equal(store.get(a.authInitializedAtom), true);
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
        scenario.setSession=async()=>({data:{session:{user:{user_metadata:{customer_id:customer.id}}}},error:null});
        assert.equal((await service.fullRegistrationFlow()).customer.id,customer.id);
      } finally { globalThis.fetch=originalFetch; }
    });
    await t.test('direct my-imei renders registration instead of an empty redirect', async () => {
      reset(); const store=createStore(); await store.set(a.autoLoginAtom);
      const {default: MyImeiPage}=await server.ssrLoadModule('/src/pages/my-imei/index.tsx');
      const render=()=>renderToString(React.createElement(Provider,{store},
        React.createElement(MemoryRouter,{initialEntries:['/my-imei?campaign=test']},React.createElement(MyImeiPage))));
      assert.match(render(), /Đăng ký thành viên/);
      store.set(a.authBootstrapErrorAtom,'Phiên lỗi');
      assert.match(render(), /Thử khôi phục phiên/);
      store.set(a.authBootstrapErrorAtom,null);
      store.set(a.customerAtom,customer);
      store.set(a.myImeisErrorAtom,'Không tải được SIM');
      assert.match(render(), /Thử tải lại/);
      assert.doesNotMatch(render(), /Chưa có SIM nào<\/h/);
    });
  } finally { await server.close(); delete globalThis.__authTest; }
});
