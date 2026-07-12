// Design tokens — the single source for spacing, radii, font sizes, and the
// light/dark surface palettes. Components should read colors from getTheme()
// instead of hardcoding hex values so dark mode works everywhere.
//
// Dark values match the palette already used in PlannerPage
// (#1a1a2e page / #2a2a3e surfaces / #3a3a5e borders).

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
};

export const FONT = {
  xs: 10,
  sm: 12,
  md: 13,
  lg: 15,
  xl: 20,
  stat: 24,
};

const LIGHT_THEME = {
  pageBg: "#f9fafb",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  border: "#e5e7eb",
  borderSoft: "#eef2f7",
  track: "#f1f5f9",
  text: "#111827",
  textBody: "#374151",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  accent: "#6366f1",
  success: "#16a34a",
  warning: "#f59e0b",
  danger: "#ef4444",
  shadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const DARK_THEME = {
  pageBg: "#1a1a2e",
  surface: "#232338",
  surfaceAlt: "#2a2a3e",
  border: "#3a3a5e",
  borderSoft: "#2f2f4a",
  track: "#2f2f4a",
  text: "#f0f0f0",
  textBody: "#d4d6e3",
  textMuted: "#a5a8bd",
  textFaint: "#7c7f95",
  accent: "#818cf8",
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",
  shadow: "0 1px 4px rgba(0,0,0,0.4)",
};

export function getTheme(darkMode) {
  return darkMode ? DARK_THEME : LIGHT_THEME;
}
