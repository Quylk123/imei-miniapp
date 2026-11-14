import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const VERSION = process.env.CDN_VERSION;
const CDN_PREFIX = process.env.CDN_PREFIX;
const APP_ID = process.env.APP_ID || "3621082239322355630";

// Đảm bảo window.APP_ID, window.APP_ENV, window.APP_VERSION được gán TRƯỚC khi
// zmp-sdk đọc window.APP_ID trong constants.js (vì zmp chunk nạp trước main.js).
const ZMP_GLOBAL_BOOTSTRAP = `if(typeof window!=="undefined"){var _m=window.location.pathname.match(/\\/zapps\\/(\\d+)/);var _id=(_m&&_m[1])||${JSON.stringify(APP_ID)};if(!window.APP_ID||window.APP_ID==="undefined"||window.APP_ID!==_id){window.APP_ID=_id;}window.ZALO_APP_ID=window.APP_ID;var _sp=new URLSearchParams(window.location.search);if(!window.APP_ENV&&_sp.get("env")){window.APP_ENV=_sp.get("env");}if(!window.APP_VERSION&&_sp.get("version")){window.APP_VERSION=_sp.get("version");}}`;

if (!VERSION) {
  throw new Error("vite.config.cdn.mts: CDN_VERSION env is required");
}
if (!CDN_PREFIX) {
  throw new Error("vite.config.cdn.mts: CDN_PREFIX env is required");
}

export default defineConfig({
  base: `${CDN_PREFIX}/bundles/${VERSION}/`,
  plugins: [react()],
  build: {
    outDir: "dist-cdn",
    emptyOutDir: true,
    target: "es2019",
    minify: "esbuild",
    cssMinify: "lightningcss",
    sourcemap: false,
    manifest: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        banner: ZMP_GLOBAL_BOOTSTRAP,
        entryFileNames: "main.js",
        chunkFileNames: "[name].[hash].js",
        assetFileNames: (info) => {
          const name = info.name ?? "";
          if (name.endsWith(".css")) return "style.css";
          return "assets/[name].[hash][extname]";
        },
        manualChunks: {
          vendor: ["react", "react-dom"],
          zmp: ["zmp-sdk", "zmp-ui", "jotai"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
