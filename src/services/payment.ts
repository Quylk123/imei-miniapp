// ============================================
// Zalo Checkout SDK integration
// ============================================
// Flow tổng:
//   1. Client gọi Edge Function `create-payment` → server tạo order trong DB
//      và trả về { order_id, sdk_payload, mac } đã ký HMAC bằng PrivateKey.
//   2. Client gọi Payment.createOrder({ ...sdk_payload, mac }) → SDK mở UI
//      thanh toán Zalo. Trả về { orderId: zmpOrderId } khi đơn được nhận.
//   3. Client lưu mapping zmp_order_id qua `confirm-payment-init` (best-effort).
//   4. Khi user hoàn tất → `events.on(PaymentDone)` bắn data → client gọi
//      Payment.checkTransaction để hiển thị kết quả tạm thời.
//   5. Nguồn sự thật: webhook server-to-server `payment-webhook` cập nhật
//      orders.payment_status = 'paid' và kích hoạt IMEI nếu cần.

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
export interface CreatePaymentResponse {
  skip_payment: boolean; // true cho gói trial (đã auto-activate)
  order_id: number;
  order: any;
  sdk_payload?: {
    amount: number;
    desc: string;
    item: { id: string; amount: number }[];
    extradata: string; // JSON String
  };
  mac?: string;
}

// ─── Public helpers ────────────────────────────────────────────────────────

export interface StartImeiPaymentInput {
  customer_id: string;
  imei_id: string;
  package_id: string;
}

export interface StartPhysicalPaymentInput {
  customer_id: string;
  items: { product_id: string; quantity: number }[];
  shipping_address: ShippingAddress;
  shipping_fee?: number;
  notes?: string;
}

/**
 * Tạo IMEI order + (nếu trả phí) mở UI thanh toán Zalo.
 * Trả về `{ order_id, zmpOrderId? }`. Với gói trial, `zmpOrderId` = undefined,
 * và caller chỉ cần navigate sang trang success.
 */
export async function startImeiPayment(input: StartImeiPaymentInput) {
  const created = await callEdge<CreatePaymentResponse>("create-payment", {
    kind: "imei",
    ...input,
  });
  return runSdkOrSkip(created);
}

export async function startPhysicalPayment(input: StartPhysicalPaymentInput) {
  const created = await callEdge<CreatePaymentResponse>("create-payment", {
    kind: "physical",
    ...input,
  });
  return runSdkOrSkip(created);
}

async function runSdkOrSkip(created: CreatePaymentResponse) {
  if (created.skip_payment) {
    return {
      order_id: created.order_id,
      zmpOrderId: undefined as string | undefined,
    } as { order_id: number; zmpOrderId: string | undefined };
  }
  const { sdk_payload, mac, order_id } = created;
  if (!sdk_payload || !mac) {
    throw new Error("Server didn't return sdk_payload/mac");
  }

  // DEBUG: log payload trước khi gọi SDK
  console.log("[payment] createOrder payload:", {
    amount: sdk_payload.amount,
    desc: sdk_payload.desc,
    item: sdk_payload.item,
    extradata: sdk_payload.extradata,
    mac,
    debug: (created as any).debug,
  });

  const zmpOrderId = await new Promise<string>((resolve, reject) => {
    Payment.createOrder({
      desc: sdk_payload.desc,
      item: sdk_payload.item,
      amount: sdk_payload.amount,
      extradata: sdk_payload.extradata,
      // Không truyền `method` → SDK tự render trang chọn phương thức cho user
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

  // Mapping zmp_order_id → orders.id (best-effort, không chặn flow)
  if (zmpOrderId) {
    callEdge("confirm-payment-init", { order_id, zmp_order_id: zmpOrderId }).catch(
      (err) => console.warn("[payment] confirm-payment-init failed:", err),
    );
  }

  return { order_id, zmpOrderId };
}

// ─── PaymentDone / PaymentClose listener hook ──────────────────────────────

export type PaymentResult =
  | { resultCode: 1; orderId: string; transId?: string; message?: string }
  | { resultCode: 0; orderId?: string; message?: string }
  | { resultCode: -1; orderId?: string; message?: string }
  | { resultCode: -2; message?: string }
  | { resultCode: number; message?: string };

/**
 * Đăng ký listener PaymentDone + PaymentClose. Gọi handler với resultCode đã
 * normalize. Trả về cleanup function để dùng trong useEffect.
 *
 * `onResult` được gọi sau khi đã `Payment.checkTransaction` để có dữ liệu
 * transaction đầy đủ.
 */
export function listenPaymentEvents(onResult: (result: PaymentResult) => void) {
  const handleDone = async (data: any) => {
    try {
      const result: any = await new Promise((resolve, reject) => {
        Payment.checkTransaction({
          data,
          success: resolve,
          fail: reject,
        });
      });
      onResult({
        resultCode: result?.resultCode,
        orderId: result?.orderId,
        transId: result?.transId,
        message: result?.msg,
      });
    } catch (err: any) {
      console.error("[payment] checkTransaction failed:", err);
      onResult({ resultCode: -1, message: err?.message ?? "checkTransaction failed" });
    }
  };

  const handleClose = (data: any) => {
    if (data?.resultCode === 0) {
      // Vẫn đang xử lý — verify lại
      Payment.checkTransaction({
        data: { zmpOrderId: data?.zmpOrderId },
        success: (rs: any) =>
          onResult({
            resultCode: rs?.resultCode,
            orderId: rs?.orderId,
            transId: rs?.transId,
            message: rs?.msg,
          }),
        fail: () => onResult({ resultCode: 0, message: "Pending" }),
      });
    } else {
      onResult({
        resultCode: data?.resultCode,
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
