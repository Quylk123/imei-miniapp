import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const VERSION = process.env.CDN_VERSION;
const CDN_PREFIX = process.env.CDN_PREFIX;

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
