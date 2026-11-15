/**
 * Design tokens — the same palette as the website (app/tokens.css),
 * so the app and the site feel like one product.
 */
export const colors = {
  ink: "#172b2a",
  muted: "#64716f",
  paper: "#f7f7f3",
  surface: "#ffffff",
  line: "#dce3df",
  teal: "#0d5d56",
  tealDark: "#084b46",
  tealSoft: "#e6f1ee",
  success: "#176c4a",
  successBg: "#e9f5ee",
  warning: "#8a5200",
  warningBg: "#fff4dc",
  danger: "#a23c38",
  dangerBg: "#fff0ef",
  info: "#345d94",
  infoBg: "#edf3fb",
  disabled: "#b9c2bf",
  white: "#ffffff",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Minimum touch target (Apple HIG 44pt / Material 48dp). */
export const TAP = 48;
