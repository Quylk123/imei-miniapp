import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import { formatVND } from "@/lib/format";
import { createIMEIOrder, fetchMyIMEIs } from "@/data/supabase";
import {
  customerAtom,
  myImeisAtom,
  packagesAtom,
  paymentMethodAtom,
  selectedPackageAtom,
} from "@/state/atoms";
import type { PaymentMethod } from "@/types";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "zalopay", label: "ZaloPay", hint: "Thanh toán nhanh trong Zalo" },
  { id: "momo", label: "MoMo", hint: "Ví điện tử MoMo" },
  { id: "vnpay", label: "VNPay", hint: "Thẻ ATM, Visa, Master" },
];

export default function ImeiCheckoutPage() {
  const { imeiId } = useParams<{ imeiId: string }>();
  const navigate = useNavigate();
  const customer = useAtomValue(customerAtom);
  const imeis = useAtomValue(myImeisAtom);
  const [selected, setSelected] = useAtom(selectedPackageAtom);
  const [paymentMethod, setPaymentMethod] = useAtom(paymentMethodAtom);
  const setMyImeis = useSetAtom(myImeisAtom);

  const allPackages = useAtomValue(packagesAtom);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!customer || !imei || !pkg) return null;

  const isFree = pkg.price === 0;

  const onPay = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createIMEIOrder({
        imei_id: imei.id,
        package_id: pkg.id,
        customer_id: customer.id,
        payment_method: isFree ? "zalopay" : paymentMethod,
      });

      // Refresh IMEI list
      const freshImeis = await fetchMyIMEIs(customer.id);
      setMyImeis(freshImeis);

      setSelected(null);
      navigate(`/orders/${result.order.id}/success`, { replace: true });
    } catch (err: any) {
      console.error("[checkout] Create order failed:", err);
      setError(err?.message ?? "Thanh toán thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <div className="space-y-lg pb-[calc(112px+env(safe-area-inset-bottom))]">
        {/* IMEI */}
        <Section icon={<Icon name="qr" size={18} />} title="IMEI">
          <div className="text-[14px] leading-[1.43] text-muted">Mã IMEI</div>
          <div className="text-[16px] leading-[1.25] font-semibold text-ink font-mono mt-xxs break-all">
            {imei.imei_number}
          </div>
        </Section>

        {/* Gói cước */}
        <Section icon={<Icon name="package" size={18} />} title="Gói cước">
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

        {/* Payment method — ẩn khi gói trial miễn phí */}
        {!isFree && (
          <Section icon={<Icon name="lock" size={18} />} title="Phương thức thanh toán">
            <ul className="space-y-sm">
              {PAYMENT_OPTIONS.map((opt) => {
                const active = opt.id === paymentMethod;
                return (
                  <li key={opt.id}>
                    <button
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`w-full flex items-start gap-md p-md rounded-md border transition-colors ${active ? "border-ink bg-surface-soft" : "border-hairline"}`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-[2px] shrink-0 ${active ? "border-rausch" : "border-hairline-strong"}`}
                      >
                        {active && (
                          <span className="w-[10px] h-[10px] rounded-full bg-rausch" />
                        )}
                      </span>
                      <div className="flex-1 text-left">
                        <div className="text-[16px] leading-[1.25] font-medium text-ink">
                          {opt.label}
                        </div>
                        <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                          {opt.hint}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

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
