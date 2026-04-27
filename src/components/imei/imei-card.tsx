import { useNavigate } from "react-router-dom";

import StatusBadge from "@/components/imei/status-badge";
import Icon from "@/components/ui/icon";
import { daysUntil, formatExpiry } from "@/lib/format";
import { products } from "@/mocks";
import type { IMEI } from "@/types";

interface Props {
  imei: IMEI;
}

const expiryLabel = (imei: IMEI) => {
  if (imei.status === "pending_activation") return "Chưa kích hoạt";
  if (imei.status === "activated") {
    const d = daysUntil(imei.expiry_date);
    if (d > 30) return `Còn ${d} ngày`;
    if (d > 0) return `Sắp hết hạn · ${d} ngày`;
    return "Hết hạn hôm nay";
  }
  if (imei.status === "locked") {
    const d = -daysUntil(imei.expiry_date);
    return `Hết hạn ${d} ngày trước`;
  }
  return undefined;
};

export default function ImeiCard({ imei }: Props) {
  const navigate = useNavigate();
  const product = products.find((p) => p.id === imei.product_id);
  const lastFour = imei.imei_number.slice(-4);
  const label = expiryLabel(imei);

  return (
    <button
      onClick={() => navigate(`/my-imei/${imei.id}`)}
      className="w-full text-left rounded-md border border-hairline p-base flex gap-md active:bg-surface-soft transition-colors"
    >
      <div className="w-16 h-16 rounded-md bg-surface-strong overflow-hidden shrink-0">
        {product?.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <Icon name="package" size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[16px] leading-[1.25] font-semibold text-ink line-clamp-1">
          {product?.name ?? "Thiết bị IMEI"}
        </div>
        <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
          IMEI ···{lastFour}
        </div>
        <div className="mt-sm flex items-center gap-sm flex-wrap">
          <StatusBadge status={imei.status} label={label} />
          {imei.expiry_date && (imei.status === "activated" || imei.status === "locked") && (
            <span className="text-[13px] leading-[1.23] text-muted">
              · HSD {formatExpiry(imei.expiry_date)}
            </span>
          )}
        </div>
      </div>
      <Icon name="chevron-right" size={20} className="self-center text-muted shrink-0" />
    </button>
  );
}
