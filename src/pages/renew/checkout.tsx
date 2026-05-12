import { Box1, Simcard1 } from "iconsax-react";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { formatVND } from "@/lib/format";
import { lookupIMEI } from "@/data/supabase";
import { listenPaymentEvents, startImeiPayment } from "@/services/payment";
import {
  authLoadingAtom,
  customerAtom,
  packagesAtom,
  selectedPackageAtom,
} from "@/state/atoms";

/**
 * Checkout proxy-pay: B trả tiền gói cước cho IMEI của A. Sau khi thanh toán
 * thành công, IMEI vẫn thuộc A. Order thuộc B. Điều hướng về /orders/:id/success.
 */
export default function RenewCheckoutPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const [search] = useSearchParams();
  const imeiNumber = search.get("imei") ?? "";
  const navigate = useNavigate();

  const customer = useAtomValue(customerAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const [selected, setSelected] = useAtom(selectedPackageAtom);
  const allPackages = useAtomValue(packagesAtom);

  const [imei, setImei] = useState<{ id: string; imei_number: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingOrderRef = useRef<number | null>(null);

  const pkg = allPackages.find((p) => p.id === selected?.packageId);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!customer) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!imeiId || !imeiNumber) {
      navigate("/", { replace: true });
      return;
    }
    if (!pkg || selected?.imeiId !== imeiId) {
      navigate(`/renew/${imeiId}?imei=${encodeURIComponent(imeiNumber)}`, { replace: true });
      return;
    }
    lookupIMEI(imeiNumber)
      .then((res) => {
        if (!res.exists || !res.imei_id) {
          navigate("/", { replace: true });
          return;
        }
        if (res.ownership === "mine") {
          navigate(`/my-imei/${res.imei_id}/checkout`, { replace: true });
          return;
        }
        if (res.ownership !== "other" || !res.can_renew) {
          navigate("/", { replace: true });
          return;
        }
        setImei({ id: res.imei_id, imei_number: imeiNumber });
      })
      .catch(() => navigate("/", { replace: true }));
  }, [isAuthLoading, customer, imeiId, imeiNumber, pkg, selected, navigate]);

  // PaymentDone listener — proxy-pay không refresh myImeisAtom của B
  // (IMEI không thuộc B). Chỉ điều hướng tới success page.
  useEffect(() => {
    if (!customer) return;
    return listenPaymentEvents((result) => {
      const orderId = pendingOrderRef.current;
      if (!orderId) return;

      switch (result.resultCode) {
        case 1:
          setSelected(null);
          pendingOrderRef.current = null;
          navigate(`/orders/${orderId}/success`, { replace: true });
          break;
        case 0:
          setError("Đơn hàng đang được xử lý. Hệ thống sẽ cập nhật khi có kết quả.");
          setSubmitting(false);
          break;
        case -1:
          pendingOrderRef.current = null;
          setError(result.message ?? "Thanh toán thất bại. Vui lòng thử lại.");
          setSubmitting(false);
          break;
        case -2:
          pendingOrderRef.current = null;
          setError(null);
          setSubmitting(false);
          break;
        default:
          pendingOrderRef.current = null;
          setError(result.message ?? "Đã xảy ra lỗi, vui lòng thử lại.");
          setSubmitting(false);
      }
    });
  }, [customer, navigate, setSelected]);

  if (!customer || !imei || !pkg) {
    return (
      <Page>
        <div className="px-base py-xxl text-center text-muted">Đang tải...</div>
      </Page>
    );
  }

  const onPay = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { order_id, zmpOrderId } = await startImeiPayment({
        customer_id: customer.id,
        imei_id: imei.id,
        package_id: pkg.id,
      });

      if (!zmpOrderId) {
        // Trial bị cấm cho proxy, nên về lý thuyết không vào nhánh này.
        setSelected(null);
        navigate(`/orders/${order_id}/success`, { replace: true });
        return;
      }
      pendingOrderRef.current = order_id;
    } catch (err: any) {
      console.error("[renew-checkout] create order failed:", err);
      setError(err?.message ?? "Thanh toán thất bại. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <div className="space-y-lg pb-[calc(112px+env(safe-area-inset-bottom))]">
        <div className="rounded-md bg-brand/5 border border-brand/20 p-base text-[13px] leading-[1.43] text-ink">
          Bạn đang thanh toán hộ chủ sở hữu SIM này. Sau khi thanh toán, gói cước
          sẽ được kích hoạt cho SIM nhưng chủ sở hữu không thay đổi.
        </div>

        <Section icon={<Simcard1 size={18} variant="Linear" />} title="SIM">
          <div className="text-[14px] leading-[1.43] text-muted">Mã IMEI</div>
          <div className="text-[16px] leading-[1.25] font-semibold text-ink font-mono mt-xxs break-all">
            {imei.imei_number}
          </div>
        </Section>

        <Section icon={<Box1 size={18} variant="Linear" />} title="Gói cước">
          <div className="flex items-start justify-between gap-md">
            <div className="flex-1 min-w-0">
              <div className="text-[16px] leading-[1.25] font-semibold text-ink">
                {pkg.name}
              </div>
              <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                {pkg.duration_days === 0
                  ? "Sử dụng vĩnh viễn"
                  : `${pkg.duration_days} ngày sử dụng`}
              </div>
            </div>
            <div className="text-[16px] leading-[1.25] font-semibold text-ink">
              {formatVND(pkg.price)}
            </div>
          </div>
          <button
            onClick={() =>
              navigate(`/renew/${imei.id}?imei=${encodeURIComponent(imei.imei_number)}`)
            }
            className="mt-md text-[14px] leading-[1.43] text-ink underline"
          >
            Đổi gói khác
          </button>
        </Section>

        <Section title="Tóm tắt">
          <div className="space-y-xs text-[14px] leading-[1.43]">
            <Row label="Gói cước" value={formatVND(pkg.price)} />
            <Row label="Thuế & phí" value={formatVND(0)} />
          </div>
          <div className="mt-sm pt-sm border-t border-hairline-soft flex items-center justify-between">
            <span className="text-[16px] font-semibold text-ink">Tổng cộng</span>
            <span className="text-[20px] leading-[1.2] font-bold text-ink tracking-[-0.18px]">
              {formatVND(pkg.price)}
            </span>
          </div>
        </Section>

        {error && (
          <div className="mx-xs px-base py-sm rounded-md bg-danger/10 text-danger text-[14px] leading-[1.43]">
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <Button fullWidth onClick={onPay} disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-sm justify-center">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xử lý...
            </span>
          ) : (
            `Thanh toán · ${formatVND(pkg.price)}`
          )}
        </Button>
      </div>
    </Page>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-hairline p-base">
      <div className="flex items-center gap-sm text-ink mb-sm">
        {icon}
        <h2 className="text-[16px] leading-[1.25] font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
