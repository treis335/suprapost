/* ============================================================
   DESIGN SYSTEM — "Pulse"
   A living, breathing automation product. The signature element
   is the orbit ring: a circular progress indicator that visualises
   the automation cycle as something alive, not just a countdown.

   Palette: near-black with violet undertone (not neutral gray),
   a warm signal-green for SUPRA/success, electric cyan for data/
   links, and a soft coral for danger — kept rare.
============================================================ */
export const C = {
  bg: "#08070d",
  bgGrad: "radial-gradient(ellipse 120% 80% at 50% -10%, #14101f 0%, #08070d 55%)",
  surface: "#100e1a",
  surface2: "#171328",
  raised: "#1c1830",
  border: "#231f38",
  borderLight: "#332c52",
  accent: "#9b6bff",
  accentDeep: "#7c4cf0",
  accent2: "#3ed9d0",
  supra: "#3ddc91",
  warn: "#f5b942",
  danger: "#ff6b81",
  text: "#f1eefc",
  text2: "#a59cc7",
  muted: "#5f5783",
  display: "'Space Grotesk', 'Inter', sans-serif",
  sans: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Space Mono', monospace",
};

// Breakpoints, in px. Three tiers so the layout degrades gracefully
// instead of jumping straight from a 3-column desktop grid to a
// single mobile column.
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1100,
};

export const fmt = (n) => Number(n ?? 0).toFixed(2);
