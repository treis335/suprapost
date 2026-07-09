export const C = {
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

  // Fonts
  display: "'Space Grotesk', 'Inter', sans-serif",
  sans:    "'Inter', -apple-system, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

export const fmt = (n) => Number(n ?? 0).toFixed(2);
