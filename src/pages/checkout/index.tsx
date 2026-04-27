import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import TopBar from "@/components/ui/top-bar";
import { formatVND } from "@/lib/format";
import {
  cartAtom,
  cartSubtotalAtom,
  clearCartAtom,
  customerAtom,
  paymentMethodAtom,
  shippingDraftAtom,
} from "@/state/atoms";
import type { PaymentMethod } from "@/types";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "zalopay", label: "ZaloPay", hint: "Thanh toán nhanh trong Zalo" },
  { id: "momo", label: "MoMo", hint: "Ví điện tử MoMo" },
  { id: "vnpay", label: "VNPay", hint: "Thẻ ATM, Visa, Master" },
  { id: "cod", label: "Thanh toán khi nhận hàng (COD)", hint: "Trả tiền mặt cho shipper" },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const customer = useAtomValue(customerAtom);
  const cart = useAtomValue(cartAtom);
  const subtotal = useAtomValue(cartSubtotalAtom);
  const [shipping] = useAtom(shippingDraftAtom);
  const [paymentMethod, setPaymentMethod] = useAtom(paymentMethodAtom);
  const clearCart = useSetAtom(clearCartAtom);

  const SHIPPING_FEE = 30000;
  const total = subtotal + SHIPPING_FEE;

  if (!customer || cart.length === 0) {
    // Guard: nếu chưa auth hoặc cart trống, đẩy về cart
    navigate("/cart", { replace: true });
    return null;
  }

  const onPlaceOrder = () => {
    // UI-only: giả lập payment thành công
    const orderId = `o${Date.now()}`;
    clearCart();
    navigate(`/orders/${orderId}/success`, { replace: true });
  };

  return (
    <Page noPadding>
      <TopBar title="Thanh toán" />

      <div className="px-base pt-base space-y-lg">
        {/* Địa chỉ nhận */}
        <Section
          icon={<Icon name="phone" size={18} />}
          title="Địa chỉ nhận hàng"
          action={<button className="text-[14px] text-ink underline">Sửa</button>}
        >
          <div className="text-[16px] leading-[1.25] font-semibold text-ink">
            {shipping.recipient_name} · {shipping.recipient_phone}
          </div>
          <div className="text-[14px] leading-[1.43] text-muted mt-xxs">
            {shipping.street}, {shipping.ward}, {shipping.district}, {shipping.province}
          </div>
        </Section>

        {/* Sản phẩm */}
        <Section icon={<Icon name="bag" size={18} />} title={`Sản phẩm (${cart.length})`}>
          <ul className="divide-y divide-hairline-soft">
            {cart.map((it) => (
              <li key={it.product_id} className="py-sm flex items-center gap-md">
                <img
                  src={it.thumbnail}
                  className="w-12 h-12 rounded-sm object-cover bg-surface-strong"
                  alt={it.name}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] leading-[1.25] font-medium text-ink line-clamp-1">
                    {it.name}
                  </div>
                  <div className="text-[13px] leading-[1.23] text-muted">
                    SL: {it.quantity}
                  </div>
                </div>
                <div className="text-[14px] font-semibold text-ink">
                  {formatVND(it.unit_price * it.quantity)}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Phương thức thanh toán */}
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
                      {active && <span className="w-[10px] h-[10px] rounded-full bg-rausch" />}
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

        {/* Tóm tắt */}
        <Section title="Tóm tắt">
          <div className="space-y-xs text-[14px] leading-[1.43]">
            <Row label="Tạm tính" value={formatVND(subtotal)} />
            <Row label="Phí vận chuyển" value={formatVND(SHIPPING_FEE)} />
          </div>
          <div className="mt-sm pt-sm border-t border-hairline-soft flex items-center justify-between">
            <span className="text-[16px] font-semibold text-ink">Tổng cộng</span>
            <span className="text-[20px] leading-[1.2] font-bold text-ink tracking-[-0.18px]">
              {formatVND(total)}
            </span>
          </div>
        </Section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <div className="flex items-center gap-md">
          <div className="flex-1">
            <div className="text-[12px] leading-[1.18] text-muted">Tổng cộng</div>
            <div className="text-[18px] leading-[1.25] font-bold text-ink">
              {formatVND(total)}
            </div>
          </div>
          <Button onClick={onPlaceOrder} className="flex-[1.6]">
            Đặt hàng
          </Button>
        </div>
      </div>
    </Page>
  );
}

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-hairline p-base">
      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm text-ink">
          {icon}
          <h2 className="text-[16px] leading-[1.25] font-semibold">{title}</h2>
        </div>
        {action}
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
