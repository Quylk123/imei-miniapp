import { atom } from "jotai";
import type { ReactNode } from "react";

import {
  fetchBanners,
  fetchCategories,
  fetchMyIMEIs,
  fetchMyOrders,
  fetchProducts,
  fetchPackages,
} from "@/data/supabase";
import { withTimeout } from "@/lib/async";
import { supabase } from "@/lib/supabase";
import {
  clearAuthCache,
  fullRegistrationFlow,
  setCachedCustomer,
} from "@/services/zalo-auth";
import type {
  Banner,
  CartItem,
  Category,
  Customer,
  IMEI,
  Order,
  Package,
  Product,
  ShippingAddress,
} from "@/types";

// ─── Per-page header override ───────────────────────────────────────────────
export interface PageHeaderOverride {
  title?: string;
  right?: ReactNode;
}
export const pageHeaderOverrideAtom = atom<PageHeaderOverride>({});

// ─── Catalog data (loaded once on app start) ────────────────────────────────
export const categoriesAtom = atom<Category[]>([]);
export const productsAtom = atom<Product[]>([]);
export const packagesAtom = atom<Package[]>([]);
export const bannersAtom = atom<Banner[]>([]);
export const catalogLoadingAtom = atom(true);

// "Sản phẩm nổi bật" — admin-curated qua flag is_featured (xem migration
// 20260430_products_add_is_featured.sql). Nếu admin chưa flag sản phẩm nào
// (catalog mới), fallback về 4 sản phẩm có rating cao nhất để trang chủ
// không bị section trống.
const FEATURED_LIMIT = 6;
export const featuredProductsAtom = atom<Product[]>((get) => {
  const all = get(productsAtom);
  const tagged = all.filter((p) => p.is_featured);
  if (tagged.length > 0) return tagged.slice(0, FEATURED_LIMIT);
  return [...all]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 4);
});

// Load catalog data from Supabase
export const loadCatalogAtom = atom(null, async (_get, set) => {
  set(catalogLoadingAtom, true);
  try {
    const [cats, prods, pkgs, banners] = await Promise.all([
      fetchCategories(),
      fetchProducts(),
      fetchPackages(),
      fetchBanners(),
    ]);
    set(categoriesAtom, cats);
    set(productsAtom, prods);
    set(packagesAtom, pkgs);
    set(bannersAtom, banners);
  } catch (err) {
    console.error("Failed to load catalog:", err);
  } finally {
    set(catalogLoadingAtom, false);
  }
});

// ─── Auth — null = chưa đăng ký ────────────────────────────────────────────
export const customerAtom = atom<Customer | null>(null);

// IMEI list của customer hiện tại
export const myImeisAtom = atom<IMEI[]>([]);

// Orders của customer hiện tại (cả physical + imei)
export const myOrdersAtom = atom<Order[]>([]);

// Auth loading state
export const authLoadingAtom = atom(false);
// Separate bootstrap completion from registration/loading to guard deep links.
export const authInitializedAtom = atom(false);

// Auth error message (shown in UI)
export const authErrorAtom = atom<string | null>(null);

// Session bootstrap and customer data have independent failure states.
export const authBootstrapErrorAtom = atom<string | null>(null);
export const customerDataLoadingAtom = atom(false);
export const myImeisErrorAtom = atom<string | null>(null);
export const myOrdersErrorAtom = atom<string | null>(null);
const authAttemptAtom = atom(0);
const dataAttemptAtom = atom(0);

export const refreshCustomerDataAtom = atom(null, async (get, set) => {
  const customer = get(customerAtom);
  if (!customer || get(customerDataLoadingAtom)) return;
  const attempt = get(dataAttemptAtom) + 1;
  set(dataAttemptAtom, attempt);
  set(customerDataLoadingAtom, true);
  set(myImeisErrorAtom, null);
  set(myOrdersErrorAtom, null);
  const current = () => get(dataAttemptAtom) === attempt && get(customerAtom)?.id === customer.id;
  try {
    await Promise.all([
      withTimeout(fetchMyIMEIs(customer.id), 20000).then(data => {
        if (current()) set(myImeisAtom, data);
      }).catch(() => {
        if (current()) set(myImeisErrorAtom, "Không tải được SIM. Vui lòng thử lại.");
      }),
      withTimeout(fetchMyOrders(customer.id), 20000).then(data => {
        if (current()) set(myOrdersAtom, data);
      }).catch(() => {
        if (current()) set(myOrdersErrorAtom, "Không tải được đơn hàng. Vui lòng thử lại.");
      }),
    ]);
  } finally {
    if (current()) set(customerDataLoadingAtom, false);
  }
});

const acceptCustomerAtom = atom(null, (get, set, customer: Customer) => {
  if (get(customerAtom)?.id !== customer.id) {
    set(dataAttemptAtom, get(dataAttemptAtom) + 1);
    set(customerDataLoadingAtom, false);
    set(myImeisAtom, []);
    set(myOrdersAtom, []);
    set(myImeisErrorAtom, null);
    set(myOrdersErrorAtom, null);
  }
  set(customerAtom, customer);
});

