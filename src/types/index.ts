// Mirrored (subset) from imei-admin/src/types — only what the mini-app UI needs.

export type IMEIStatus =
  | "new"
  | "sold"
  | "activated"
  | "pending_activation"
  | "locked"
  | "recalled";

export interface IMEI {
  id: string;
  imei_number: string;
  product_id?: string;
  customer_id?: string;
  status: IMEIStatus;
  package_ids: string[];
  active_package_id?: string;
  activation_date?: string;
  expiry_date?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  gallery?: string[];
  specs: Record<string, string>;
  default_package_id?: string;
  price: number;
  rating?: number;
  reviews_count?: number;
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
  imei_ids: string[];
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

export type PaymentMethod = "vnpay" | "momo" | "zalopay" | "cod" | "bank_transfer";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export interface OrderItem {
  id: string;
  product_id?: string;
  imei_id?: string;
  package_id?: string;
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
  id: string;
  kind: OrderKind;
  customer_id: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  shipping?: ShippingAddress;
  created_at: string;
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
