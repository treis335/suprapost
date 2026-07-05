/* ============================================================
   DESIGN SYSTEM — "Pulse"
   A living, breathing automation product. The signature element
   is the orbit ring: a circular progress indicator that visualises
   the automation cycle as something alive, not just a countdown.

   Palette: deep indigo-charcoal base (comfortable, premium fintech
   feel rather than "neon crypto"), one confident violet-blue accent
   for actions, a warm emerald reserved for money/success, soft teal
   for data, and a gentle coral for danger — kept rare.
============================================================ */
export const C = {
  bg: "#0a0d14",
  bgGrad: "radial-gradient(ellipse 120% 80% at 50% -10%, #151a29 0%, #0a0d14 55%)",
  surface: "#111521",
  surface2: "#161b2a",
  raised: "#1b2133",
  border: "#20263a",
  borderLight: "#2c3450",
  accent: "#7b7cf5",
  accentDeep: "#5f5fe0",
  accent2: "#4fd1c5",
  supra: "#34d399",
  warn: "#fbbf24",
  danger: "#f87171",
  text: "#eef0f8",
  text2: "#9aa2c0",
  muted: "#5a6180",
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
