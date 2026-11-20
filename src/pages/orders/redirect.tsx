// Trang tiếp nhận khi user quay lại MiniApp từ trang thanh toán bên ngoài
// (đặc biệt VNPay/MoMo browser flow). Path này khớp Redirect Path đã khai báo
// trên Zalo Mini App Studio: /order-success
//
// Flow:
//  1. Parse query params do Checkout SDK gắn vào URL
//  2. Gọi Payment.checkTransaction để xác thực + lấy zmpOrderId
//  3. Tra orders.zmp_order_id → orders.id (merchant) → điều hướng
//  4. Nếu webhook chậm hơn, vẫn navigate sang success — webhook sẽ update sau

import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Payment } from "zmp-sdk/apis";

import Page from "@/components/ui/page";
import { supabase } from "@/lib/supabase";
import { pollOrderPaid } from "@/services/payment";
import { clearCartAtom, paymentSuccessNoticeAtom, selectedPackageAtom } from "@/state/atoms";

type Phase = "checking" | "pending" | "fail";

export default function OrderRedirectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setPaymentSuccess = useSetAtom(paymentSuccessNoticeAtom);
  const setSelected = useSetAtom(selectedPackageAtom);
  const clearCart = useSetAtom(clearCartAtom);
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stopPolling: (() => void) | undefined;

    const completeAndGoHome = (order?: { id: number; kind?: "imei" | "physical" } | null) => {
      if (cancelled) return;
      if (order?.kind === "physical") {
        clearCart();
      } else {
        setSelected(null);
      }
      setPaymentSuccess({
        orderId: order?.id ?? null,
        kind: order?.kind,
      });
      navigate("/", { replace: true });
    };

    (async () => {
      try {
        const result: any = await new Promise((resolve, reject) => {
          Payment.checkTransaction({
            data: location.search || window.location.search || window.location.href,
            success: resolve,
            fail: reject,
          });
        });

        if (cancelled) return;

        const zmpOrderId = result?.orderId as string | undefined;
        const code = result?.resultCode as number | undefined;

        if (code === 1 && zmpOrderId) {
          // Tra merchant orderId + kind từ DB
          const { data: order } = await supabase
            .from("orders")
            .select("id, kind")
            .eq("zmp_order_id", zmpOrderId)
            .maybeSingle();
          completeAndGoHome(order);
          return;
        }

        if (code === 0) {
          setPhase("pending");
          setMessage(result?.msg ?? "Giao dịch đang chờ xử lý.");
          if (zmpOrderId) {
            stopPolling = pollOrderPaid({ zmpOrderId }, (order) => {
              completeAndGoHome(order);
            });
          }
          return;
        }

        setPhase("fail");
        setMessage(result?.msg ?? "Thanh toán không thành công.");
      } catch (err: any) {
        if (cancelled) return;
        setPhase("fail");
        setMessage(err?.message ?? "Không xác thực được giao dịch.");
      }
    })();

    return () => {
      cancelled = true;
      stopPolling?.();
    };
  }, [navigate, location.search, setPaymentSuccess, setSelected, clearCart]);

  return (
    <Page>
      <div className="pt-section flex flex-col items-center text-center px-base">
        {phase === "checking" && (
          <>
            <div className="w-12 h-12 border-4 border-hairline border-t-brand rounded-full animate-spin mb-base" />
            <div className="text-[20px] font-semibold text-ink">Đang xác thực giao dịch...</div>
            <p className="text-[14px] text-muted mt-sm max-w-[280px]">
              Vui lòng không đóng ứng dụng trong khi hệ thống xác nhận thanh toán.
            </p>
          </>
        )}
        {phase === "pending" && (
          <>
            <div className="text-[20px] font-semibold text-ink">Giao dịch đang xử lý</div>
            <p className="text-[14px] text-muted mt-sm max-w-[280px]">{message}</p>
            <button
              onClick={() => navigate("/orders", { replace: true })}
              className="mt-lg text-brand underline"
            >
              Xem danh sách đơn hàng
            </button>
          </>
        )}
        {phase === "fail" && (
          <>
            <div className="text-[20px] font-semibold text-danger">Thanh toán thất bại</div>
            <p className="text-[14px] text-muted mt-sm max-w-[280px]">{message}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="mt-lg text-brand underline"
            >
              Về trang chủ
            </button>
          </>
        )}
      </div>
    </Page>
  );
}
