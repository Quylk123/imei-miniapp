// Mini-app phục vụ 2 luồng e-commerce TÁCH BIỆT:
//   1. Bán sản phẩm vật lý       → Order kind="physical" (có ship/COD)
//   2. Quản lý IMEI + gói cước   → Order kind="imei"     (Zalo SDK pay only)

export type IMEIStatus =
  | "new"
  | "sold"
  | "activated"
  | "pending_activation"
  | "locked"
  | "recalled";

export interface PackageHistoryEntry {
  package_id: string;
  started_at: string;
  ended_at?: string;
}

export interface IMEI {
  id: string;
  imei_number: string;
  customer_id?: string;
  status: IMEIStatus;
  package_ids: string[];
  active_package_id?: string;
  activation_date?: string;
  expiry_date?: string;
  linked_at?: string;
  created_at: string;
  package_history?: PackageHistoryEntry[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  image_url?: string;
}

export interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
}

/** Sản phẩm vật lý đang bán trong mini-app (catalog). */
export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  gallery?: string[];
  specs: Record<string, string>;
  price: number;
  rating?: number;
  reviews_count?: number;
  /** Editorial flag — admin set true để đẩy lên "Sản phẩm nổi bật" trang chủ. */
  is_featured?: boolean;
}

export type PackageType = "trial" | "renewal" | "lifetime";

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  duration_days: number;
  price: number;
  description: string;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  zalo_name?: string;
  avatar_url?: string;
  imei_ids: string[];
}

/** Profile data returned from Zalo SDK getUserInfo() */
export interface ZaloProfile {
  id: string;
  name: string;
  avatar: string;
}

/** Response from the zalo-auth Edge Function */
export interface AuthResponse {
  customer: Customer;
  session: {
    access_token: string;
    refresh_token: string;
  };
  is_new_customer: boolean;
}

export type OrderKind = "physical" | "imei";

export type PhysicalOrderStatus =
  | "pending"
  | "confirmed"
  | "packing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "returned";

export type IMEIOrderStatus =
  | "pending"
  | "paid"
  | "activated"
  | "failed"
  | "refunded";

export type OrderStatus = PhysicalOrderStatus | IMEIOrderStatus;

export type PaymentMethod = "vnpay" | "momo" | "zalopay" | "cod" | "bank_transfer" | "checkout_sdk";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export interface OrderItem {
  id: string;
  product_id?: string; // physical
  imei_id?: string;    // imei
  package_id?: string; // imei
  name: string;
  thumbnail?: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingAddress {
  recipient_name: string;
  recipient_phone: string;
  street: string;
  ward: string;
  district: string;
  province: string;
  notes?: string;
}

export interface Order {
  id: number;
  kind: OrderKind;
  customer_id: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  status: OrderStatus;
  shipping?: ShippingAddress; // physical only
  created_at: string;
  paid_at: string | null;
  updated_at: string | null;
}

export interface CartItem {
  product_id: string;
  name: string;
  thumbnail: string;
  unit_price: number;
  quantity: number;
}

export interface StatusBadgeMeta {
  label: string;
  textColor: string;
  bgColor: string;
}

export const IMEI_BADGE: Record<IMEIStatus, StatusBadgeMeta> = {
  new: { label: "Mới", textColor: "#3b4c8a", bgColor: "rgba(110,123,255,0.15)" },
  sold: { label: "Đã bán", textColor: "#7a4f00", bgColor: "rgba(245,166,35,0.15)" },
  activated: { label: "Đang dùng", textColor: "#0d7a4a", bgColor: "rgba(62,207,142,0.18)" },
  pending_activation: { label: "Chờ kích hoạt", textColor: "#5a3aa6", bgColor: "rgba(167,139,250,0.18)" },
  locked: { label: "Hết hạn", textColor: "#8e2020", bgColor: "rgba(229,72,77,0.15)" },
  recalled: { label: "Thu hồi", textColor: "#555555", bgColor: "rgba(137,137,137,0.18)" },
};
