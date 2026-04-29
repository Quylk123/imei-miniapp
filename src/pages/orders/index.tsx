import { Receipt2 } from "iconsax-react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import EmptyState from "@/components/common/empty-state";
import PageHero from "@/components/layout/page-hero";
import OrderRow from "@/components/orders/order-row";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { myOrdersAtom } from "@/state/atoms";

type Filter = "all" | "physical" | "imei";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "physical", label: "Sản phẩm" },
  { id: "imei", label: "Gói cước" },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const orders = useAtomValue(myOrdersAtom);
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.kind === filter);

  return (
    <Page
      hero={
        <PageHero
          title="Đơn hàng"
          subtitle={orders.length > 0 ? `${orders.length} đơn` : undefined}
        >
          <div className="-mx-base overflow-x-auto no-scrollbar">
            <div className="flex gap-sm px-base">
              {filters.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`h-9 px-md rounded-full text-[14px] leading-[1.29] font-medium transition-colors whitespace-nowrap ${active ? "bg-ink text-white" : "bg-surface-strong text-ink"}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </PageHero>
      }
    >
      <div>
        {visible.length === 0 ? (
          <EmptyState
            icon={<Receipt2 size={48} variant="Linear" />}
            title="Chưa có đơn hàng"
            description="Mua sản phẩm hoặc kích hoạt gói cước để xem đơn hàng tại đây."
            action={
              <Button onClick={() => navigate("/")}>Khám phá sản phẩm</Button>
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
