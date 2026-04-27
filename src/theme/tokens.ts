// Mirror of DESIGN.md tokens for use in TS (where Tailwind classes are awkward).
export const colors = {
  rausch: "#ff385c",
  rauschActive: "#e00b41",
  rauschDisabled: "#ffd1da",
  ink: "#222222",
  body: "#3f3f3f",
  muted: "#6a6a6a",
  mutedSoft: "#929292",
  hairline: "#dddddd",
  hairlineSoft: "#ebebeb",
  borderStrong: "#c1c1c1",
  canvas: "#ffffff",
  surfaceSoft: "#f7f7f7",
  surfaceStrong: "#f2f2f2",
  scrim: "rgba(0,0,0,0.5)",
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 32,
  full: 9999,
} as const;
