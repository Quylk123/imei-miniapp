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
  // Product chosen by customer when linking IMEI (NULL for legacy IMEIs).
  product_id?: string;
  product_name?: string;
  product_image?: string;
  notes?: string;
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
  price: number;
  rating?: number;
  reviews_count?: number;
  /** Editorial flag — admin set true để đẩy lên "Sản phẩm nổi bật" trang chủ. */
  is_featured?: boolean;
  /** Tồn kho từ Pancake. 0 = hết hàng, không cho đặt. */
  stock_quantity: number;
}

export type PackageType = "trial" | "renewal" | "lifetime" | "fixed_expiry";

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  duration_days: number;
  /** Mốc hết hạn cố định (ISO timestamptz). Chỉ có giá trị khi type='fixed_expiry'. */
  fixed_expiry_date?: string | null;
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
  full_name: string;
  phone_number: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  commune_id?: string;
  district_id?: string;
  province_id?: string;
  full_address?: string;
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

// ── Affiliate ────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  created_at: string;
  /** Joined from customers table */
  referee_name?: string;
  referee_avatar?: string;
  /** Whether referee has at least one completed order */
  has_ordered?: boolean;
}

export interface AffiliateCommission {
  id: string;
  order_id: number;
  product_name: string;
  product_thumbnail?: string;
  referee_name: string;
  commission_rate: number;
  item_subtotal: number;
  total_commission: number;
  status: "pending" | "approved" | "cancelled";
  created_at: string;
  approved_at?: string;
}

export interface AffiliateStats {
  total_approved: number;
  total_pending: number;
  total_withdrawn: number;
  balance: number;
  total_referees: number;
  referrer?: { name: string; avatar_url?: string };
}

export const IMEI_BADGE: Record<IMEIStatus, StatusBadgeMeta> = {
  new: { label: "Mới", textColor: "#3b4c8a", bgColor: "rgba(110,123,255,0.15)" },
  sold: { label: "Đã bán", textColor: "#7a4f00", bgColor: "rgba(245,166,35,0.15)" },
  activated: { label: "Đang dùng", textColor: "#0d7a4a", bgColor: "rgba(62,207,142,0.18)" },
  pending_activation: { label: "Chờ kích hoạt", textColor: "#5a3aa6", bgColor: "rgba(167,139,250,0.18)" },
  locked: { label: "Hết hạn", textColor: "#8e2020", bgColor: "rgba(229,72,77,0.15)" },
  recalled: { label: "Đã huỷ", textColor: "#555555", bgColor: "rgba(137,137,137,0.18)" },
};
