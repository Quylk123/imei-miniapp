import { useAtomValue } from "jotai";
import { matchPath, useLocation } from "react-router-dom";
import { useNavigate } from "zmp-ui";

import Icon from "@/components/ui/icon";
import { routes, type HeaderConfig } from "@/routes";
import { pageHeaderOverrideAtom } from "@/state/atoms";

// Zalo Mini App render nút native "..." × cố định ở góc trên phải.
// Header phải:
//   - Đủ cao để màu nền bao kín vùng nút (tránh nửa trên / nửa dưới khác màu).
//   - Chừa khoảng padding-right để title/right slot không đụng nút native.
const ZALO_ACTION_RESERVED = 96; // ~80–88px nút action + 8–12px gap
const HEADER_MIN_HEIGHT = 64; // chiều cao nội dung tối thiểu (px)

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
        className="absolute top-0 inset-x-0 z-30 flex items-center justify-between pl-base pb-sm"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 8px)",
          paddingRight: `${ZALO_ACTION_RESERVED}px`,
        }}
      >
        {showBack ? (
          <button
            onClick={onBack}
            aria-label="Quay lại"
            className="w-8 h-8 rounded-full bg-canvas/90 backdrop-blur flex items-center justify-center shadow-card"
          >
            <Icon name="chevron-left" size={18} />
          </button>
        ) : (
          <div className="w-8 h-8" />
        )}
        {right ?? <div className="w-8 h-8" />}
      </header>
    );
  }

  // variant: "default" — fill Rausch, text trắng
  return (
    <header
      className="sticky top-0 z-30 bg-rausch text-white"
      style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
    >
      <div
        className="flex items-center pl-base gap-sm"
        style={{
          minHeight: `${HEADER_MIN_HEIGHT}px`,
          paddingRight: `${ZALO_ACTION_RESERVED}px`,
        }}
      >
        {showBack && (
          <button
            onClick={onBack}
            aria-label="Quay lại"
            className="-ml-xs p-xs text-white"
          >
            <Icon name="chevron-left" size={20} />
          </button>
        )}
        <div className="flex-1 text-[15px] leading-[1.25] font-semibold text-white truncate">
          {title}
        </div>
        {right}
      </div>
    </header>
  );
}
