import Icon from "@/components/ui/icon";
import { formatVND } from "@/lib/format";
import type { Package } from "@/types";

interface Props {
  pkg: Package;
  selected: boolean;
  recommended?: boolean;
  onSelect: () => void;
}

const typeLabel: Record<Package["type"], string> = {
  trial: "Dùng thử",
  renewal: "Gia hạn",
  lifetime: "Trọn đời",
};

export default function PackageCard({ pkg, selected, recommended, onSelect }: Props) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-base rounded-md border transition-colors ${selected ? "border-rausch bg-rausch/5" : "border-hairline"}`}
    >
      <div className="flex items-start justify-between gap-md">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sm flex-wrap">
            <span className="text-[16px] leading-[1.25] font-semibold text-ink">
              {pkg.name}
            </span>
            <span className="text-[11px] leading-[1.18] font-semibold text-muted bg-surface-strong rounded-full px-[10px] py-[2px]">
              {typeLabel[pkg.type]}
            </span>
            {recommended && (
              <span className="text-[11px] leading-[1.18] font-semibold text-white bg-rausch rounded-full px-[10px] py-[2px]">
                Phổ biến
              </span>
            )}
          </div>
          <p className="text-[13px] leading-[1.23] text-muted mt-xxs">{pkg.description}</p>
        </div>
        <span
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-[2px] shrink-0 ${selected ? "border-rausch bg-rausch text-white" : "border-hairline-strong"}`}
        >
          {selected && <Icon name="check" size={12} />}
        </span>
      </div>

      <div className="mt-sm flex items-end justify-between">
        <div className="text-[13px] leading-[1.23] text-muted">
          {pkg.duration_days === 0
            ? "Sử dụng vĩnh viễn"
            : `${pkg.duration_days} ngày sử dụng`}
        </div>
        <div className="text-[20px] leading-[1.2] font-bold text-ink tracking-[-0.18px]">
          {pkg.price === 0 ? "Miễn phí" : formatVND(pkg.price)}
        </div>
      </div>
    </button>
  );
}
