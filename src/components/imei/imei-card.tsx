import { ArrowRight2, Simcard1 } from "iconsax-react";
import { useNavigate } from "react-router-dom";

import StatusBadge from "@/components/imei/status-badge";
import { daysUntil, displayImei, formatExpiry } from "@/lib/format";
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
  const label = expiryLabel(imei);

  const showExpiry =
    imei.expiry_date && (imei.status === "activated" || imei.status === "locked");

  return (
    <button
      onClick={() => navigate(`/my-imei/${imei.id}`)}
      className="w-full text-left rounded-md border border-hairline p-base flex items-center gap-md active:bg-surface-soft transition-colors"
    >
      <div className="w-11 h-11 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
        <Simcard1 size={22} variant="Bold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[16px] leading-[1.25] font-semibold text-ink font-mono truncate">
          {displayImei(imei.imei_number)}
        </div>
        <div className="mt-xxs flex items-center gap-xs flex-wrap text-[12px] leading-[1.18] text-muted">
          <StatusBadge status={imei.status} label={label} />
          {imei.product_name && (
            <span className="truncate max-w-[180px]">{imei.product_name}</span>
          )}
          {showExpiry && (
            <>
              <span aria-hidden>·</span>
              <span>HSD {formatExpiry(imei.expiry_date)}</span>
            </>
          )}
        </div>
      </div>
      <ArrowRight2 size={18} variant="Linear" className="text-muted shrink-0" />
    </button>
  );
}
