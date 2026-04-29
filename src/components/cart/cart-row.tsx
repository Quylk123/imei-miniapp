import { Trash } from "iconsax-react";

import QuantityStepper from "@/components/cart/quantity-stepper";
import { formatVND } from "@/lib/format";
import type { CartItem } from "@/types";

interface Props {
  item: CartItem;
  onChangeQty: (n: number) => void;
  onRemove: () => void;
}

export default function CartRow({ item, onChangeQty, onRemove }: Props) {
  return (
    <div className="flex gap-md py-md">
      <img
        src={item.thumbnail}
        alt={item.name}
        className="w-20 h-20 rounded-md object-cover bg-surface-strong shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-sm">
          <div className="text-[16px] leading-[1.25] font-semibold text-ink line-clamp-2">
            {item.name}
          </div>
          <button
            onClick={onRemove}
            aria-label="Xóa"
            className="p-xs -mt-xs -mr-xs text-muted shrink-0"
          >
            <Trash size={18} variant="Linear" />
          </button>
        </div>
        <div className="mt-xs text-[14px] leading-[1.43] text-ink font-semibold">
          {formatVND(item.unit_price)}
        </div>
        <div className="mt-sm flex items-center justify-between">
          <QuantityStepper value={item.quantity} onChange={onChangeQty} min={1} />
          <div className="text-[14px] leading-[1.43] text-muted">
            Tạm tính:{" "}
            <span className="text-ink font-semibold">
              {formatVND(item.unit_price * item.quantity)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
