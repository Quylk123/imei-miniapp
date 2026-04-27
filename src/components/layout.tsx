import { getSystemInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";

import BottomNav from "@/components/layout/bottom-nav";
import HomePage from "@/pages/index";
import AccountPage from "@/pages/account";
import AuthPage from "@/pages/auth";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import MyImeiPage from "@/pages/my-imei";
import ImeiCheckoutPage from "@/pages/my-imei/checkout";
import ImeiDetailPage from "@/pages/my-imei/detail";
import PackagesPage from "@/pages/my-imei/packages";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/orders/detail";
import OrderSuccessPage from "@/pages/orders/success";
import ProductDetailPage from "@/pages/products/detail";
import ScanPage from "@/pages/scan";

const Layout = () => {
  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/my-imei" element={<MyImeiPage />} />
            <Route path="/my-imei/:imeiId" element={<ImeiDetailPage />} />
            <Route path="/my-imei/:imeiId/packages" element={<PackagesPage />} />
            <Route path="/my-imei/:imeiId/checkout" element={<ImeiCheckoutPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId/success" element={<OrderSuccessPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/account" element={<AccountPage />} />
          </AnimationRoutes>
          <BottomNav />
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
};

export default Layout;
