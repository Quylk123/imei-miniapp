import { Box1, type Icon } from "iconsax-react";

import type { Category } from "@/types";

interface Props {
  categories: Category[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}

/**
 * Horizontal-scrolling category tabs (Airbnb category-strip).
 * Shows category image when available, falls back to icon.
 * Active = ink underline, inactive = muted label.
 */
export default function CategoryStrip({ categories, activeId, onChange }: Props) {
  const items: { id: string | null; name: string; image_url?: string }[] = [
    { id: null, name: "Tất cả" },
    ...categories.map(c => ({ id: c.id, name: c.name, image_url: c.image_url })),
  ];

  return (
    <div className="-mx-base overflow-x-auto no-scrollbar">
      <div className="flex gap-lg px-base py-sm min-w-max">
        {items.map((it) => {
          const isActive = activeId === it.id;
          return (
            <button
              key={it.id ?? "all"}
              onClick={() => onChange(it.id)}
              className={`flex flex-col items-center gap-xs pb-xs border-b-2 transition-colors ${isActive ? "border-ink text-ink" : "border-transparent text-muted"}`}
            >
              {it.image_url ? (
                <div className="w-[26px] h-[26px] rounded-md overflow-hidden flex items-center justify-center">
                  <img
                    src={it.image_url}
                    alt={it.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <Box1 size={26} variant={isActive ? "Bold" : "Linear"} />
              )}
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
