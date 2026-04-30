import type { ReactNode } from "react";

// Vùng "..." × native của Zalo Mini App nằm cố định góc trên phải. Mọi hero
// phải chừa đủ chỗ bên phải, nếu không title/action sẽ bị nút che.
// Giữ trùng giá trị với AppHeader để hành vi nhất quán giữa tab và flow page.
const ZALO_ACTION_RESERVED = 96;
// Trên Android với statusBar="transparent", env(safe-area-inset-top) = 0 nên
// nếu chỉ có fallback nhỏ (vd 12px), title sẽ bị status bar (1:47, signal,
// pin) đè lên. 32  px tương đương chiều cao status bar tối thiểu — khớp pattern
// zmp-ui Header (`safe-area-inset-top + 32 px`). iOS notch tự override qua env().
const SAFE_TOP = "max(env(safe-area-inset-top), 32px)";

interface Props {
  /** Hàng tiêu đề lớn — display-lg (22px/500). Để trống nếu hero chỉ chứa custom children. */
  title?: ReactNode;
  /** Dòng phụ dưới title — caption muted. */
  subtitle?: ReactNode;
  /** Slot phải, cùng hàng với title (vd avatar nhỏ, link "Xem tất cả"). */
  trailing?: ReactNode;
  /** Hàng dưới title (search pill, filter chips…). */
  children?: ReactNode;
  /** Loại bỏ padding bottom mặc định (12px) — dùng khi hero liền mạch với content. */
  flush?: boolean;
}

/**
 * Hero zone cho tab page (Home / My IMEI / Cart / Orders / Account).
 *
 * Khác AppHeader ở chỗ:
 *   - Không sticky → cuộn cùng content, cảm giác thoáng kiểu Airbnb.
 *   - Title lớn (display-lg) thay vì 16px của header flow.
 *   - Vẫn chừa 96px bên phải cho nút Zalo native (cùng giá trị AppHeader).
 *
 * Nền canvas (trắng) khớp với app-config textColor.light="black" → icon "..."
 * × native là đen trên trắng, contrast tốt.
 */
export default function PageHero({ title, subtitle, trailing, children, flush }: Props) {
  return (
    <header
      className="bg-canvas"
      style={{
        paddingTop: SAFE_TOP,
        paddingRight: `${ZALO_ACTION_RESERVED}px`,
        paddingLeft: 16,
        paddingBottom: flush ? 0 : 12,
      }}
    >
      {(title || trailing) && (
        // minHeight 44 chỉ áp khi có trailing (đảm bảo hit-target cho avatar/
        // action button cùng hàng). Khi chỉ có title, để chiều cao tự nhiên
        // theo line-height — tránh gap thừa giữa title và subtitle.
        <div
          className="flex items-center gap-sm"
          style={trailing ? { minHeight: 44 } : undefined}
        >
          {title && (
            <h1 className="flex-1 min-w-0 text-[22px] leading-[1.18] font-semibold text-ink tracking-[-0.32px] truncate">
              {title}
            </h1>
          )}
          {trailing && <div className="shrink-0">{trailing}</div>}
        </div>
      )}
      {subtitle && (
        <p className="mt-xxs text-[14px] leading-[1.43] text-muted">
          {subtitle}
        </p>
      )}
      {children && <div className={title || subtitle ? "mt-base" : ""}>{children}</div>}
    </header>
  );
}
