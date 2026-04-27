import { atom } from "jotai";
import type { ReactNode } from "react";

import { mockCustomer, myImeis, myOrders } from "@/mocks";
import type {
  CartItem,
  Customer,
  IMEI,
  Order,
  PaymentMethod,
  ShippingAddress,
} from "@/types";

// Per-page header override (title/right slot dynamic)
export interface PageHeaderOverride {
  title?: string;
  right?: ReactNode;
}
export const pageHeaderOverrideAtom = atom<PageHeaderOverride>({});

// Auth — null = chưa đăng ký
export const customerAtom = atom<Customer | null>(null);

// IMEI list của customer hiện tại
export const myImeisAtom = atom<IMEI[]>((get) =>
  get(customerAtom) ? myImeis : []
);

// Orders của customer hiện tại (cả physical + imei)
export const myOrdersAtom = atom<Order[]>((get) =>
  get(customerAtom) ? myOrders : []
);

export const linkZaloAtom = atom(null, (_get, set) => {
  set(customerAtom, mockCustomer);
});

export const unlinkZaloAtom = atom(null, (_get, set) => {
  set(customerAtom, null);
});

// ─── Physical cart (sản phẩm vật lý) ───────────────────────────────────────────

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

// Shipping draft cho physical checkout (UI only, mock địa chỉ default)
export const shippingDraftAtom = atom<ShippingAddress>({
  recipient_name: "Dương Châu",
  recipient_phone: "0901234567",
  street: "12 Lê Lợi",
  ward: "Phường Bến Nghé",
  district: "Quận 1",
  province: "TP. HCM",
});

// Payment method dùng chung cho cả physical & IMEI checkout
export const paymentMethodAtom = atom<PaymentMethod>("zalopay");

// Gói cước đang chọn cho IMEI flow
export const selectedPackageAtom = atom<{ imeiId: string; packageId: string } | null>(null);
