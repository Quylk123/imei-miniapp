import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";

import StatusBadge from "@/components/imei/status-badge";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import { daysUntil, formatExpiry } from "@/lib/format";
import { packages } from "@/mocks";
import { myImeisAtom } from "@/state/atoms";

const groupImei = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");

export default function ImeiDetailPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const navigate = useNavigate();
  const imeis = useAtomValue(myImeisAtom);
  const imei = imeis.find((i) => i.id === imeiId);

  if (!imei) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">Không tìm thấy IMEI.</div>
      </Page>
    );
  }

  const activePkg = packages.find((p) => p.id === imei.active_package_id);
  const remaining = daysUntil(imei.expiry_date);

  // Sticky CTA chỉ ở trạng thái cần action: pending_activation và locked.
  const needsAction = imei.status === "pending_activation" || imei.status === "locked";
  const ctaLabel =
    imei.status === "pending_activation" ? "Chọn gói kích hoạt" : "Gia hạn gói cước";

  const goPackages = () => navigate(`/my-imei/${imei.id}/packages`);

  const history = imei.package_history ?? [];

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
            {groupImei(imei.imei_number)}
          </div>
          {imei.linked_at && (
            <div className="text-[13px] leading-[1.23] text-muted mt-md">
              Liên kết ngày {formatExpiry(imei.linked_at)}
            </div>
          )}
        </section>

        {/* Status block */}
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
            <button
              onClick={goPackages}
              className="mt-md text-[14px] leading-[1.43] text-ink underline"
            >
              Gia hạn sớm
            </button>
          </section>
        )}

        {imei.status === "locked" && (
          <section className="mt-base rounded-md p-base border border-danger/30 bg-danger/5">
            <div className="flex items-center gap-sm text-danger">
              <Icon name="alert" size={18} />
              <span className="text-[14px] leading-[1.43] font-semibold">
                IMEI đã hết hạn
              </span>
            </div>
            <p className="text-[14px] leading-[1.43] text-body mt-xs">
              Hết hạn từ {formatExpiry(imei.expiry_date)}. Gia hạn ngay để khôi phục dịch vụ.
            </p>
          </section>
        )}

        {imei.status === "pending_activation" && (
          <section className="mt-base rounded-md p-base bg-surface-soft">
            <div className="text-[16px] leading-[1.25] font-semibold text-ink">
              IMEI đã liên kết — chưa kích hoạt
            </div>
            <p className="text-[14px] leading-[1.43] text-muted mt-xxs">
              Chọn gói cước để bắt đầu sử dụng. Bạn có thể bắt đầu bằng gói dùng thử miễn phí.
            </p>
          </section>
        )}

        {/* Package history */}
        {history.length > 0 && (
          <section className="mt-lg">
            <h2 className="text-[16px] leading-[1.25] font-semibold text-ink">
              Lịch sử gói cước
            </h2>
            <ul className="mt-sm rounded-md border border-hairline overflow-hidden">
              {history.map((h, i) => {
                const pkg = packages.find((p) => p.id === h.package_id);
                const isActive = !h.ended_at;
                return (
                  <li
                    key={`${h.package_id}-${h.started_at}`}
                    className={`flex items-start justify-between gap-md p-base ${i !== history.length - 1 ? "border-b border-hairline-soft" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] leading-[1.43] font-medium text-ink">
                        {pkg?.name ?? "Gói cước"}
                      </div>
                      <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                        {formatExpiry(h.started_at)}
                        {h.ended_at ? ` → ${formatExpiry(h.ended_at)}` : " → đang chạy"}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[11px] leading-[1.18] font-semibold text-[#0d7a4a] bg-[rgba(62,207,142,0.18)] rounded-full px-[10px] py-[4px] shrink-0">
                        Đang dùng
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Support */}
        <button
          onClick={() => navigate("/account")}
          className="mt-lg w-full flex items-center justify-between py-md text-[14px] leading-[1.43] text-ink"
        >
          <span className="flex items-center gap-sm">
            <Icon name="support" size={18} />
            Liên hệ hỗ trợ
          </span>
          <Icon name="chevron-right" size={18} className="text-muted" />
        </button>
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
