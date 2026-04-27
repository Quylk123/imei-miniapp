import { useAtomValue, useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PackageCard from "@/components/imei/package-card";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { daysUntil, formatExpiry, formatVND } from "@/lib/format";
import { myImeisAtom, packagesAtom, selectedPackageAtom } from "@/state/atoms";

/**
 * Tính ngày hết hạn mới sau khi mua thêm gói:
 * - activated: cộng dồn từ expiry hiện tại
 * - locked / pending_activation: tính từ hôm nay
 * - lifetime (duration 0): vĩnh viễn
 */
const previewExpiry = (
  imeiStatus: string,
  currentExpiry: string | undefined,
  durationDays: number
): { label: string; sub: string } => {
  if (durationDays === 0) {
    return { label: "Vĩnh viễn", sub: "Không giới hạn" };
  }
  const baseTs =
    imeiStatus === "activated" && currentExpiry
      ? new Date(currentExpiry).getTime()
      : Date.now();
  const newExpiry = new Date(baseTs + durationDays * 86400000);
  const days = Math.ceil((newExpiry.getTime() - Date.now()) / 86400000);
  return {
    label: newExpiry.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    sub: `Còn ${days} ngày`,
  };
};

export default function PackagesPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const navigate = useNavigate();
  const imeis = useAtomValue(myImeisAtom);
  const allPackages = useAtomValue(packagesAtom);
  const imei = imeis.find((i) => i.id === imeiId);
  const setSelected = useSetAtom(selectedPackageAtom);

  const eligible = useMemo(
    () => (imei ? allPackages.filter((p) => imei.package_ids.includes(p.id)) : []),
    [imei, allPackages]
  );

  const [pickedId, setPickedId] = useState<string | undefined>(eligible[1]?.id ?? eligible[0]?.id);
  const picked = eligible.find((p) => p.id === pickedId);

  if (!imei) {
    return (
      <Page>
        <div className="px-base py-xxl text-center text-muted">
          Không tìm thấy thiết bị.
        </div>
      </Page>
    );
  }

  const onContinue = () => {
    if (!picked) return;
    setSelected({ imeiId: imei.id, packageId: picked.id });
    navigate(`/my-imei/${imei.id}/checkout`);
  };

  const preview = picked
    ? previewExpiry(imei.status, imei.expiry_date, picked.duration_days)
    : null;

  return (
    <Page>
      <div className="pb-[calc(112px+env(safe-area-inset-bottom))]">
        <div className="text-[14px] leading-[1.43] text-muted">
          IMEI ···{imei.imei_number.slice(-4)}
        </div>
        {imei.status === "activated" && imei.expiry_date && (
          <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
            Đang dùng đến {formatExpiry(imei.expiry_date)} ·{" "}
            {Math.max(0, daysUntil(imei.expiry_date))} ngày còn lại
          </div>
        )}

        <div className="mt-md space-y-md">
          {eligible.map((pkg, idx) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              selected={pickedId === pkg.id}
              recommended={idx === 1}
              onSelect={() => setPickedId(pkg.id)}
            />
          ))}
        </div>

        {picked && preview && (
          <section className="mt-lg p-base rounded-md bg-surface-soft">
            <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
              Sau khi thanh toán
            </div>
            <div className="mt-xs flex items-center justify-between">
              <span className="text-[14px] leading-[1.43] text-muted">Hạn sử dụng mới</span>
              <span className="text-[16px] leading-[1.25] font-semibold text-ink">
                {preview.label}
              </span>
            </div>
            <div className="mt-xxs flex items-center justify-between">
              <span className="text-[14px] leading-[1.43] text-muted">Thời lượng</span>
              <span className="text-[14px] leading-[1.43] text-ink">{preview.sub}</span>
            </div>
            {imei.status === "activated" && (
              <p className="text-[13px] leading-[1.23] text-muted mt-xs">
                Mua sớm — thời hạn được cộng dồn vào ngày hết hạn hiện tại.
              </p>
            )}
            {imei.status === "locked" && (
              <p className="text-[13px] leading-[1.23] text-muted mt-xs">
                Hạn sử dụng tính từ hôm nay sau khi gia hạn.
              </p>
            )}
          </section>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <div className="flex items-center gap-md">
          <div className="flex-1">
            <div className="text-[12px] leading-[1.18] text-muted">Thanh toán</div>
            <div className="text-[18px] leading-[1.25] font-bold text-ink">
              {picked ? (picked.price === 0 ? "Miễn phí" : formatVND(picked.price)) : "—"}
            </div>
          </div>
          <Button onClick={onContinue} disabled={!picked} className="flex-[1.4]">
            Tiếp tục
          </Button>
        </div>
      </div>
    </Page>
  );
}
