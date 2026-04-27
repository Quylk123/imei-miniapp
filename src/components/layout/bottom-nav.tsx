import { useAtomValue } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";

import Icon, { type IconName } from "@/components/ui/icon";
import { cartCountAtom, customerAtom } from "@/state/atoms";

interface Tab {
  key: string;
  label: string;
  icon: IconName;
  path: string;
  auth?: boolean;
}

const tabs: Tab[] = [
  { key: "home", label: "Trang chủ", icon: "home", path: "/" },
  { key: "imei", label: "IMEI của tôi", icon: "qr", path: "/my-imei", auth: true },
  { key: "cart", label: "Giỏ hàng", icon: "bag", path: "/cart" },
  { key: "orders", label: "Đơn hàng", icon: "receipt", path: "/orders", auth: true },
  { key: "account", label: "Tài khoản", icon: "user", path: "/account" },
];

const matchTab = (pathname: string): string => {
  if (pathname === "/") return "home";
  if (pathname === "/my-imei") return "imei";
  if (pathname === "/cart") return "cart";
  if (pathname === "/orders") return "orders";
  if (pathname === "/account") return "account";
  return "";
};

/** Chỉ hiện BottomNav ở 5 trang tab chính. Các trang flow ẩn để CTA sticky không bị che. */
const isTabRoute = (pathname: string) =>
  ["/", "/my-imei", "/cart", "/orders", "/account"].includes(pathname);

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const cartCount = useAtomValue(cartCountAtom);
  const customer = useAtomValue(customerAtom);

  const active = matchTab(pathname);

  if (!isTabRoute(pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-canvas border-t border-hairline pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Điều hướng chính"
    >
      <ul className="flex items-stretch h-[64px]">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const onTap = () => {
            if (tab.auth && !customer) {
              navigate("/auth", {
                state: {
                  redirectTo: tab.path,
                  reason: `Đăng ký để xem ${tab.label.toLowerCase()} của bạn.`,
                },
              });
              return;
            }
            navigate(tab.path);
          };
          return (
            <li key={tab.key} className="flex-1">
              <button
                onClick={onTap}
                aria-current={isActive ? "page" : undefined}
                className={`w-full h-full flex flex-col items-center justify-center gap-[2px] ${
                  isActive ? "text-rausch" : "text-muted"
                }`}
              >
                <span className="relative inline-flex">
                  <Icon name={tab.icon} size={22} />
                  {tab.key === "cart" && cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rausch text-white text-[10px] leading-[18px] text-center font-semibold">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-[1.18] font-semibold">
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
