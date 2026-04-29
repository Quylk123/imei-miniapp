import { Box1, Camera, ShieldTick, Watch, type Icon } from "iconsax-react";

import type { Category } from "@/types";

interface Props {
  categories: Category[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}

const iconMap: Record<string, Icon> = {
  watch: Watch,
  camera: Camera,
  shield: ShieldTick,
  package: Box1,
};

/**
 * Horizontal-scrolling category tabs (Airbnb category-strip).
 * Active = ink underline, inactive = muted label.
 */
export default function CategoryStrip({ categories, activeId, onChange }: Props) {
  const items = [{ id: null as string | null, name: "Tất cả", icon: "package" }, ...categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))];

  return (
    <div className="-mx-base overflow-x-auto no-scrollbar">
      <div className="flex gap-lg px-base py-sm min-w-max">
        {items.map((it) => {
          const isActive = activeId === it.id;
          const ItemIcon = iconMap[it.icon] ?? Box1;
          return (
            <button
              key={it.id ?? "all"}
              onClick={() => onChange(it.id)}
              className={`flex flex-col items-center gap-xs pb-xs border-b-2 transition-colors ${isActive ? "border-ink text-ink" : "border-transparent text-muted"}`}
            >
              <ItemIcon size={26} variant={isActive ? "Bold" : "Linear"} />
              <span className="text-[12px] leading-[1.25] font-medium whitespace-nowrap">
                {it.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
