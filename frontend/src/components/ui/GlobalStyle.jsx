import { C } from "../../theme";

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

      * { box-sizing: border-box; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.borderLight}; border-radius: 4px; }

      @keyframes softPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.55; }
      }
      @keyframes spinSlow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes popIn {
        from { opacity: 0; transform: scale(0.94); }
        to { opacity: 1; transform: scale(1); }
      }
      .fade-up { animation: fadeUp 0.35s cubic-bezier(.2,.7,.3,1) both; }
      .pop-in { animation: popIn 0.22s cubic-bezier(.2,.7,.3,1) both; }

      input::placeholder, textarea::placeholder { color: ${C.muted}; }
      input:focus, textarea:focus, select:focus { outline: none; }

      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
      }
    `}</style>
  );
}
