import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";

import StatusBadge from "@/components/imei/status-badge";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import TopBar from "@/components/ui/top-bar";
import { daysUntil, formatExpiry } from "@/lib/format";
import { packages, products } from "@/mocks";
import { myImeisAtom } from "@/state/atoms";

export default function ImeiDetailPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const navigate = useNavigate();
  const imeis = useAtomValue(myImeisAtom);
  const imei = imeis.find((i) => i.id === imeiId);

  if (!imei) {
    return (
      <Page noPadding>
        <TopBar title="Thiết bị" />
        <div className="px-base py-xxl text-center text-muted">
          Không tìm thấy thiết bị.
        </div>
      </Page>
    );
  }

  const product = products.find((p) => p.id === imei.product_id);
  const activePkg = packages.find((p) => p.id === imei.active_package_id);
  const remaining = daysUntil(imei.expiry_date);

  const ctaLabel = (() => {
    if (imei.status === "pending_activation") return "Chọn gói kích hoạt";
    if (imei.status === "locked") return "Gia hạn gói cước";
    if (imei.status === "activated") return "Mua thêm thời hạn";
    return "Liên hệ hỗ trợ";
  })();

  return (
    <Page noPadding>
      <TopBar title="Chi tiết thiết bị" />

      <div className="px-base pt-base pb-[calc(96px+env(safe-area-inset-bottom))]">
        {/* Hero */}
        <section className="rounded-md border border-hairline overflow-hidden">
          {product?.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full aspect-[16/9] object-cover bg-surface-strong"
            />
          )}
          <div className="p-base">
            <StatusBadge status={imei.status} />
            <div className="text-[20px] leading-[1.2] font-semibold text-ink tracking-[-0.18px] mt-sm">
              {product?.name ?? "Thiết bị IMEI"}
            </div>
            <div className="text-[14px] leading-[1.43] text-muted mt-xxs">
              IMEI: <span className="text-ink font-mono">{imei.imei_number}</span>
            </div>
          </div>
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
          </section>
        )}

        {imei.status === "locked" && (
          <section className="mt-base rounded-md p-base border border-danger/30 bg-danger/5">
            <div className="flex items-center gap-sm text-danger">
              <Icon name="alert" size={18} />
              <span className="text-[14px] leading-[1.43] font-semibold">
                Thiết bị đã hết hạn
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
              Thiết bị mới — chưa kích hoạt
            </div>
            <p className="text-[14px] leading-[1.43] text-muted mt-xxs">
              Chọn gói cước để kích hoạt. Bạn có thể bắt đầu bằng gói dùng thử miễn phí.
            </p>
          </section>
        )}

        {/* Specs */}
        {product && Object.keys(product.specs).length > 0 && (
          <section className="mt-lg">
            <h2 className="text-[16px] leading-[1.25] font-semibold text-ink">
              Thông số thiết bị
            </h2>
            <ul className="mt-sm">
              {Object.entries(product.specs).map(([k, v], i, arr) => (
                <li
                  key={k}
                  className={`flex items-center justify-between py-md text-[14px] leading-[1.43] ${i !== arr.length - 1 ? "border-b border-hairline-soft" : ""}`}
                >
                  <span className="text-muted">{k}</span>
                  <span className="text-ink font-medium text-right">{v}</span>
                </li>
              ))}
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

      {/* Sticky CTA */}
      {imei.status !== "recalled" && (
        <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
          <Button
            fullWidth
            onClick={() => navigate(`/my-imei/${imei.id}/packages`)}
          >
            {ctaLabel}
          </Button>
        </div>
      )}
    </Page>
  );
}
