import { useEffect, useState } from "react";
import { BREAKPOINTS } from "../theme";

/**
 * Three-tier responsive hook:
 *  - mobile:  < 640px  → bottom tab bar, single column
 *  - tablet:  640–1100 → sidebar + content, no right rail
 *  - desktop: >= 1100  → sidebar + content + right "overview" rail
 */
export function useViewport() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
    let raf = null;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setW(window.innerWidth);
        raf = null;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = w < BREAKPOINTS.mobile;
  const isTablet = w >= BREAKPOINTS.mobile && w < BREAKPOINTS.tablet;
  const isDesktop = w >= BREAKPOINTS.tablet;

  return { width: w, isMobile, isTablet, isDesktop };
}
