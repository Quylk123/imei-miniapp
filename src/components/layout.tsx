import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { getSystemInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";

import AppHeader from "@/components/layout/app-header";
import BottomNav from "@/components/layout/bottom-nav";
import { routes } from "@/routes";
import { autoLoginAtom, loadCatalogAtom } from "@/state/atoms";

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
