import type { ReactNode } from "react";

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

export type HeaderVariant = "none" | "default" | "transparent";

export interface HeaderConfig {
  variant: HeaderVariant;
  title?: string;
  back?: boolean;
}

export interface RouteDef {
  path: string;
  element: ReactNode;
  header: HeaderConfig;
}

export const routes: RouteDef[] = [
  // Tab pages — sticky AppHeader (no back)
  { path: "/", element: <HomePage />, header: { variant: "default", title: "Trang chủ", back: false } },
  { path: "/my-imei", element: <MyImeiPage />, header: { variant: "default", title: "IMEI của tôi", back: false } },
  { path: "/cart", element: <CartPage />, header: { variant: "default", title: "Giỏ hàng", back: false } },
  { path: "/orders", element: <OrdersPage />, header: { variant: "default", title: "Đơn hàng", back: false } },
  { path: "/account", element: <AccountPage />, header: { variant: "default", title: "Tài khoản", back: false } },

  // Full-screen / no chrome
  { path: "/auth", element: <AuthPage />, header: { variant: "none" } },
  { path: "/scan", element: <ScanPage />, header: { variant: "none" } },
  { path: "/orders/:orderId/success", element: <OrderSuccessPage />, header: { variant: "none" } },

  // Hero overlay — header trong suốt, chỉ floating back
  { path: "/products/:id", element: <ProductDetailPage />, header: { variant: "transparent" } },

  // Flow pages — sticky header với back + title
  { path: "/checkout", element: <CheckoutPage />, header: { variant: "default", title: "Thanh toán" } },
  { path: "/my-imei/:imeiId", element: <ImeiDetailPage />, header: { variant: "default", title: "Chi tiết IMEI" } },
  { path: "/my-imei/:imeiId/packages", element: <PackagesPage />, header: { variant: "default", title: "Chọn gói cước" } },
  { path: "/my-imei/:imeiId/checkout", element: <ImeiCheckoutPage />, header: { variant: "default", title: "Xác nhận thanh toán" } },
  { path: "/orders/:orderId", element: <OrderDetailPage />, header: { variant: "default", title: "Chi tiết đơn hàng" } },
];
