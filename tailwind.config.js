/**
 * Tokens mirror DESIGN.md (Airbnb-inspired). Update both files together.
 */
module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  purge: {
    enabled: true,
    content: ["./src/**/*.{js,jsx,ts,tsx,vue}"],
  },
  theme: {
    extend: {
      colors: {
        rausch: {
          DEFAULT: "#ff385c",
          active: "#e00b41",
          disabled: "#ffd1da",
        },
        ink: "#222222",
        body: "#3f3f3f",
        muted: {
          DEFAULT: "#6a6a6a",
          soft: "#929292",
        },
        hairline: {
          DEFAULT: "#dddddd",
          soft: "#ebebeb",
          strong: "#c1c1c1",
        },
        canvas: "#ffffff",
        surface: {
          soft: "#f7f7f7",
          strong: "#f2f2f2",
        },
        legal: "#428bff",
        danger: {
          DEFAULT: "#c13515",
          hover: "#b32505",
        },
      },
      fontFamily: {
        sans: [
          "Airbnb Cereal VF",
          "Circular",
          "Inter",
          "-apple-system",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: ["Roboto Mono", "monospace"],
      },
      fontSize: {
        "display-xl": ["28px", { lineHeight: "1.18", fontWeight: "700" }],
        "display-lg": ["22px", { lineHeight: "1.18", letterSpacing: "-0.44px", fontWeight: "500" }],
        "display-md": ["21px", { lineHeight: "1.25", fontWeight: "700" }],
        "display-sm": ["20px", { lineHeight: "1.20", letterSpacing: "-0.18px", fontWeight: "600" }],
        "title-md": ["16px", { lineHeight: "1.25", fontWeight: "600" }],
        "title-sm": ["16px", { lineHeight: "1.25", fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.43", fontWeight: "400" }],
        caption: ["14px", { lineHeight: "1.29", fontWeight: "500" }],
        "caption-sm": ["13px", { lineHeight: "1.23", fontWeight: "400" }],
        badge: ["11px", { lineHeight: "1.18", fontWeight: "600" }],
      },
      borderRadius: {
        none: "0px",
        xs: "4px",
        sm: "8px",
        md: "14px",
        lg: "20px",
        xl: "32px",
        full: "9999px",
      },
      spacing: {
        xxs: "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        base: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "64px",
      },
      boxShadow: {
        card: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.10) 0 4px 8px 0",
      },
    },
  },
};
