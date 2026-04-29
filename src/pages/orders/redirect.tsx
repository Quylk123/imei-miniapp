// Trang tiếp nhận khi user quay lại MiniApp từ trang thanh toán bên ngoài
// (đặc biệt VNPay/MoMo browser flow). Path này khớp Redirect Path đã khai báo
// trên Zalo Mini App Studio: /order-success
//
// Flow:
//  1. Parse query params do Checkout SDK gắn vào URL
//  2. Gọi Payment.checkTransaction để xác thực + lấy zmpOrderId
//  3. Tra orders.zmp_order_id → orders.id (merchant) → điều hướng
//  4. Nếu webhook chậm hơn, vẫn navigate sang success — webhook sẽ update sau

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Payment } from "zmp-sdk/apis";

import Page from "@/components/ui/page";
import { supabase } from "@/lib/supabase";

type Phase = "checking" | "pending" | "fail";

export default function OrderRedirectPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result: any = await new Promise((resolve, reject) => {
          Payment.checkTransaction({
            data: window.location.search || window.location.href,
            success: resolve,
            fail: reject,
          });
        });

        if (cancelled) return;

        const zmpOrderId = result?.orderId as string | undefined;
        const code = result?.resultCode as number | undefined;

        if (code === 1 && zmpOrderId) {
          // Tra merchant orderId từ DB
          const { data: order } = await supabase
            .from("orders")
            .select("id")
            .eq("zmp_order_id", zmpOrderId)
            .maybeSingle();
          if (order?.id) {
            navigate(`/orders/${order.id}/success`, { replace: true });
            return;
          }
          // Fallback: vẫn vào trang đơn hàng dù thiếu mapping
          navigate("/orders", { replace: true });
          return;
        }

        if (code === 0) {
          setPhase("pending");
          setMessage(result?.msg ?? "Giao dịch đang chờ xử lý.");
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
    };
  }, [navigate]);

  return (
    <Page>
      <div className="pt-section flex flex-col items-center text-center px-base">
        {phase === "checking" && (
          <>
            <div className="w-12 h-12 border-4 border-hairline border-t-rausch rounded-full animate-spin mb-base" />
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
              className="mt-lg text-rausch underline"
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
              className="mt-lg text-rausch underline"
            >
              Về trang chủ
            </button>
          </>
        )}
      </div>
    </Page>
  );
}
