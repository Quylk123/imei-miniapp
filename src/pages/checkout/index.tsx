import { Bag2, Call } from "iconsax-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { formatVND } from "@/lib/format";
import { listenPaymentEvents, startPhysicalPayment } from "@/services/payment";
import {
  cartAtom,
  cartSubtotalAtom,
  clearCartAtom,
  customerAtom,
  shippingDraftAtom,
} from "@/state/atoms";

const SHIPPING_FEE = 30000;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const customer = useAtomValue(customerAtom);
  const cart = useAtomValue(cartAtom);
  const subtotal = useAtomValue(cartSubtotalAtom);
  const [shipping] = useAtom(shippingDraftAtom);
  const clearCart = useSetAtom(clearCartAtom);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingOrderRef = useRef<number | null>(null);

  const total = subtotal + SHIPPING_FEE;

  useEffect(() => {
    if (!customer || cart.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [customer, cart.length, navigate]);

  // Lắng nghe PaymentDone/PaymentClose
  useEffect(() => {
    if (!customer) return;
    return listenPaymentEvents((result) => {
      const orderId = pendingOrderRef.current;
      if (!orderId) return;

      switch (result.resultCode) {
        case 1:
          clearCart();
          pendingOrderRef.current = null;
          navigate(`/orders/${orderId}/success`, { replace: true });
          break;
        case 0:
          setError("Giao dịch đang xử lý. Hệ thống sẽ cập nhật khi có kết quả.");
          setSubmitting(false);
          break;
        case -1:
          setError(result.message ?? "Thanh toán thất bại. Vui lòng thử lại.");
          setSubmitting(false);
          break;
        case -2:
          setError("Bạn đã hủy thanh toán.");
          setSubmitting(false);
          break;
        default:
          setError(result.message ?? "Đã xảy ra lỗi, vui lòng thử lại.");
          setSubmitting(false);
      }
    });
  }, [customer, clearCart, navigate]);

  if (!customer || cart.length === 0) return null;

  const onPlaceOrder = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { order_id } = await startPhysicalPayment({
        customer_id: customer.id,
        items: cart.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
        shipping_address: shipping,
        shipping_fee: SHIPPING_FEE,
      });

      pendingOrderRef.current = order_id;
    } catch (err: any) {
      console.error("[checkout] startPhysicalPayment failed:", err);
      setError(err?.message ?? "Tạo đơn thất bại. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <div className="space-y-lg">
        {/* Địa chỉ nhận */}
        <Section
          icon={<Call size={18} variant="Linear" />}
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
        <Section icon={<Bag2 size={18} variant="Linear" />} title={`Sản phẩm (${cart.length})`}>
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

        {error && (
          <div className="mx-xs px-base py-sm rounded-md bg-danger/10 text-danger text-[14px] leading-[1.43]">
            {error}
          </div>
        )}
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
          <Button onClick={onPlaceOrder} className="flex-[1.6]" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-sm justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              "Đặt hàng"
            )}
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
