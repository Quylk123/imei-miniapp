import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import Icon from "@/components/ui/icon";

interface Props {
  title?: string;
  /** Trong suốt (overlay trên ảnh hero) */
  transparent?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}

/**
 * Mobile top bar — 56px height, back button (chevron-left) trái,
 * tiêu đề giữa, slot phải. Khi `transparent`: nút bo tròn surface-strong/85
 * nổi trên ảnh hero (kiểu Airbnb listing detail).
 */
export default function TopBar({ title, transparent, right, onBack }: Props) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  if (transparent) {
    return (
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-base pt-base pb-sm">
        <button
          onClick={handleBack}
          aria-label="Quay lại"
          className="w-9 h-9 rounded-full bg-canvas/90 backdrop-blur flex items-center justify-center shadow-card"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        {right ?? <div className="w-9 h-9" />}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-20 bg-canvas border-b border-hairline">
      <div className="h-14 flex items-center px-base gap-md">
        <button onClick={handleBack} aria-label="Quay lại" className="-ml-sm p-sm text-ink">
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="flex-1 text-[16px] leading-[1.25] font-semibold text-ink truncate">
          {title}
        </div>
        {right}
      </div>
    </header>
  );
}
