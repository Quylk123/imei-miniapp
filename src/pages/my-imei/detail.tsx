import { ArrowRight2, Headphone, InfoCircle, Warning2 } from "iconsax-react";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";

import StatusBadge from "@/components/imei/status-badge";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { daysUntil, displayImei, formatExpiry } from "@/lib/format";
import { openSupportChat } from "@/lib/support";
import { myImeisAtom, packagesAtom } from "@/state/atoms";
import type { IMEI } from "@/types";

// ── Recall thresholds (theo spec transitions) ──
// T4: activated → locked tại expiry_date.
// T6: pending_activation → recalled sau 60 ngày từ linked_at nếu không kích hoạt.
// T7: locked → recalled sau 60 ngày từ expiry_date nếu không gia hạn.
const PENDING_GRACE_DAYS = 60;
const LOCKED_GRACE_DAYS = 60;
// Ngưỡng tone cho cả expiry và recall countdown.
const WARN_DAYS = 30;
const DANGER_DAYS = 7;

type Tone = "info" | "warning" | "danger";

interface TimelineMessage {
  tone: Tone;
  primary: string;
  secondary?: string;
}

/** Số ngày trôi qua từ một ISO date đến hiện tại (làm tròn xuống). */
const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

/**
 * Chọn tone + thông điệp theo status. Trả null khi không cần cảnh báo
 * (vd activated còn nhiều ngày, sold/new/missing data).
 */
function getTimeline(imei: IMEI): TimelineMessage | null {
  if (imei.status === "activated" && imei.expiry_date) {
    const days = daysUntil(imei.expiry_date);
    if (days <= 0) {
      return {
        tone: "danger",
        primary: "Hết hạn hôm nay",
        secondary: "Gia hạn ngay để tiếp tục sử dụng dịch vụ.",
      };
    }
    if (days <= DANGER_DAYS) {
      return {
        tone: "danger",
        primary: `Hết hạn trong ${days} ngày`,
        secondary: `Hết hạn ${formatExpiry(imei.expiry_date)}. Gia hạn ngay để không bị gián đoạn.`,
      };
    }
    if (days <= WARN_DAYS) {
      return {
        tone: "warning",
        primary: `Sắp hết hạn · còn ${days} ngày`,
        secondary: `Hết hạn ${formatExpiry(imei.expiry_date)}. Gia hạn sớm để duy trì dịch vụ.`,
      };
    }
    return null; // còn nhiều ngày — không cần cảnh báo riêng, để package card tự thông tin.
  }

  if (imei.status === "pending_activation") {
    if (!imei.linked_at) {
      return {
        tone: "info",
        primary: "Chọn gói cước để bắt đầu sử dụng",
        secondary: "Vui lòng chọn gói cước để bắt đầu sử dụng.",
      };
    }
    const left = PENDING_GRACE_DAYS - daysSince(imei.linked_at);
    if (left <= 0) {
      return {
        tone: "danger",
        primary: "Đã quá hạn liên kết",
        secondary: `SIM có thể đã bị thu hồi do không kích hoạt trong ${PENDING_GRACE_DAYS} ngày. Liên hệ hỗ trợ nếu cần.`,
      };
    }
    if (left <= DANGER_DAYS) {
      return {
        tone: "danger",
        primary: `Sắp bị thu hồi · còn ${left} ngày`,
        secondary: `SIM sẽ tự động thu hồi nếu không chọn gói trong ${left} ngày tới.`,
      };
    }
    if (left <= WARN_DAYS) {
      return {
        tone: "warning",
        primary: `Còn ${left} ngày để kích hoạt`,
        secondary: `SIM sẽ tự động thu hồi sau ${PENDING_GRACE_DAYS} ngày kể từ liên kết nếu không chọn gói.`,
      };
    }
    return {
      tone: "info",
      primary: `Còn ${left} ngày để kích hoạt`,
      secondary: "Vui lòng chọn gói cước để bắt đầu sử dụng.",
    };
  }

  if (imei.status === "locked" && imei.expiry_date) {
    const expiredDays = -daysUntil(imei.expiry_date);
    const left = LOCKED_GRACE_DAYS - expiredDays;
    if (left <= 0) {
      return {
        tone: "danger",
        primary: "Đã quá hạn gia hạn",
        secondary: `SIM có thể đã bị thu hồi vĩnh viễn do quá ${LOCKED_GRACE_DAYS} ngày không gia hạn. Liên hệ hỗ trợ.`,
      };
    }
    if (left <= DANGER_DAYS) {
      return {
        tone: "danger",
        primary: `Sắp bị thu hồi vĩnh viễn · còn ${left} ngày`,
        secondary: `Hết hạn từ ${formatExpiry(imei.expiry_date)}. Gia hạn ngay để khôi phục dịch vụ.`,
      };
    }
    if (left <= WARN_DAYS) {
      return {
        tone: "warning",
        primary: `Đã hết hạn · còn ${left} ngày trước khi thu hồi`,
        secondary: `Hết hạn từ ${formatExpiry(imei.expiry_date)}. Gia hạn để khôi phục dịch vụ.`,
      };
    }
    return {
      tone: "warning",
      primary: "SIM đã hết hạn",
      secondary: `Hết hạn từ ${formatExpiry(imei.expiry_date)}. Gia hạn ngay để khôi phục dịch vụ.`,
    };
  }

  if (imei.status === "recalled") {
    return {
      tone: "danger",
      primary: "SIM đã bị huỷ",
      secondary: "Vui lòng liên hệ hỗ trợ để được đổi SIM mới và tiếp tục sử dụng dịch vụ.",
    };
  }

  return null;
}

