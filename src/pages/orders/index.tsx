import { Receipt2 } from "iconsax-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import EmptyState from "@/components/common/empty-state";
import PageHero from "@/components/layout/page-hero";
import OrderRow from "@/components/orders/order-row";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { myOrdersAtom, refreshCustomerDataAtom } from "@/state/atoms";

type Filter = "physical" | "imei";

const filters: { id: Filter; label: string }[] = [
  { id: "physical", label: "Lịch sử đơn hàng" },
  { id: "imei", label: "Thanh toán gói cước" },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const orders = useAtomValue(myOrdersAtom);
  const refresh = useSetAtom(refreshCustomerDataAtom);
  const [filter, setFilter] = useState<Filter>("physical");

  // Refresh mỗi khi user navigate vào trang này
  useEffect(() => { refresh(); }, [refresh]);

  const visible = orders.filter((o) => o.kind === filter);

  return (
    <Page
      hero={
        <PageHero
          title="Đơn hàng"
          subtitle={orders.length > 0 ? `${orders.length} đơn` : undefined}
        />
      }
    >
      {/* Tabs canh giữa — nằm ngoài PageHero để tránh padding bất đối xứng */}
      <div className="flex justify-center border-b border-hairline-soft -mx-xs px-xs mb-lg">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={[
                "relative px-lg pb-sm pt-xs text-[15px] leading-[1.25] font-semibold transition-colors",
                active ? "text-ink" : "text-muted",
              ].join(" ")}
            >
              {f.label}
              {/* Underline indicator — product-tab-active pattern */}
              <span
                className={[
                  "absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-ink transition-all duration-200",
                  active ? "w-4/5 opacity-100" : "w-0 opacity-0",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>

      <div>
        {visible.length === 0 ? (
          <EmptyState
            icon={<Receipt2 size={48} variant="Linear" />}
            title={
              filter === "physical"
                ? "Chưa có đơn sản phẩm"
                : "Chưa có đơn gói cước"
            }
            description={
              filter === "physical"
                ? "Mua sản phẩm để xem đơn hàng tại đây."
                : "Kích hoạt gói cước IMEI để xem đơn tại đây."
            }
            action={
              <Button onClick={() => navigate("/")} >
                {filter === "physical" ? "Khám phá sản phẩm" : "IMEI của tôi"}
              </Button>
            }
          />
        ) : (
          <div className="space-y-md">
            {visible.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
