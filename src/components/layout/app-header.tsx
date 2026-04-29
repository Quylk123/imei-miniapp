import { ArrowLeft2 } from "iconsax-react";
import { useAtomValue } from "jotai";
import { matchPath, useLocation } from "react-router-dom";
import { useNavigate } from "zmp-ui";

import { routes, type HeaderConfig } from "@/routes";
import { pageHeaderOverrideAtom } from "@/state/atoms";

// Zalo Mini App render nút native "..." × cố định ở góc trên phải.
// Header phải:
//   - Đủ cao để màu nền bao kín vùng nút (tránh nửa trên / nửa dưới khác màu).
//   - Chừa khoảng padding-right để title/right slot không đụng nút native.
// app-config.json textColor.light="black" → icon native là đen, nên header nền
// trắng/sáng cho contrast tốt. Tránh fill màu đậm (vd Rausch) vì icon đen sẽ
// chìm vào nền đậm → trông xấu.
const ZALO_ACTION_RESERVED = 96; // ~80–88px nút action + 8–12px gap
// Phải đủ cao để nền header bao trọn vùng nút native Zalo (Mini App Control
// "..." ×). Nếu thấp hơn 64px, nút native sẽ lú ra ngoài nền → header trông
// vỡ nửa trên/dưới.
const HEADER_MIN_HEIGHT = 64;
// Trên Android Zalo Mini App với app-config.statusBar="transparent",
// env(safe-area-inset-top) trả về 0 (status bar overlay trên content nhưng
// browser không expose inset). Fallback 44px = chiều cao status bar tối thiểu
// đảm bảo title/back button không bị "1:47" / signal / battery đè lên. Trên
// iOS có notch, env() trả ~47px nên max() vẫn ưu tiên giá trị thực.
// Cách này khớp với pattern zmp-ui (zaui.css dùng safe-area-inset-top + 44px).
const SAFE_TOP = "max(env(safe-area-inset-top), 44px)";

const matchHeader = (pathname: string): HeaderConfig | null => {
  for (const r of routes) {
    if (matchPath({ path: r.path, end: true }, pathname)) return r.header;
  }
  return null;
};

export default function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const override = useAtomValue(pageHeaderOverrideAtom);

  const config = matchHeader(pathname);
  if (!config || config.variant === "none") return null;

  const showBack = config.back ?? true;
  const title = override.title ?? config.title;
  const right = override.right;
  // zmp-ui useNavigate đồng bộ với ZMPRouter + AnimationRoutes (back direction).
  const onBack = () => navigate(-1);

  if (config.variant === "transparent") {
    return (
      <header
        className="absolute top-0 inset-x-0 z-30 flex items-center justify-between pl-md pb-sm"
        style={{
          paddingTop: SAFE_TOP,
          paddingRight: `${ZALO_ACTION_RESERVED}px`,
        }}
      >
        {showBack ? (
          <button
            onClick={onBack}
            aria-label="Quay lại"
            className="w-10 h-10 rounded-full bg-canvas/95 backdrop-blur flex items-center justify-center shadow-card active:bg-surface-strong"
          >
            <ArrowLeft2 size={22} variant="Linear" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
        {right ?? <div className="w-10 h-10" />}
      </header>
    );
  }

  // variant: "default" — light header: nền canvas (trắng), text ink, hairline
  // bottom border. Phù hợp design Airbnb (whitespace + Rausch chỉ cho accent).
  return (
    <header
      className="sticky top-0 z-30 bg-canvas text-ink border-b border-hairline-soft"
      style={{ paddingTop: SAFE_TOP }}
    >
      <div
        className="flex items-center gap-xs"
        style={{
          minHeight: `${HEADER_MIN_HEIGHT}px`,
          paddingLeft: showBack ? "4px" : "16px",
          paddingRight: `${ZALO_ACTION_RESERVED}px`,
        }}
      >
        {showBack && (
          <button
            onClick={onBack}
            aria-label="Quay lại"
            className="w-11 h-11 flex items-center justify-center rounded-full text-ink active:bg-surface-strong transition-colors shrink-0"
          >
            <ArrowLeft2 size={24} variant="Linear" />
          </button>
        )}
        <div className="flex-1 text-[16px] leading-[1.25] font-semibold text-ink truncate">
          {title}
        </div>
        {right}
      </div>
    </header>
  );
}
