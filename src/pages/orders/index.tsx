import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import EmptyState from "@/components/common/empty-state";
import OrderRow from "@/components/orders/order-row";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
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
    <Page>
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

      <div className="mt-base">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon name="receipt" size={48} />}
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
