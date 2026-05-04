import { TickCircle } from "iconsax-react";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { refreshCustomerDataAtom } from "@/state/atoms";

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const refresh = useSetAtom(refreshCustomerDataAtom);
  const didRefresh = useRef(false);

  useEffect(() => {
    if (didRefresh.current) return;
    didRefresh.current = true;

    // Refresh ngay để có đơn hàng mới trong danh sách
    refresh();

    // Refresh lại sau 3 giây để bắt kịp trạng thái từ webhook
    // (webhook callback-order cập nhật IMEI/order sau khi thanh toán)
    const timer = setTimeout(() => {
      refresh();
    }, 3000);

    return () => clearTimeout(timer);
  }, [refresh]);

  return (
    <Page>
      <div className="pt-section flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-rausch/10 flex items-center justify-center mb-base">
          <TickCircle size={48} variant="Bold" className="text-rausch" />
        </div>
        <div className="text-[28px] leading-[1.18] font-bold text-ink">
          Đặt hàng thành công
        </div>
        <p className="text-[16px] leading-[1.5] text-muted mt-sm max-w-[300px]">
          Đơn hàng <span className="text-ink font-medium">#{orderId}</span> đã được ghi
          nhận. Bạn có thể theo dõi trạng thái trong "Đơn hàng".
        </p>

        <div className="mt-lg w-full max-w-[320px] space-y-sm">
          <Button fullWidth onClick={() => navigate("/orders")}>
            Xem đơn hàng của tôi
          </Button>
          <Button fullWidth variant="ghost" onClick={() => navigate("/")}>
            Tiếp tục mua sắm
          </Button>
        </div>
      </div>
    </Page>
  );
}
