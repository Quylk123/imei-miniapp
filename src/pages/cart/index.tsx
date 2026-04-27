import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";

import CartRow from "@/components/cart/cart-row";
import EmptyState from "@/components/common/empty-state";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import TopBar from "@/components/ui/top-bar";
import { formatVND } from "@/lib/format";
import {
  cartAtom,
  cartSubtotalAtom,
  customerAtom,
  removeFromCartAtom,
  updateCartQtyAtom,
} from "@/state/atoms";

export default function CartPage() {
  const navigate = useNavigate();
  const [cart] = useAtom(cartAtom);
  const subtotal = useAtomValue(cartSubtotalAtom);
  const updateQty = useSetAtom(updateCartQtyAtom);
  const remove = useSetAtom(removeFromCartAtom);
  const customer = useAtomValue(customerAtom);

  const SHIPPING_FEE = cart.length > 0 ? 30000 : 0;
  const total = subtotal + SHIPPING_FEE;

  const onCheckout = () => {
    if (!customer) {
      navigate("/auth", {
        state: {
          redirectTo: "/checkout",
          reason: "Đăng ký để xác nhận thông tin nhận hàng và thanh toán.",
        },
      });
      return;
    }
    navigate("/checkout");
  };

  if (cart.length === 0) {
    return (
      <Page noPadding>
        <TopBar title="Giỏ hàng" />
        <div className="px-base">
          <EmptyState
            icon={<Icon name="bag" size={48} />}
            title="Giỏ hàng trống"
            description="Khám phá các thiết bị và gói cước phù hợp ở Trang chủ."
            action={
              <Button onClick={() => navigate("/")}>Tiếp tục mua sắm</Button>
            }
          />
        </div>
      </Page>
    );
  }

  return (
    <Page noPadding>
      <TopBar title={`Giỏ hàng (${cart.length})`} />

      <div className="px-base divide-y divide-hairline-soft">
        {cart.map((item) => (
          <CartRow
            key={item.product_id}
            item={item}
            onChangeQty={(q) => updateQty({ product_id: item.product_id, quantity: q })}
            onRemove={() => remove(item.product_id)}
          />
        ))}
      </div>

      <section className="mt-base mx-base p-base rounded-md border border-hairline">
        <div className="text-[16px] leading-[1.25] font-semibold text-ink mb-sm">
          Tóm tắt đơn hàng
        </div>
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
      </section>

      <div className="px-base pt-lg pb-[calc(96px+env(safe-area-inset-bottom))]">
        <Button fullWidth onClick={onCheckout}>
          Thanh toán · {formatVND(total)}
        </Button>
        {!customer && (
          <p className="mt-sm text-center text-[13px] leading-[1.23] text-muted">
            Bạn cần đăng ký thành viên trước khi thanh toán.
          </p>
        )}
      </div>
    </Page>
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
