import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import TopBar from "@/components/ui/top-bar";
import { formatVND } from "@/lib/format";
import { packages, products } from "@/mocks";
import {
  customerAtom,
  myImeisAtom,
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

  const imei = imeis.find((i) => i.id === imeiId);
  const pkg = packages.find((p) => p.id === selected?.packageId);
  const product = imei && products.find((p) => p.id === imei.product_id);

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

  const onPay = () => {
    const orderId = `o${Date.now()}`;
    setSelected(null);
    navigate(`/orders/${orderId}/success`, { replace: true });
  };

  return (
    <Page noPadding>
      <TopBar title="Xác nhận thanh toán" />

      <div className="px-base pt-base space-y-lg pb-[calc(112px+env(safe-area-inset-bottom))]">
        {/* Thiết bị */}
        <Section icon={<Icon name="qr" size={18} />} title="Thiết bị">
          <div className="flex items-center gap-md">
            {product?.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-12 h-12 rounded-sm object-cover bg-surface-strong"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] leading-[1.25] font-medium text-ink line-clamp-1">
                {product?.name ?? "Thiết bị IMEI"}
              </div>
              <div className="text-[13px] leading-[1.23] text-muted">
                IMEI ···{imei.imei_number.slice(-4)}
              </div>
            </div>
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
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <Button fullWidth onClick={onPay}>
          {isFree ? "Kích hoạt gói dùng thử" : `Thanh toán · ${formatVND(pkg.price)}`}
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
