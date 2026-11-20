import { TickCircle } from "iconsax-react";
import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import { paymentSuccessNoticeAtom, refreshCustomerDataAtom } from "@/state/atoms";

export default function PaymentSuccessModal() {
  const [notice, setNotice] = useAtom(paymentSuccessNoticeAtom);
  const refresh = useSetAtom(refreshCustomerDataAtom);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!notice) return;
    refresh();
    const timer = setTimeout(() => {
      refresh();
    }, 3000);
    return () => clearTimeout(timer);
  }, [notice, refresh]);

  useEffect(() => {
    if (!notice) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [notice]);

  if (!notice) return null;

  const isImei = notice.kind === "imei";

  const handleGoHome = () => {
    setNotice(null);
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  };

  const handleViewOrder = () => {
    const id = notice.orderId;
    setNotice(null);
    if (id) {
      navigate(`/orders/${id}`, { replace: true });
    } else {
      navigate("/orders", { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-base">
      <div
        aria-hidden
        onClick={handleGoHome}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[340px] rounded-lg bg-canvas p-lg text-center shadow-card"
      >
        <div className="mx-auto mb-md flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <TickCircle size={40} variant="Bold" className="text-brand" />
        </div>

        <h2 className="text-[20px] leading-[1.25] font-bold text-ink">
          {isImei ? "Thanh toán & kích hoạt thành công" : "Thanh toán thành công"}
        </h2>

        <p className="mt-sm text-[14px] leading-[1.5] text-muted">
          {notice.orderId ? (
            <>
              Đơn hàng <span className="font-semibold text-ink">#{notice.orderId}</span>{" "}
              đã được thanh toán thành công.
            </>
          ) : (
            "Giao dịch của bạn đã được xác nhận thành công."
          )}
        </p>

        <div className="mt-lg space-y-sm">
          <Button fullWidth onClick={handleGoHome}>
            Về trang chủ
          </Button>
          {notice.orderId && (
            <button
              type="button"
              onClick={handleViewOrder}
              className="w-full py-xs text-[14px] font-medium text-muted active:text-ink"
            >
              Xem chi tiết đơn hàng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
