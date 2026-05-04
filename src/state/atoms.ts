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
import { supabase } from "@/lib/supabase";
import {
  clearAuthCache,
  fullRegistrationFlow,
  getCachedCustomer,
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

// Auth error message (shown in UI)
export const authErrorAtom = atom<string | null>(null);

// ─── Load customer-specific data ───────────────────────────────────────────
const loadCustomerDataAtom = atom(
  null,
  async (_get, set, customer: Customer) => {
    try {
      const [imeis, orders] = await Promise.all([
        fetchMyIMEIs(customer.id),
        fetchMyOrders(customer.id),
      ]);
      set(myImeisAtom, imeis);
      set(myOrdersAtom, orders);
    } catch (err) {
      console.error("Failed to load customer data:", err);
    }
  }
);

/**
 * Refresh cả myImeisAtom và myOrdersAtom cho customer hiện tại.
 * Gọi sau khi thanh toán thành công, hoặc khi user vào trang danh sách.
 */
export const refreshCustomerDataAtom = atom(null, async (get, set) => {
  const customer = get(customerAtom);
  if (!customer) return;
  try {
    const [imeis, orders] = await Promise.all([
      fetchMyIMEIs(customer.id),
      fetchMyOrders(customer.id),
    ]);
    set(myImeisAtom, imeis);
    set(myOrdersAtom, orders);
  } catch (err) {
    console.error("[refreshCustomerData] Failed:", err);
  }
});


// ─── Register Member — full Zalo SDK flow ──────────────────────────────────
export const registerMemberAtom = atom(null, async (_get, set) => {
  set(authLoadingAtom, true);
  set(authErrorAtom, null);
  try {
    // fullRegistrationFlow handles: permissions → decode phone → Edge Function → setSession
    const result = await fullRegistrationFlow();
    set(customerAtom, result.customer);

    // Load customer-specific data in background
    const [imeis, orders] = await Promise.all([
      fetchMyIMEIs(result.customer.id),
      fetchMyOrders(result.customer.id),
    ]);
    set(myImeisAtom, imeis);
    set(myOrdersAtom, orders);

    return result;
  } catch (err: any) {
    console.error("Registration failed:", err);
    const message =
      err?.message?.includes("user reject") || err?.code === -201
        ? "Bạn đã từ chối cấp quyền. Vui lòng thử lại."
        : "Đăng ký thất bại. Vui lòng thử lại sau.";
    set(authErrorAtom, message);
    throw err;
  } finally {
    set(authLoadingAtom, false);
  }
});

// ─── Auto-login from Supabase session ──────────────────────────────────────
export const autoLoginAtom = atom(null, async (_get, set) => {
  set(authLoadingAtom, true);
  try {
    // Check for existing Supabase Auth session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Fallback: try cached customer (for offline/quick display)
      const cachedCustomer = getCachedCustomer();
      if (cachedCustomer) {
        set(customerAtom, cachedCustomer);
      }
      return false;
    }

    // Session exists → get customer from DB using auth user metadata
    const userId = session.user?.user_metadata?.customer_id;
    const cachedCustomer = getCachedCustomer();

    if (userId) {
      // Fetch fresh customer data from DB
      const { data: freshCustomer } = await supabase
        .from('customers')
        .select('id, phone, name, zalo_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (freshCustomer) {
        const customer: Customer = {
          id: freshCustomer.id,
          phone: freshCustomer.phone ?? '',
          name: freshCustomer.name,
          zalo_name: freshCustomer.zalo_name,
          avatar_url: freshCustomer.avatar_url,
          imei_ids: [],
        };
        set(customerAtom, customer);
        setCachedCustomer(customer);

        // Load customer-specific data
        const [imeis, orders] = await Promise.all([
          fetchMyIMEIs(customer.id),
          fetchMyOrders(customer.id),
        ]);
        set(myImeisAtom, imeis);
        set(myOrdersAtom, orders);

        return true;
      }
    }

    // Fallback to cached customer
    if (cachedCustomer) {
      set(customerAtom, cachedCustomer);
      return true;
    }

    return false;
  } catch (err) {
    console.error("Auto-login failed:", err);
    clearAuthCache();
    return false;
  } finally {
    set(authLoadingAtom, false);
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────
export const logoutAtom = atom(null, async (_get, set) => {
  set(customerAtom, null);
  set(myImeisAtom, []);
  set(myOrdersAtom, []);
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
  recipient_name: "",
  recipient_phone: "",
  street: "",
  ward: "",
  district: "",
  province: "",
});

// Gói cước đang chọn cho IMEI flow
export const selectedPackageAtom = atom<{ imeiId: string; packageId: string } | null>(null);
