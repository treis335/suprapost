const DARK = {
  // Base
  bg:       "#080b12",
  bgGrad:   "radial-gradient(ellipse 140% 70% at 50% -5%, #0f1422 0%, #080b12 60%)",
  surface:  "#0d1120",
  surface2: "#111827",
  raised:   "#161e2e",
  border:   "#1c2438",
  borderLight: "#253048",

  // Accent
  accent:    "#7c7df6",
  accentDeep:"#5f5fe0",
  accent2:   "#4fd1c5",

  // Supra green
  supra:    "#34d399",

  // Status
  warn:   "#f59e0b",
  danger: "#f87171",

  // Text
  text:  "#e8eaf4",
  text2: "#8892b0",
  muted: "#4a5270",
};

const LIGHT = {
  // Base
  bg:       "#f6f7fb",
  bgGrad:   "radial-gradient(ellipse 140% 70% at 50% -5%, #ffffff 0%, #f6f7fb 60%)",
  surface:  "#ffffff",
  surface2: "#f2f4f9",
  raised:   "#eaedf5",
  border:   "#dde1ec",
  borderLight: "#c9cfe0",

  // Accent
  accent:    "#5f5fe0",
  accentDeep:"#4a4acb",
  accent2:   "#1f9d8f",

  // Supra green
  supra:    "#199c6e",

  // Status
  warn:   "#b45309",
  danger: "#dc2626",

  // Text
  text:  "#161a26",
  text2: "#4b5470",
  muted: "#8a91ab",
};

// `C` is a mutable object (not a fresh one per theme) so that every file
// that already does `import { C } from "../theme"` keeps working exactly
// as before — toggling the theme just mutates these properties in place,
// and the next React re-render picks up the new values automatically. No
// component needs to change how it reads colors.
export const C = {
  ...DARK,
  // Fonts (theme-independent)
  display: "'Space Grotesk', 'Inter', sans-serif",
  sans:    "'Inter', -apple-system, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

const THEME_KEY = "suprapost_theme"; // "dark" | "light"

export function getSavedThemeMode() {
  try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}

export function applyThemeMode(mode) {
  Object.assign(C, mode === "light" ? LIGHT : DARK);
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
}

// Apply the saved preference immediately at module load, before the first
// render, so there's no flash of the wrong theme.
applyThemeMode(getSavedThemeMode());

export const fmt = (n) => Number(n ?? 0).toFixed(2);
