import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { getSystemInfo } from "zmp-sdk";
import { events, EventName } from "zmp-sdk/apis";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
  useNavigate,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";

import AppHeader from "@/components/layout/app-header";
import BottomNav from "@/components/layout/bottom-nav";
import { routes } from "@/routes";
import { autoLoginAtom, loadCatalogAtom } from "@/state/atoms";
import { setStoredReferrerPhone } from "@/services/zalo-auth";

const PAYMENT_REDIRECT_PATH = "/order-success";

/** Detect deep link params:
 *  - ?imei= → redirect to /activate
 *  - ?ref=  → store referrer's phone for affiliate tracking
 */
function DeepLinkHandler() {
  const navigate = useNavigate();
  // Process the deep link ONCE per app session. Without this guard, zmp-ui's
  // `useNavigate` returns a new function reference on each ZMPRouter render,
  // so the effect re-fires every time the user navigates anywhere — and since
  // Zalo's container URL keeps `?imei=` forever, the user gets bounced back
  // to /activate every time they try to leave it.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);

    // Affiliate: capture referrer phone from share link (?ref=<phone>)
    const refParam = params.get("ref");
    if (refParam && /^0\d{9}$/.test(refParam)) {
      setStoredReferrerPhone(refParam);
      console.log("[deep-link] Referrer phone captured:", refParam);
    }

    // IMEI activation deep link
    const imeiParam = params.get("imei");
    if (imeiParam) {
      navigate(`/activate?imei=${encodeURIComponent(imeiParam)}`, {
        replace: true,
      });
    }
  }, [navigate]);

  return null;
}

/**
 * Lắng nghe OpenApp từ Checkout SDK — khi user quay lại MiniApp từ trang
 * thanh toán bên ngoài (vd VNPay browser flow), Zalo bắn event với path khớp
 * Redirect Path đã khai báo. Ta navigate vào React Router để OrderRedirectPage
 * tiếp quản xác thực giao dịch.
 */
function PaymentRedirectListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (data: any) => {
      const path: string | undefined = data?.path;
      if (path && path.includes(PAYMENT_REDIRECT_PATH)) {
        navigate(path.startsWith("/") ? path : `/${path}`, { replace: true });
      }
    };
    events.on(EventName.OpenApp, handler);
    return () => { events.off(EventName.OpenApp, handler); };
  }, [navigate]);

  return null;
}

const Layout = () => {
  const loadCatalog = useSetAtom(loadCatalogAtom);
  const autoLogin = useSetAtom(autoLoginAtom);

  useEffect(() => {
    loadCatalog();
    autoLogin();
  }, [loadCatalog, autoLogin]);

  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      <SnackbarProvider>
        <ZMPRouter>
          <DeepLinkHandler />
          <PaymentRedirectListener />
          <AppHeader />
          <AnimationRoutes>
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
          </AnimationRoutes>
          <BottomNav />
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
};

export default Layout;
