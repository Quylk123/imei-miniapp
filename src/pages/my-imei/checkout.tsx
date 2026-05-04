import { Box1, ScanBarcode } from "iconsax-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { formatVND } from "@/lib/format";
import { fetchMyIMEIs } from "@/data/supabase";
import { listenPaymentEvents, startImeiPayment } from "@/services/payment";
import {
  customerAtom,
  myImeisAtom,
  packagesAtom,
  selectedPackageAtom,
} from "@/state/atoms";

export default function ImeiCheckoutPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const navigate = useNavigate();
  const customer = useAtomValue(customerAtom);
  const imeis = useAtomValue(myImeisAtom);
  const [selected, setSelected] = useAtom(selectedPackageAtom);
  const setMyImeis = useSetAtom(myImeisAtom);

  const allPackages = useAtomValue(packagesAtom);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingOrderRef = useRef<number | null>(null);

  const imei = imeis.find((i) => i.id === imeiId);
  const pkg = allPackages.find((p) => p.id === selected?.packageId);

  // Guards: thiếu auth, IMEI, hoặc gói → đưa về flow phù hợp
  useEffect(() => {
    if (!customer || !imei) {
      navigate("/my-imei", { replace: true });
      return;
    }
    if (!pkg || selected?.imeiId !== imei.id) {
      navigate(`/my-imei/${imei.id}/packages`, { replace: true });
    }
  }, [customer, imei, pkg, selected, navigate]);

  // Lắng nghe PaymentDone/PaymentClose từ Zalo Checkout SDK
  useEffect(() => {
    if (!customer) return;
    return listenPaymentEvents(async (result) => {
      const orderId = pendingOrderRef.current;
      if (!orderId) return;

      switch (result.resultCode) {
        case 1: {
          // Webhook đã update DB; refresh để có IMEI mới-activated
          const fresh = await fetchMyIMEIs(customer.id);
          setMyImeis(fresh);
          setSelected(null);
          pendingOrderRef.current = null;
          navigate(`/orders/${orderId}/success`, { replace: true });
          break;
        }
        case 0:
          // Giao dịch đang xử lý — không reset ref để tránh retry trùng
          setError("Đơn hàng đang được xử lý. Hệ thống sẽ cập nhật khi có kết quả.");
          setSubmitting(false);
          break;
        case -1:
          // Thanh toán thất bại — reset ref, lần gọi tiếp backend sẽ tự cancel order cũ
          pendingOrderRef.current = null;
          setError(result.message ?? "Thanh toán thất bại. Vui lòng thử lại.");
          setSubmitting(false);
          break;
        case -2:
          // User thoát SDK không chọn phương thức — reset ref để cho phép retry
          // Lần gọi tiếp, backend sẽ tự cancel order 'pending' cũ này
          pendingOrderRef.current = null;
          setError(null); // Không hiển lỗi — đây là hành động chủ động của user
          setSubmitting(false);
          break;
        default:
          pendingOrderRef.current = null;
          setError(result.message ?? "Đã xảy ra lỗi, vui lòng thử lại.");
          setSubmitting(false);
      }
    });
  }, [customer, navigate, setMyImeis, setSelected]);

  if (!customer || !imei || !pkg) return null;

  const isFree = pkg.price === 0;

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
        // Trial → server đã auto-activate, đi thẳng tới success
        const fresh = await fetchMyIMEIs(customer.id);
        setMyImeis(fresh);
        setSelected(null);
        navigate(`/orders/${order_id}/success`, { replace: true });
        return;
      }

      // Trả phí → chờ PaymentDone listener xử lý
      pendingOrderRef.current = order_id;
    } catch (err: any) {
      console.error("[checkout] Create order failed:", err);
      setError(err?.message ?? "Thanh toán thất bại. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <div className="space-y-lg pb-[calc(112px+env(safe-area-inset-bottom))]">
        {/* IMEI */}
        <Section icon={<ScanBarcode size={18} variant="Linear" />} title="IMEI">
          <div className="text-[14px] leading-[1.43] text-muted">Mã IMEI</div>
          <div className="text-[16px] leading-[1.25] font-semibold text-ink font-mono mt-xxs break-all">
            {imei.imei_number}
          </div>
        </Section>

        {/* Gói cước */}
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
              {isFree ? "Miễn phí" : formatVND(pkg.price)}
            </div>
          </div>
          <button
            onClick={() => navigate(`/my-imei/${imei.id}/packages`)}
            className="mt-md text-[14px] leading-[1.43] text-ink underline"
          >
            Đổi gói khác
          </button>
        </Section>

        {/* Tóm tắt */}
        <Section title="Tóm tắt">
          <div className="space-y-xs text-[14px] leading-[1.43]">
            <Row label="Gói cước" value={isFree ? "Miễn phí" : formatVND(pkg.price)} />
            <Row label="Thuế & phí" value={formatVND(0)} />
          </div>
          <div className="mt-sm pt-sm border-t border-hairline-soft flex items-center justify-between">
            <span className="text-[16px] font-semibold text-ink">Tổng cộng</span>
            <span className="text-[20px] leading-[1.2] font-bold text-ink tracking-[-0.18px]">
              {isFree ? "Miễn phí" : formatVND(pkg.price)}
            </span>
          </div>
        </Section>

        <p className="text-[13px] leading-[1.23] text-muted px-xs">
          Bằng việc nhấn "Thanh toán", bạn đồng ý với điều khoản dịch vụ và chính sách
          gia hạn gói cước.
        </p>

        {/* Error message */}
        {error && (
          <div className="mx-xs px-base py-sm rounded-md bg-danger/10 text-danger text-[14px] leading-[1.43]">
            {error}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <Button fullWidth onClick={onPay} disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-sm justify-center">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xử lý...
            </span>
          ) : isFree ? (
            "Kích hoạt gói dùng thử"
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