// Tone palette — info dùng surface trung tính, warning dùng amber (mượn từ
// IMEI_BADGE.sold), danger dùng red theme có sẵn (--danger).
const toneStyle: Record<Tone, { wrap: string; icon: string }> = {
  info: {
    wrap: "bg-surface-soft border border-hairline-soft text-ink",
    icon: "text-muted",
  },
  warning: {
    wrap: "bg-[rgba(245,166,35,0.08)] border border-[rgba(245,166,35,0.30)] text-[#7a4f00]",
    icon: "text-[#7a4f00]",
  },
  danger: {
    wrap: "bg-danger/5 border border-danger/30 text-danger",
    icon: "text-danger",
  },
};

function TimelineCard({ tone, primary, secondary }: TimelineMessage) {
  const s = toneStyle[tone];
  const Icon = tone === "info" ? InfoCircle : Warning2;
  return (
    <section className={`rounded-md p-base flex gap-sm ${s.wrap}`}>
      <span className={`shrink-0 ${s.icon}`}>
        <Icon size={20} variant="Bold" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] leading-[1.43] font-semibold">{primary}</div>
        {secondary && (
          <p className="text-[13px] leading-[1.38] text-body mt-xxs">{secondary}</p>
        )}
      </div>
    </section>
  );
}

export default function ImeiDetailPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const navigate = useNavigate();
  const imeis = useAtomValue(myImeisAtom);
  const packages = useAtomValue(packagesAtom);
  const imei = imeis.find((i) => i.id === imeiId);

  if (!imei) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">Không tìm thấy SIM.</div>
      </Page>
    );
  }

  const activePkg = packages.find((p) => p.id === imei.active_package_id);
  const remaining = daysUntil(imei.expiry_date);
  const timeline = getTimeline(imei);

  // Sticky CTA chỉ ở trạng thái cần action: pending_activation và locked.
  // recalled là terminal state — không thể gia hạn/kích hoạt nữa, ẩn CTA.
  const needsAction = imei.status === "pending_activation" || imei.status === "locked";
  const ctaLabel =
    imei.status === "pending_activation" ? "Chọn gói kích hoạt" : "Gia hạn gói cước";

  const goPackages = () => navigate(`/my-imei/${imei.id}/packages`);

  return (
    <Page>
      <div className={needsAction ? "pb-[calc(96px+env(safe-area-inset-bottom))]" : ""}>
        {/* IMEI header */}
        <section className="rounded-md border border-hairline p-base">
          <StatusBadge status={imei.status} />
          <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted mt-md">
            Mã IMEI
          </div>
          <div className="text-[20px] leading-[1.2] font-semibold text-ink font-mono tracking-[-0.18px] mt-xxs break-all">
            {displayImei(imei.imei_number)}
          </div>
        </section>

        {/* Sản phẩm liên kết — hiện cho IMEI mới (đã chọn product khi link).
            IMEI cũ (legacy, chưa migrate) có product_name=undefined → ẩn card. */}
        {imei.product_name && (
          <section className="mt-base rounded-md border border-hairline p-base">
            <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
              SIM sử dụng cho thiết bị
            </div>
            <div className="text-[16px] leading-[1.25] font-semibold text-ink mt-xxs">
              {imei.product_name}
            </div>
          </section>
        )}

        {/* Ghi chú */}
        {imei.notes && (
          <section className="mt-base rounded-md border border-hairline p-base">
            <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
              Ghi chú
            </div>
            <div className="text-[14px] leading-[1.4] text-ink mt-xxs whitespace-pre-wrap">
              {imei.notes}
            </div>
          </section>
        )}

        {/* Timeline / cảnh báo theo status */}
        {timeline && (
          <div className="mt-base">
            <TimelineCard {...timeline} />
          </div>
        )}

        {/* Gói đang dùng — chỉ activated. Hiển thị bên dưới cảnh báo (nếu có)
            để user thấy context "đang dùng gì" sau khi đọc cảnh báo "sắp hết". */}
        {imei.status === "activated" && activePkg && (
          <section className="mt-base rounded-md bg-surface-soft p-base">
            <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
              Gói đang sử dụng
            </div>
            <div className="text-[20px] leading-[1.2] font-semibold text-ink mt-xxs tracking-[-0.18px]">
              {activePkg.name}
            </div>
            <div className="mt-sm flex items-center justify-between">
              <span className="text-[14px] leading-[1.43] text-muted">Còn lại</span>
              <span className="text-[16px] leading-[1.25] font-semibold text-ink">
                {remaining > 0 ? `${remaining} ngày` : "Hết hạn"}
              </span>
            </div>
            <div className="mt-xs flex items-center justify-between">
              <span className="text-[14px] leading-[1.43] text-muted">Ngày hết hạn</span>
              <span className="text-[16px] leading-[1.25] font-medium text-ink">
                {formatExpiry(imei.expiry_date)}
              </span>
            </div>
            <div className="mt-md">
              <Button fullWidth onClick={goPackages}>
                Gia hạn sớm
              </Button>
            </div>
          </section>
        )}

        {/* Support */}
        <button
          onClick={openSupportChat}
          className="mt-lg w-full flex items-center justify-between py-md text-[14px] leading-[1.43] text-ink"
        >
          <span className="flex items-center gap-sm">
            <Headphone size={18} variant="Linear" />
            Liên hệ hỗ trợ
          </span>
          <ArrowRight2 size={18} variant="Linear" className="text-muted" />
        </button>

        {imei.status === "recalled" && (
          <div className="mt-base">
            <Button
              fullWidth
              variant="ghost"
              onClick={() => navigate("/", { replace: true })}
            >
              Về trang chủ
            </Button>
          </div>
        )}
      </div>

      {/* Sticky CTA — chỉ khi cần action */}
      {needsAction && (
        <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
          <Button fullWidth onClick={goPackages}>
            {ctaLabel}
          </Button>
        </div>
      )}
    </Page>
  );
}
