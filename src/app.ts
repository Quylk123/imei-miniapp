// ZaUI stylesheet
import "zmp-ui/zaui.css";
// Tailwind stylesheet
import "@/css/tailwind.scss";
// Your stylesheet
import "@/css/app.scss";

// React core
import React from "react";
import { createRoot } from "react-dom/client";

// Mount the app
import Layout from "@/components/layout";
import AppErrorBoundary from "@/components/app-error-boundary";

// Expose app configuration
import appConfig from "../app-config.json";

const FALLBACK_APP_ID = "3621082239322355630";
const pathAppId = window.location.pathname.match(/\/zapps\/(\d+)/)?.[1];
const w = window as Window & {
  APP_ID?: string;
  ZALO_APP_ID?: string;
  APP_ENV?: string;
  APP_VERSION?: string;
};
if (!w.APP_ID || w.APP_ID === "undefined") {
  w.APP_ID = pathAppId || w.ZALO_APP_ID || FALLBACK_APP_ID;
}
w.ZALO_APP_ID = w.APP_ID;

const initialSearchParams = new URLSearchParams(window.location.search);
if (!w.APP_ENV && initialSearchParams.get("env")) {
  w.APP_ENV = initialSearchParams.get("env")!;
}
if (!w.APP_VERSION && initialSearchParams.get("version")) {
  w.APP_VERSION = initialSearchParams.get("version")!;
}

if (!window.APP_CONFIG) {
  window.APP_CONFIG = appConfig as any;
}

const root = createRoot(document.getElementById("app")!);
root.render(React.createElement(AppErrorBoundary, null, React.createElement(Layout)));
