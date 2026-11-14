// ============================================
// Zalo Checkout SDK integration
// ============================================
// Flow tổng:
//   1. Client gọi `create-imei-order` hoặc `create-physical-order`
//      → server tạo order trong DB, trả về { order_id, sdk_payload, mac }
//   2. Client gọi Payment.createOrder({ ...sdk_payload, mac })
//      → SDK mở UI thanh toán Zalo.
//   3. Client lưu mapping zmp_order_id qua `confirm-payment-init` (best-effort).
//   4. Khi user hoàn tất → `events.on(PaymentDone)` bắn data.
//      Client dùng data.resultCode trực tiếp (nguồn sự thật SDK),
//      checkTransaction là best-effort để lấy thêm transId.
//   5. Nguồn sự thật cuối: `callback-order` (webhook server-to-server)
//      cập nhật DB và kích hoạt IMEI nếu cần.

import { Payment, events, EventName } from "zmp-sdk/apis";

import { supabase } from "@/lib/supabase";
import type { ShippingAddress } from "@/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── Edge Function caller ──────────────────────────────────────────────────
async function callEdge<T>(slug: string, payload: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error ?? `Edge ${slug} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Server response types ─────────────────────────────────────────────────
export interface CreateOrderResponse {
  /** true cho gói trial (đã auto-activate), không cần mở SDK */
  skip_payment?: boolean;
  order_id: number;
  order: any;
  sdk_payload?: {
    amount: number;
    desc: string;
    item: { id: string; amount: number }[];
    extradata: string;
  };
  mac?: string;
}

// ─── Public helpers ────────────────────────────────────────────────────────

export interface StartImeiPaymentInput {
  customer_id: string;
  imei_id: string;
  package_id: string;
  onOrderCreated?: (orderId: number) => void;
}

export interface StartPhysicalPaymentInput {
  customer_id: string;
  items: { product_id: string; quantity: number }[];
  shipping_address: ShippingAddress;
  shipping_fee?: number;
  notes?: string;
  onOrderCreated?: (orderId: number) => void;
}

/**
 * Tạo IMEI order. Với gói trial → trả `{ order_id, zmpOrderId: undefined }`.
 * Với gói trả phí → mở Zalo Pay SDK → trả `{ order_id, zmpOrderId }`.
 */
export async function startImeiPayment(input: StartImeiPaymentInput) {
  const { onOrderCreated, ...payload } = input;
  const created = await callEdge<CreateOrderResponse>("create-imei-order", payload);
  return runSdkOrSkip(created, onOrderCreated);
}

/**
 * Tạo Physical order rồi mở Zalo Pay SDK.
 * Luôn trả `{ order_id, zmpOrderId }` (physical không có skip_payment).
 */
export async function startPhysicalPayment(input: StartPhysicalPaymentInput) {
  const { onOrderCreated, ...payload } = input;
  const created = await callEdge<CreateOrderResponse>("create-physical-order", payload);
  return runSdkOrSkip(created, onOrderCreated);
}

async function runSdkOrSkip(
  created: CreateOrderResponse,
  onOrderCreated?: (orderId: number) => void,
) {
  if (created.skip_payment) {
    return {
      order_id: created.order_id,
      zmpOrderId: undefined as string | undefined,
    };
  }

  const { sdk_payload, mac, order_id } = created;
  if (!sdk_payload || !mac) {
    throw new Error("Server didn't return sdk_payload/mac");
  }

  onOrderCreated?.(order_id);

  console.log("[payment] createOrder payload:", {
    amount: sdk_payload.amount,
    desc: sdk_payload.desc,
    item: sdk_payload.item,
    extradata: sdk_payload.extradata,
    mac,
  });

  const zmpOrderId = await new Promise<string>((resolve, reject) => {
    Payment.createOrder({
      desc: sdk_payload.desc,
      item: sdk_payload.item,
      amount: sdk_payload.amount,
      extradata: sdk_payload.extradata,
      mac,
      success: (data: any) => {
        console.log("[payment] createOrder success:", data);
        resolve(String(data?.orderId ?? ""));
      },
      fail: (err: any) => {
        console.error("[payment] createOrder fail:", err);
        reject(new Error(err?.message ?? "Payment.createOrder failed"));
      },
    });
  });

  // Lưu zmp_order_id vào orders (best-effort, không chặn flow)
  if (zmpOrderId) {
    callEdge("confirm-payment-init", { order_id, zmp_order_id: zmpOrderId }).catch(
      (err) => console.warn("[payment] confirm-payment-init failed:", err),
    );
  }

  return { order_id, zmpOrderId };
}

// ─── PaymentDone / PaymentClose listener ──────────────────────────────────

export type PaymentResult =
  | { resultCode: 1; orderId: string; transId?: string; message?: string }
  | { resultCode: 0; orderId?: string; transId?: string; message?: string }
  | { resultCode: -1; orderId?: string; transId?: string; message?: string }
  | { resultCode: -2; orderId?: string; transId?: string; message?: string }
  | { resultCode: number; orderId?: string; transId?: string; message?: string };

/**
 * Cố gắng gọi checkTransaction để lấy thêm transId.
 * Trả về null nếu bị rate limit (-1409) hoặc lỗi khác.
 */
async function tryCheckTransaction(data: any): Promise<any | null> {
  return new Promise((resolve) => {
    Payment.checkTransaction({
      data,
      success: (result: any) => resolve(result),
      fail: (err: any) => {
        console.warn("[payment] checkTransaction failed (non-fatal):", err?.code, err?.message);
        resolve(null);
      },
    });
  });
}

/**
 * Đăng ký listener PaymentDone + PaymentClose.
 * Trả về cleanup function để dùng trong useEffect.
 *
 * Chiến lược an toàn:
 * - Deduplicate theo zmpOrderId (handledOrders) thay vì khoá vĩnh viễn toàn trang,
 *   để nếu user đóng bảng thanh toán (-2) và bấm Đặt hàng lại thì lần sau vẫn nhận event.
 * - Khi user đóng bottomSheet mà chưa chọn kênh thanh toán, zmp-sdk bắn PaymentDone
 *   chỉ có `{ orderId }` (không có transId/resultCode) và checkTransaction báo
 *   Transaction not found → trả về resultCode = -2 (huỷ/đóng) thay vì -1.
 */
export function listenPaymentEvents(onResult: (result: PaymentResult) => void) {
  const handledOrders = new Set<string>();
  const getOrderKey = (data: any) => String(data?.orderId ?? data?.zmpOrderId ?? "");

  const handleDone = async (data: any) => {
    const orderKey = getOrderKey(data);
    if (orderKey && handledOrders.has(orderKey)) return;
    if (orderKey) handledOrders.add(orderKey);

    const hasExplicitCode =
      data?.resultCode !== undefined || data?.result_code !== undefined;
    const rawCode = hasExplicitCode
      ? Number(data?.resultCode ?? data?.result_code)
      : data?.transId
        ? -1
        : -2;
    console.log("[payment] PaymentDone raw resultCode:", rawCode, data);

    const checked = await tryCheckTransaction(data);

    if (checked) {
      onResult({
        resultCode: checked.resultCode ?? rawCode,
        orderId: checked.orderId ?? data?.orderId,
        transId: checked.transId,
        message: checked.msg,
      });
    } else {
      console.warn("[payment] Falling back to raw event resultCode:", rawCode);
      onResult({
        resultCode: rawCode,
        orderId: data?.orderId,
        transId: data?.transId,
        message: data?.msg ?? (rawCode === 1 ? "Thanh toán thành công" : undefined),
      });
    }
  };

  const handleClose = (data: any) => {
    const orderKey = getOrderKey(data);
    if (orderKey && handledOrders.has(orderKey)) {
      console.log("[payment] PaymentClose ignored — already handled by PaymentDone:", orderKey);
      return;
    }
    if (orderKey) handledOrders.add(orderKey);

    const rawCode = Number(data?.resultCode ?? -2);
    console.log("[payment] PaymentClose raw resultCode:", rawCode, data);

    if (rawCode === 0) {
      // Đang xử lý — gọi checkTransaction một lần
      Payment.checkTransaction({
        data: { zmpOrderId: data?.zmpOrderId },
        success: (rs: any) =>
          onResult({
            resultCode: rs?.resultCode ?? 0,
            orderId: rs?.orderId,
            transId: rs?.transId,
            message: rs?.msg,
          }),
        fail: () => onResult({ resultCode: 0, message: "Giao dịch đang xử lý" }),
      });
    } else {
      onResult({
        resultCode: rawCode,
        orderId: data?.orderId,
        transId: data?.transId,
        message: data?.msg,
      });
    }
  };

  events.on(EventName.PaymentDone, handleDone);
  events.on(EventName.PaymentClose, handleClose);

  return () => {
    events.off(EventName.PaymentDone, handleDone);
    events.off(EventName.PaymentClose, handleClose);
  };
}
