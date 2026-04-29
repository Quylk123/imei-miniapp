import { CloseSquare, SearchNormal1 } from "iconsax-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Pill-shaped search input — `rounded.full`, hairline border, 48px height.
 * Mirrors Airbnb's collapsed mobile search bar.
 */
export default function SearchPill({ value, onChange, placeholder = "Tìm thiết bị, gói cước..." }: Props) {
  return (
    <div className="flex items-center h-12 px-base rounded-full bg-canvas border border-hairline shadow-card">
      <SearchNormal1 size={18} variant="Linear" className="text-ink shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 ml-sm bg-transparent outline-none text-[14px] leading-[1.43] text-ink placeholder:text-muted"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Xóa"
          className="ml-sm text-muted shrink-0"
        >
          <CloseSquare size={18} variant="Linear" />
        </button>
      )}
    </div>
  );
}
