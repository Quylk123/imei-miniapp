import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import PackageCard from "@/components/imei/package-card";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { lookupIMEI } from "@/data/supabase";
import { daysUntil, formatExpiry, formatVND } from "@/lib/format";
import {
  authLoadingAtom,
  customerAtom,
  packagesAtom,
  selectedPackageAtom,
} from "@/state/atoms";

/**
 * Trang chọn gói cước cho luồng "thanh toán giúp" — user B trả tiền gói cho
 * IMEI thuộc tài khoản A. Khác /my-imei/:imeiId/packages ở chỗ IMEI KHÔNG
 * thuộc myImeisAtom của B, nên ta fetch metadata qua lookupIMEI (service-role
 * edge function).
 */

interface BorrowedImei {
  id: string;
  imei_number: string;
  status: string;
  expiry_date: string | null;
  active_package_name: string | null;
  eligible_package_ids: string[];
}

const previewExpiry = (
  imeiStatus: string,
  currentExpiry: string | null,
  pkg: { type: string; duration_days: number; fixed_expiry_date?: string | null }
): { label: string; sub: string } => {
  const fmt = (d: Date) =>
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (pkg.type === "fixed_expiry" && pkg.fixed_expiry_date) {
    const fixedTs = new Date(pkg.fixed_expiry_date).getTime();
    const currentTs =
      imeiStatus === "activated" && currentExpiry
        ? new Date(currentExpiry).getTime()
        : 0;
    const finalTs = Math.max(fixedTs, currentTs);
    const finalDate = new Date(finalTs);
    const days = Math.ceil((finalTs - Date.now()) / 86400000);
    const usedFixed = finalTs === fixedTs;
    return {
      label: fmt(finalDate),
      sub: usedFixed
        ? `Còn ${days} ngày`
        : `Giữ hạn cũ · còn ${days} ngày`,
    };
  }

  if (pkg.duration_days === 0) {
    return { label: "Vĩnh viễn", sub: "Không giới hạn" };
  }
  const baseTs =
    imeiStatus === "activated" && currentExpiry
      ? new Date(currentExpiry).getTime()
      : Date.now();
  const newExpiry = new Date(baseTs + pkg.duration_days * 86400000);
  const days = Math.ceil((newExpiry.getTime() - Date.now()) / 86400000);
  return {
    label: fmt(newExpiry),
    sub: `Còn ${days} ngày`,
  };
};

export default function RenewPackagesPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const [search] = useSearchParams();
  const imeiNumber = search.get("imei") ?? "";
  const navigate = useNavigate();

  const customer = useAtomValue(customerAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const allPackages = useAtomValue(packagesAtom);
  const setSelected = useSetAtom(selectedPackageAtom);

  const [loading, setLoading] = useState(true);
  const [imei, setImei] = useState<BorrowedImei | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!customer) {
      navigate("/auth", {
        replace: true,
        state: {
          redirectTo: `/renew/${imeiId}?imei=${encodeURIComponent(imeiNumber)}`,
          reason: "Vui lòng đăng nhập để thanh toán hộ.",
        },
      });
      return;
    }
    if (!imeiNumber) {
      setErrorMsg("Thiếu mã IMEI trong URL.");
      setLoading(false);
      return;
    }
    lookupIMEI(imeiNumber)
      .then((res) => {
        if (!res.exists) {
          setErrorMsg("Không tìm thấy SIM.");
          return;
        }
        if (res.ownership === "mine") {
          navigate(`/my-imei/${res.imei_id}/packages`, { replace: true });
          return;
        }
        if (res.ownership !== "other" || !res.can_renew || !res.imei_id) {
          setErrorMsg("Không thể gia hạn SIM này.");
          return;
        }
        setImei({
          id: res.imei_id,
          imei_number: imeiNumber,
          status: res.status,
          expiry_date: res.expiry_date ?? null,
          active_package_name: res.active_package_name ?? null,
          eligible_package_ids: res.eligible_package_ids ?? [],
        });
      })
      .catch((err) => {
        console.error("[renew] lookup failed:", err);
        setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối.");
      })
      .finally(() => setLoading(false));
  }, [isAuthLoading, customer, imeiId, imeiNumber, navigate]);

  // Loại trial khỏi luồng proxy — trial là quyền của chủ IMEI đích thực.
  const eligible = useMemo(() => {
    if (!imei) return [];
    const idSet = new Set(imei.eligible_package_ids);
    return allPackages
      .filter((p) => idSet.has(p.id))
      .filter((p) => p.type !== "trial")
      .filter((p) => {
        if (p.type !== "fixed_expiry") return true;
        if (!p.fixed_expiry_date) return false;
        return new Date(p.fixed_expiry_date).getTime() > Date.now();
      });
  }, [imei, allPackages]);

  const [pickedId, setPickedId] = useState<string | undefined>();
  useEffect(() => {
    if (eligible.length > 0 && !pickedId) {
      setPickedId(eligible[1]?.id ?? eligible[0]?.id);
    }
  }, [eligible, pickedId]);

  if (loading || !customer) {
    return (
      <Page>
        <div className="px-base py-xxl text-center text-muted">Đang tải...</div>
      </Page>
    );
  }

  if (errorMsg || !imei) {
    return (
      <Page>
        <div className="px-base py-xxl text-center space-y-md">
          <p className="text-[16px] text-ink">{errorMsg ?? "Không thể tải SIM."}</p>
          <Button variant="ghost" onClick={() => navigate("/", { replace: true })}>
            Về trang chủ
          </Button>
        </div>
      </Page>
    );
  }

  const picked = eligible.find((p) => p.id === pickedId);
  const preview = picked ? previewExpiry(imei.status, imei.expiry_date, picked) : null;

  const onContinue = () => {
    if (!picked) return;
    setSelected({ imeiId: imei.id, packageId: picked.id });
    navigate(`/renew/${imei.id}/checkout?imei=${encodeURIComponent(imei.imei_number)}`);
  };

  return (
    <Page>
      <div className="pb-[calc(112px+env(safe-area-inset-bottom))]">
        <div className="rounded-md bg-surface-soft p-base">
          <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
            Thanh toán giúp · giữ chủ hiện tại
          </div>
          <div className="text-[14px] leading-[1.43] text-ink mt-xxs">
            SIM ···{imei.imei_number.slice(-4)}
          </div>
          {imei.active_package_name && (
            <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
              Gói hiện tại: {imei.active_package_name}
            </div>
          )}
          {imei.status === "activated" && imei.expiry_date && (
            <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
              Đang dùng đến {formatExpiry(imei.expiry_date)} ·{" "}
              {Math.max(0, daysUntil(imei.expiry_date))} ngày còn lại
            </div>
          )}
          {imei.status === "locked" && imei.expiry_date && (
            <div className="text-[13px] leading-[1.23] text-warning mt-xxs">
              Đã hết hạn từ {formatExpiry(imei.expiry_date)}
            </div>
          )}
        </div>

        {eligible.length === 0 ? (
          <p className="mt-lg text-center text-muted text-[14px]">
            Không có gói cước khả dụng cho SIM này.
          </p>
        ) : (
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
        )}

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
            <p className="text-[13px] leading-[1.23] text-muted mt-xs">
              Chủ sở hữu hiện tại không thay đổi. Bạn chỉ đang trả tiền giúp.
            </p>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <div className="flex items-center gap-md">
          <div className="flex-1">
            <div className="text-[12px] leading-[1.18] text-muted">Thanh toán</div>
            <div className="text-[18px] leading-[1.25] font-bold text-ink">
              {picked ? formatVND(picked.price) : "—"}
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
