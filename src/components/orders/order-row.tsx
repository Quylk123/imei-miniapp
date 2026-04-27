import { useNavigate } from "react-router-dom";

import Icon from "@/components/ui/icon";
import { formatVND } from "@/lib/format";
import { products } from "@/mocks";
import type { Order, OrderStatus } from "@/types";

interface Props {
  order: Order;
}

const statusMeta: Record<OrderStatus, { label: string; tone: "ink" | "muted" | "success" | "danger" }> = {
  // physical
  pending: { label: "Chờ xác nhận", tone: "muted" },
  confirmed: { label: "Đã xác nhận", tone: "ink" },
  packing: { label: "Đang đóng gói", tone: "ink" },
  shipping: { label: "Đang giao", tone: "ink" },
  delivered: { label: "Đã giao", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "muted" },
  returned: { label: "Đã trả", tone: "muted" },
  // imei
  paid: { label: "Đã thanh toán", tone: "ink" },
  activated: { label: "Đã kích hoạt", tone: "success" },
  failed: { label: "Thất bại", tone: "danger" },
  refunded: { label: "Đã hoàn tiền", tone: "muted" },
};

const toneClass: Record<"ink" | "muted" | "success" | "danger", string> = {
  ink: "text-ink",
  muted: "text-muted",
  success: "text-[#0d7a4a]",
  danger: "text-danger",
};

export default function OrderRow({ order }: Props) {
  const navigate = useNavigate();
  const meta = statusMeta[order.status];
  const first = order.items[0];

  const thumbnail =
    first?.thumbnail ||
    (first?.product_id && products.find((p) => p.id === first.product_id)?.image_url) ||
    undefined;

  return (
    <button
      onClick={() => navigate(`/orders/${order.id}`)}
      className="w-full text-left rounded-md border border-hairline p-base flex gap-md active:bg-surface-soft transition-colors"
    >
      <div className="w-14 h-14 rounded-md bg-surface-strong overflow-hidden shrink-0 flex items-center justify-center text-muted">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon name={order.kind === "imei" ? "qr" : "package"} size={22} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-sm">
          <div className="text-[14px] leading-[1.43] text-muted">
            #{order.id} · {order.kind === "imei" ? "Gói cước" : "Vật lý"}
          </div>
          <div className={`text-[13px] leading-[1.23] font-semibold ${toneClass[meta.tone]}`}>
            {meta.label}
          </div>
        </div>
        <div className="text-[16px] leading-[1.25] font-semibold text-ink mt-xxs line-clamp-1">
          {first?.name ?? "Đơn hàng"}
        </div>
        <div className="mt-xs flex items-center justify-between">
          <span className="text-[13px] leading-[1.23] text-muted">
            {order.items.length} sản phẩm
          </span>
          <span className="text-[14px] leading-[1.43] text-ink font-semibold">
            {formatVND(order.total)}
          </span>
        </div>
      </div>
    </button>
  );
}
