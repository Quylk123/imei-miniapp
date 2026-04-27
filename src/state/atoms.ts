import { atom } from "jotai";
import type { ReactNode } from "react";

import {
  fetchCategories,
  fetchCustomerByZaloId,
  fetchMyIMEIs,
  fetchMyOrders,
  fetchPackages,
  fetchProducts,
} from "@/data/supabase";
import type {
  CartItem,
  Category,
  Customer,
  IMEI,
  Order,
  Package,
  PaymentMethod,
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
export const catalogLoadingAtom = atom(true);

// Load catalog data from Supabase
export const loadCatalogAtom = atom(null, async (_get, set) => {
  set(catalogLoadingAtom, true);
  try {
    const [cats, prods, pkgs] = await Promise.all([
      fetchCategories(),
      fetchProducts(),
      fetchPackages(),
    ]);
    set(categoriesAtom, cats);
    set(productsAtom, prods);
    set(packagesAtom, pkgs);
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

// ─── Link Zalo — fetch customer from DB ────────────────────────────────────
// Mock Zalo ID for development — will be replaced by Zalo SDK auth
const MOCK_ZALO_ID = "zalo_mock_001";

export const linkZaloAtom = atom(null, async (_get, set) => {
  set(authLoadingAtom, true);
  try {
    const customer = await fetchCustomerByZaloId(MOCK_ZALO_ID);
    if (customer) {
      set(customerAtom, customer);
      // Load customer-specific data
      const [imeis, orders] = await Promise.all([
        fetchMyIMEIs(customer.id),
        fetchMyOrders(customer.id),
      ]);
      set(myImeisAtom, imeis);
      set(myOrdersAtom, orders);
    } else {
      console.warn("No customer found for Zalo ID:", MOCK_ZALO_ID);
    }
  } catch (err) {
    console.error("Failed to link Zalo:", err);
  } finally {
    set(authLoadingAtom, false);
  }
});

export const unlinkZaloAtom = atom(null, (_get, set) => {
  set(customerAtom, null);
  set(myImeisAtom, []);
  set(myOrdersAtom, []);
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
  (get, set, item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    const list = get(cartAtom);
    const existing = list.find((i) => i.product_id === item.product_id);
    const qty = item.quantity ?? 1;
    if (existing) {
      set(
        cartAtom,
        list.map((i) =>
          i.product_id === item.product_id ? { ...i, quantity: i.quantity + qty } : i
        )
      );
    } else {
      set(cartAtom, [...list, { ...item, quantity: qty }]);
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

// Payment method dùng chung cho cả physical & IMEI checkout
export const paymentMethodAtom = atom<PaymentMethod>("zalopay");

// Gói cước đang chọn cho IMEI flow
export const selectedPackageAtom = atom<{ imeiId: string; packageId: string } | null>(null);
