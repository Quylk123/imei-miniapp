import { atom } from "jotai";

import { mockCustomer, myImeis, myOrders } from "@/mocks";
import type {
  CartItem,
  Customer,
  IMEI,
  Order,
  PaymentMethod,
  ShippingAddress,
} from "@/types";

// Auth — null = chưa đăng ký. Set khi user "đăng ký thành viên" qua trang /auth (mock).
export const customerAtom = atom<Customer | null>(null);

// Cart items (anonymous OK — chỉ chặn khi checkout)
export const cartAtom = atom<CartItem[]>([]);

export const cartCountAtom = atom((get) =>
  get(cartAtom).reduce((sum, it) => sum + it.quantity, 0)
);

export const cartSubtotalAtom = atom((get) =>
  get(cartAtom).reduce((sum, it) => sum + it.unit_price * it.quantity, 0)
);

// IMEI list of current customer (mock — only return when authed)
export const myImeisAtom = atom<IMEI[]>((get) =>
  get(customerAtom) ? myImeis : []
);

// Orders of current customer
export const myOrdersAtom = atom<Order[]>((get) =>
  get(customerAtom) ? myOrders : []
);

// Helper: simulate Zalo link
export const linkZaloAtom = atom(null, (_get, set) => {
  set(customerAtom, mockCustomer);
});

export const unlinkZaloAtom = atom(null, (_get, set) => {
  set(customerAtom, null);
});

// Cart mutations
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

// Checkout draft (UI only — not persisted)
export const shippingDraftAtom = atom<ShippingAddress>({
  recipient_name: "Dương Châu",
  recipient_phone: "0901234567",
  street: "12 Lê Lợi",
  ward: "Phường Bến Nghé",
  district: "Quận 1",
  province: "TP. HCM",
});

export const paymentMethodAtom = atom<PaymentMethod>("zalopay");

// Package selection draft (per IMEI flow)
export const selectedPackageAtom = atom<{ imeiId: string; packageId: string } | null>(null);
