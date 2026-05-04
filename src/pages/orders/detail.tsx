import {
  Bag2,
  Box1,
  Call,
  Headphone,
  Lock,
  ScanBarcode,
  TickSquare,
} from "iconsax-react";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { usePageHeader } from "@/hooks/use-page-header";
import { formatVND, formatDateTime } from "@/lib/format";
import { myOrdersAtom, packagesAtom } from "@/state/atoms";
import type { OrderStatus } from "@/types";

const PAYMENT_ICONS: Record<string, string> = {
  zalopay: "https://rblawnlhkgwmdbstkhxp.supabase.co/storage/v1/object/public/PublicImage/zalopay.png",
  momo: "https://rblawnlhkgwmdbstkhxp.supabase.co/storage/v1/object/public/PublicImage/momo.png",
  vnpay: "https://rblawnlhkgwmdbstkhxp.supabase.co/storage/v1/object/public/PublicImage/vnpay.png",
};

const PAYMENT_LABEL: Record<string, string> = {
  zalopay: "ZaloPay",
  momo: "MoMo",
  vnpay: "VNPay",
  cod: "Thanh toán khi nhận hàng",
  bank_transfer: "Chuyển khoản ngân hàng",
};

function PaymentMethodCell({ method }: { method: string | null | undefined }) {
  if (!method || !PAYMENT_LABEL[method]) {
    return (
      <span className="text-[14px] leading-[1.43] text-muted italic">
        Chưa chọn phương thức
      </span>
    );
  }
  return (
    <span className="flex items-center gap-sm">
      {PAYMENT_ICONS[method] && (
        <img
          src={PAYMENT_ICONS[method]}
          alt={method}
          className="h-5 w-auto object-contain rounded-xs"
        />
      )}
      <span className="text-[14px] leading-[1.43] text-ink">
        {PAYMENT_LABEL[method]}
      </span>
    </span>
  );
}

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

// IMEI orders chỉ có 2 trạng thái hiển thị cho user
const imeiSteps: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Chờ kích hoạt" },
  { status: "activated", label: "Đã kích hoạt" },
];

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const orders = useAtomValue(myOrdersAtom);
  const allPackages = useAtomValue(packagesAtom);
  const numericOrderId = Number(orderId);
  const order = Number.isFinite(numericOrderId)
    ? orders.find((o) => o.id === numericOrderId)
    : undefined;

  usePageHeader({ title: order ? `Đơn #${order.id}` : undefined });

  if (!order) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">Không tìm thấy đơn hàng.</div>
      </Page>
    );
  }

  // Steps: physical dùng array string, imei dùng object {status, label}
  const physicalSteps: { status: OrderStatus; label: string }[] = [
    { status: "pending", label: "Chờ xác nhận" },
    { status: "confirmed", label: "Đã xác nhận" },
    { status: "packing", label: "Đang đóng gói" },
    { status: "shipping", label: "Đang giao" },
    { status: "delivered", label: "Đã giao" },
  ];
  const steps = order.kind === "physical" ? physicalSteps : imeiSteps;
  const currentIdx = Math.max(0, steps.findIndex((s) => s.status === order.status));

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
            {steps.map((step, i) => {
              const done = i <= currentIdx;
              return (
                <li key={step.status} className="flex items-center gap-sm">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? "bg-rausch text-white" : "bg-canvas border border-hairline text-muted"}`}
                  >
                    {done ? (
                      <TickSquare size={14} variant="Bold" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-muted" />
                    )}
                  </span>
                  <span className={`text-[14px] leading-[1.43] ${done ? "text-ink font-medium" : "text-muted"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Items */}
        <Section
          icon={
            order.kind === "imei" ? (
              <ScanBarcode size={18} variant="Linear" />
            ) : (
              <Bag2 size={18} variant="Linear" />
            )
          }
          title={order.kind === "imei" ? "Gói cước" : "Sản phẩm"}
        >
          <ul className="divide-y divide-hairline-soft">
            {order.items.map((it) => {
              // Lấy description gói từ packagesAtom (chỉ với IMEI order)
              const pkg = it.package_id
                ? allPackages.find((p) => p.id === it.package_id)
                : undefined;
              return (
                <li key={it.id} className="py-md flex items-center gap-md">
                  {it.thumbnail ? (
                    <img
                      src={it.thumbnail}
                      alt=""
                      className="w-12 h-12 rounded-sm object-cover bg-surface-strong"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-sm bg-surface-strong flex items-center justify-center text-muted">
                      {order.kind === "imei" ? (
                        <Box1 size={18} variant="Linear" />
                      ) : (
                        <Bag2 size={18} variant="Linear" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] leading-[1.25] font-medium text-ink line-clamp-2">
                      {it.name}
                    </div>
                    {order.kind === "imei" ? (
                      // Gói cước: hiển thị mô tả gói, không hiển SL
                      pkg?.description && (
                        <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                          {pkg.description}
                        </div>
                      )
                    ) : (
                      // Sản phẩm vật lý: hiển SL
                      <div className="text-[13px] leading-[1.23] text-muted">SL: {it.quantity}</div>
                    )}
                  </div>
                  <div className="text-[14px] font-semibold text-ink">
                    {formatVND(it.subtotal)}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Shipping (physical only) */}
        {order.kind === "physical" && order.shipping && (
          <Section icon={<Call size={18} variant="Linear" />} title="Địa chỉ nhận hàng">
            <div className="text-[16px] leading-[1.25] font-semibold text-ink">
              {order.shipping.recipient_name} · {order.shipping.recipient_phone}
            </div>
            <div className="text-[14px] leading-[1.43] text-muted mt-xxs">
              {order.shipping.street}, {order.shipping.ward}, {order.shipping.district}, {order.shipping.province}
            </div>
          </Section>
        )}

        {/* Payment summary */}
        <Section icon={<Lock size={18} variant="Linear" />} title="Thanh toán">
          <div className="flex items-center justify-between py-xxs text-[14px] leading-[1.43]">
            <span className="text-muted">Phương thức</span>
            <PaymentMethodCell method={order.payment_method} />
          </div>
          <Row label="Ngày đặt" value={formatDateTime(order.created_at) ?? ""} />
          {order.paid_at && (
            <Row label="Thời gian thanh toán" value={formatDateTime(order.paid_at) ?? ""} />
          )}
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
          leftIcon={<Headphone size={18} variant="Linear" />}
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
