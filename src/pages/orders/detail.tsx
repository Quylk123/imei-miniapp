import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import { usePageHeader } from "@/hooks/use-page-header";
import { formatVND } from "@/lib/format";
import { myOrdersAtom } from "@/state/atoms";
import type { OrderStatus } from "@/types";

const paymentLabel: Record<string, string> = {
  zalopay: "ZaloPay",
  momo: "MoMo",
  vnpay: "VNPay",
  cod: "Thanh toán khi nhận hàng",
  bank_transfer: "Chuyển khoản ngân hàng",
};

const statusLabel: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  returned: "Đã trả",
  paid: "Đã thanh toán",
  activated: "Đã kích hoạt",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

const physicalSteps: OrderStatus[] = ["pending", "confirmed", "packing", "shipping", "delivered"];
const imeiSteps: OrderStatus[] = ["pending", "paid", "activated"];

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const orders = useAtomValue(myOrdersAtom);
  const order = orders.find((o) => o.id === orderId);

  usePageHeader({ title: order ? `Đơn #${order.id}` : undefined });

  if (!order) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">Không tìm thấy đơn hàng.</div>
      </Page>
    );
  }

  const steps = order.kind === "physical" ? physicalSteps : imeiSteps;
  const currentIdx = Math.max(0, steps.indexOf(order.status));

  return (
    <Page>
      <div className="space-y-lg pb-base">
        {/* Status hero */}
        <section className="rounded-md bg-surface-soft p-base">
          <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
            Trạng thái
          </div>
          <div className="text-[22px] leading-[1.18] font-medium text-ink tracking-[-0.44px] mt-xxs">
            {statusLabel[order.status]}
          </div>

          <ol className="mt-md space-y-sm">
            {steps.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <li key={s} className="flex items-center gap-sm">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? "bg-rausch text-white" : "bg-canvas border border-hairline text-muted"}`}
                  >
                    {done ? (
                      <Icon name="check" size={14} />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-muted" />
                    )}
                  </span>
                  <span className={`text-[14px] leading-[1.43] ${done ? "text-ink font-medium" : "text-muted"}`}>
                    {statusLabel[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Items */}
        <Section
          icon={<Icon name={order.kind === "imei" ? "qr" : "bag"} size={18} />}
          title={order.kind === "imei" ? "Gói cước" : "Sản phẩm"}
        >
          <ul className="divide-y divide-hairline-soft">
            {order.items.map((it) => (
              <li key={it.id} className="py-md flex items-center gap-md">
                {it.thumbnail ? (
                  <img
                    src={it.thumbnail}
                    alt=""
                    className="w-12 h-12 rounded-sm object-cover bg-surface-strong"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-sm bg-surface-strong flex items-center justify-center text-muted">
                    <Icon name={order.kind === "imei" ? "package" : "bag"} size={18} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] leading-[1.25] font-medium text-ink line-clamp-2">
                    {it.name}
                  </div>
                  <div className="text-[13px] leading-[1.23] text-muted">SL: {it.quantity}</div>
                </div>
                <div className="text-[14px] font-semibold text-ink">
                  {formatVND(it.subtotal)}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Shipping (physical only) */}
        {order.kind === "physical" && order.shipping && (
          <Section icon={<Icon name="phone" size={18} />} title="Địa chỉ nhận hàng">
            <div className="text-[16px] leading-[1.25] font-semibold text-ink">
              {order.shipping.recipient_name} · {order.shipping.recipient_phone}
            </div>
            <div className="text-[14px] leading-[1.43] text-muted mt-xxs">
              {order.shipping.street}, {order.shipping.ward}, {order.shipping.district}, {order.shipping.province}
            </div>
          </Section>
        )}

        {/* Payment summary */}
        <Section icon={<Icon name="lock" size={18} />} title="Thanh toán">
          <Row label="Phương thức" value={paymentLabel[order.payment_method] ?? order.payment_method} />
          <Row label="Tạm tính" value={formatVND(order.subtotal)} />
          {order.shipping_fee > 0 && (
            <Row label="Phí vận chuyển" value={formatVND(order.shipping_fee)} />
          )}
          {order.discount > 0 && (
            <Row label="Giảm giá" value={`- ${formatVND(order.discount)}`} />
          )}
          <div className="mt-sm pt-sm border-t border-hairline-soft flex items-center justify-between">
            <span className="text-[16px] font-semibold text-ink">Tổng cộng</span>
            <span className="text-[20px] leading-[1.2] font-bold text-ink tracking-[-0.18px]">
              {formatVND(order.total)}
            </span>
          </div>
        </Section>

        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate("/account")}
          leftIcon={<Icon name="support" size={18} />}
        >
          Liên hệ hỗ trợ
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
    <div className="flex items-center justify-between py-xxs text-[14px] leading-[1.43]">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
