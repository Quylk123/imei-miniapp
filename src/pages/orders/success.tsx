import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  return (
    <Page>
      <div className="pt-section flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-rausch/10 flex items-center justify-center mb-base">
          <Icon name="check-circle" size={48} className="text-rausch" />
        </div>
        <div className="text-[28px] leading-[1.18] font-bold text-ink">
          Đặt hàng thành công
        </div>
        <p className="text-[16px] leading-[1.5] text-muted mt-sm max-w-[300px]">
          Cảm ơn bạn! Đơn hàng <span className="text-ink font-medium">#{orderId}</span>{" "}
          đã được ghi nhận. Chúng tôi sẽ liên hệ xác nhận trong vài phút.
        </p>

        <div className="mt-lg w-full max-w-[320px] rounded-md border border-hairline p-base text-left space-y-sm text-[14px] leading-[1.43]">
          <Step icon="check" label="Đã nhận đơn" done />
          <Step icon="package" label="Đang xử lý & đóng gói" />
          <Step icon="phone" label="Giao hàng" />
        </div>

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

function Step({
  icon,
  label,
  done,
}: {
  icon: "check" | "package" | "phone";
  label: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-sm">
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? "bg-rausch text-white" : "bg-surface-strong text-muted"}`}
      >
        <Icon name={icon} size={14} />
      </span>
      <span className={done ? "text-ink font-medium" : "text-muted"}>{label}</span>
    </div>
  );
}