export const registerMemberAtom = atom(null, async (get, set) => {
  if (get(authLoadingAtom)) throw new Error("Authentication already running");
  set(authAttemptAtom, get(authAttemptAtom) + 1);
  set(authLoadingAtom, true);
  set(authErrorAtom, null);
  try {
    // Resolves only after a valid Supabase session has been installed.
    const result = await fullRegistrationFlow();
    set(acceptCustomerAtom, result.customer);
    set(authBootstrapErrorAtom, null);
    set(authInitializedAtom, true);
    void set(refreshCustomerDataAtom);
    return result;
  } catch (err: any) {
    set(authErrorAtom, err?.message?.includes("user reject") || err?.code === -201
      ? "Bạn đã từ chối cấp quyền. Vui lòng thử lại."
      : "Chưa đăng nhập được. Vui lòng thử lại.");
    throw err;
  } finally {
    set(authLoadingAtom, false);
  }
});

export const autoLoginAtom = atom(null, async (get, set) => {
  if (get(authLoadingAtom)) return false;
  const attempt = get(authAttemptAtom) + 1;
  set(authAttemptAtom, attempt);
  set(authLoadingAtom, true);
  set(authInitializedAtom, false);
  set(authBootstrapErrorAtom, null);
  const current = () => get(authAttemptAtom) === attempt;
  try {
    const { data: { session }, error } = await withTimeout(supabase.auth.getSession(), 15000);
    if (!current()) return false;
    if (error) throw error;
    if (!session) {
      clearAuthCache();
      set(customerAtom, null);
      set(myImeisAtom, []);
      set(myOrdersAtom, []);
      return false;
    }
    const customerId = session.user?.user_metadata?.customer_id;
    if (!customerId) throw new Error("Session has no customer identity");
    const { data, error: profileError } = await withTimeout(supabase.from('customers')
      .select('id, phone, name, zalo_name, avatar_url').eq('id', customerId).maybeSingle(), 15000);
    if (!current()) return false;
    if (profileError || !data) throw profileError ?? new Error("Customer unavailable");
    const customer: Customer = { ...data, phone: data.phone ?? '', imei_ids: [] };
    set(acceptCustomerAtom, customer);
    setCachedCustomer(customer);
    void set(refreshCustomerDataAtom);
    return true;
  } catch {
    if (current()) set(authBootstrapErrorAtom, "Không khôi phục được phiên đăng nhập. Vui lòng thử lại hoặc đăng nhập bằng Zalo.");
    return false;
  } finally {
    if (current()) {
      set(authLoadingAtom, false);
      set(authInitializedAtom, true);
    }
  }
});

export const logoutAtom = atom(null, async (get, set) => {
  set(authAttemptAtom, get(authAttemptAtom) + 1);
  set(dataAttemptAtom, get(dataAttemptAtom) + 1);
  set(customerAtom, null);
  set(myImeisAtom, []);
  set(myOrdersAtom, []);
  set(customerDataLoadingAtom, false);
  set(myImeisErrorAtom, null);
  set(myOrdersErrorAtom, null);
  set(authBootstrapErrorAtom, null);
  set(authLoadingAtom, false);
  set(authInitializedAtom, true);
  clearAuthCache();
  await supabase.auth.signOut();
});

// ─── Physical cart (sản phẩm vật lý) ───────────────────────────────────────

export const cartAtom = atom<CartItem[]>([]);

export const cartCountAtom = atom((get) =>
  get(cartAtom).reduce((sum, it) => sum + it.quantity, 0)
);

export const cartSubtotalAtom = atom((get) =>
  get(cartAtom).reduce((sum, it) => sum + it.unit_price * it.quantity, 0)
);

export const addToCartAtom = atom(
  null,
  (get, set, item: Omit<CartItem, "quantity"> & { quantity?: number; stock_quantity?: number }) => {
    const list = get(cartAtom);
    const existing = list.find((i) => i.product_id === item.product_id);
    const qty = item.quantity ?? 1;
    const stock = item.stock_quantity ?? Infinity;

    // Block if out of stock
    if (stock <= 0) return;

    if (existing) {
      const newQty = existing.quantity + qty;
      // Cap at stock limit
      const cappedQty = Math.min(newQty, stock);
      set(
        cartAtom,
        list.map((i) =>
          i.product_id === item.product_id ? { ...i, quantity: cappedQty } : i
        )
      );
    } else {
      const cappedQty = Math.min(qty, stock);
      set(cartAtom, [...list, { ...item, quantity: cappedQty }]);
    }
  }
);

export const updateCartQtyAtom = atom(
  null,
  (get, set, payload: { product_id: string; quantity: number }) => {
    const list = get(cartAtom);
    if (payload.quantity <= 0) {
      set(cartAtom, list.filter((i) => i.product_id !== payload.product_id));
    } else {
      set(
        cartAtom,
        list.map((i) =>
          i.product_id === payload.product_id ? { ...i, quantity: payload.quantity } : i
        )
      );
    }
  }
);

export const removeFromCartAtom = atom(null, (get, set, productId: string) => {
  set(cartAtom, get(cartAtom).filter((i) => i.product_id !== productId));
});

export const clearCartAtom = atom(null, (_get, set) => set(cartAtom, []));

// Shipping draft cho physical checkout (UI only, default address)
export const shippingDraftAtom = atom<ShippingAddress>({
  full_name: "",
  phone_number: "",
  address: "",
  ward: "",
  district: "",
  province: "",
  commune_id: "",
  district_id: "",
  province_id: "",
  full_address: "",
});

// Gói cước đang chọn cho IMEI flow
export const selectedPackageAtom = atom<{ imeiId: string; packageId: string } | null>(null);

// Popup thông báo thanh toán thành công (hiển thị global sau khi chuyển về trang chủ)
export interface PaymentSuccessNotice {
  orderId?: number | string | null;
  kind?: "imei" | "physical";
}
export const paymentSuccessNoticeAtom = atom<PaymentSuccessNotice | null>(null);
