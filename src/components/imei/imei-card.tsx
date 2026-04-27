import { useNavigate } from "react-router-dom";

import StatusBadge from "@/components/imei/status-badge";
import Icon from "@/components/ui/icon";
import { daysUntil, formatExpiry } from "@/lib/format";
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

/** Format số IMEI cho dễ đọc: 3567 8910 2345 671 */
const groupImei = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");

export default function ImeiCard({ imei }: Props) {
  const navigate = useNavigate();
  const label = expiryLabel(imei);

  return (
    <button
      onClick={() => navigate(`/my-imei/${imei.id}`)}
      className="w-full text-left rounded-md border border-hairline p-base flex gap-md active:bg-surface-soft transition-colors"
    >
      <div className="w-12 h-12 rounded-md bg-rausch/10 text-rausch flex items-center justify-center shrink-0">
        <Icon name="qr" size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
          IMEI
        </div>
        <div className="text-[15px] leading-[1.25] font-semibold text-ink font-mono mt-xxs">
          {groupImei(imei.imei_number)}
        </div>
        <div className="mt-sm flex items-center gap-sm flex-wrap">
          <StatusBadge status={imei.status} label={label} />
          {imei.expiry_date && (imei.status === "activated" || imei.status === "locked") && (
            <span className="text-[12px] leading-[1.18] text-muted">
              · HSD {formatExpiry(imei.expiry_date)}
            </span>
          )}
        </div>
      </div>
      <Icon name="chevron-right" size={20} className="self-center text-muted shrink-0" />
    </button>
  );
}
