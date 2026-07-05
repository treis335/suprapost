import { useState, useEffect, useRef } from "react";
import { C } from "../theme";
import { OrbitRing } from "../components/ui/OrbitRing";
import { Btn } from "../components/ui/Btn";

/* ============================================================
   LANDING PAGE — the product's storefront.
   Signature: the OrbitRing from inside the app, animated through
   the real posting cycle — the hero demonstrates the product
   instead of illustrating it. Everything else stays quiet and
   disciplined around that one moving piece.
============================================================ */

const CYCLE = [
  { label: "Writing", sublabel: "AI drafting the post" },
  { label: "Scoring", sublabel: "self-critique pass" },
  { label: "Posting", sublabel: "across your channels" },
  { label: "Charging", sublabel: "SUPRA deducted" },
];

function useCycle() {
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf, start = Date.now();
    const step = () => {
      const t = (Date.now() - start) / 2200;
      if (t >= 1) { start = Date.now(); setI(v => (v + 1) % CYCLE.length); setProgress(0); }
      else setProgress(t);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return { stage: CYCLE[i], progress };
}

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    if (el) io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0, transform: shown ? "translateY(0)" : "translateY(22px)",
      transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

function Section({ children, style, id }) {
  return <section id={id} style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", position: "relative", ...style }}>{children}</section>;
}

const STEPS = [
  { n: "01", title: "Connect your wallet", body: "Sign in with StarKey — your Supra address is your account. No email, no password, nothing else to remember." },
  { n: "02", title: "Set your profile & channels", body: "Tell it your niche, tone and audience. Connect Telegram, Twitter/X, Discord or Instagram — only the ones you actually use." },
  { n: "03", title: "Let it run", body: "AI writes, scores, and posts on its own schedule — from every 30 seconds to once a day. Close the browser; it keeps going." },
  { n: "04", title: "Top up with SUPRA", body: "That's the only thing you ever pay for. No API keys to manage, no subscriptions to juggle." },
];

const FEATURES = [
  { icon: "✎", color: C.accent, title: "AI writing & images", body: "Generates on-brand posts and matching visuals, self-checked before anything goes out." },
  { icon: "📡", color: C.accent2, title: "Every major channel", body: "Telegram, Twitter/X, Discord, Instagram — toggle each on, test the connection, done." },
  { icon: "⚡", color: C.warn, title: "True 24/7 automation", body: "Runs on the server, not your browser. Restarts recover exactly where they left off." },
  { icon: "⬡", color: C.supra, title: "Pay only in SUPRA", body: "Non-custodial deposits straight from your wallet. No hidden fees, no card on file." },
];

const STATS = [
  { value: "4", label: "platforms, one engine" },
  { value: "30s", label: "fastest posting cycle" },
  { value: "24/7", label: "runs without you" },
  { value: "0", label: "API keys required to start" },
];

export function LandingPage({ onEnter }) {
  const { stage, progress } = useCycle();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: C.sans, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @keyframes floatBlob { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-3%,4%) scale(1.06); } }
        @keyframes floatBlob2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4%,-3%) scale(1.08); } }
        .glow-blob-a { animation: floatBlob 16s ease-in-out infinite; }
        .glow-blob-b { animation: floatBlob2 19s ease-in-out infinite; }
        .feature-card { transition: transform 0.25s cubic-bezier(.16,1,.3,1), border-color 0.25s, box-shadow 0.25s; }
        .feature-card:hover { transform: translateY(-5px); border-color: ${C.borderLight}; box-shadow: 0 20px 40px -24px rgba(0,0,0,0.6); }
        .step-card { transition: transform 0.25s, border-color 0.25s; }
        .step-card:hover { transform: translateY(-4px); border-color: ${C.accent}55; }
        @media (max-width: 780px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-ring { order: -1; margin-bottom: 12px; }
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div className="glow-blob-a" style={{ position: "absolute", top: "-12%", left: "-8%", width: 560, height: 560, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}2e, transparent 70%)`, filter: "blur(10px)" }} />
        <div className="glow-blob-b" style={{ position: "absolute", top: "18%", right: "-14%", width: 640, height: 640, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent2}22, transparent 70%)`, filter: "blur(10px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.supra}14, transparent 70%)`, filter: "blur(10px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(14px)",
          background: scrolled ? `${C.bg}cc` : "transparent",
          borderBottom: `1px solid ${scrolled ? C.border : "transparent"}`,
          transition: "background 0.3s, border-color 0.3s",
        }}>
          <Section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: C.mono, fontSize: "1.3rem", color: C.accent }}>⬡</span>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>SupraPost</span>
            </div>
            <Btn variant="primary" size="sm" onClick={onEnter}>Launch App →</Btn>
          </Section>
        </div>

        <Section style={{ padding: "64px 24px 70px" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "center" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, fontFamily: C.mono, fontSize: "0.7rem", color: C.accent2,
                textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 22, padding: "6px 12px",
                border: `1px solid ${C.accent2}33`, borderRadius: 999, background: `${C.accent2}0d`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent2, boxShadow: `0 0 8px ${C.accent2}` }} />
                AI social automation · paid in SUPRA
              </div>
              <h1 style={{ fontFamily: C.display, fontSize: "clamp(2.4rem, 5.6vw, 3.8rem)", lineHeight: 1.04, letterSpacing: "-0.025em", margin: 0, fontWeight: 600 }}>
                Your social presence,<br />running <span style={{
                  background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                }}>while you don't.</span>
              </h1>
              <p style={{ fontSize: "1.1rem", color: C.text2, lineHeight: 1.65, marginTop: 24, maxWidth: 500 }}>
                SupraPost writes, checks, and publishes your posts across every
                channel that matters — on its own schedule, on its own server.
                You just top up the balance and watch it work.
              </p>
              <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
                <Btn variant="primary" size="lg" onClick={onEnter}>Launch App</Btn>
                <Btn variant="ghost" size="lg" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See how it works</Btn>
              </div>
            </div>

            <div className="hero-ring" style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                padding: 36, borderRadius: 26, background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`,
                border: `1px solid ${C.border}`, boxShadow: `0 30px 70px -32px rgba(0,0,0,0.65), 0 0 0 1px ${C.border} inset`,
                position: "relative",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "26px 26px 0 0", background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
                <OrbitRing running progress={progress} size={200} label={stage.label} sublabel={stage.sublabel} />
              </div>
            </div>
          </div>

          <Reveal delay={0.1}>
            <div style={{
              marginTop: 64, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 1,
              background: C.border, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`,
            }}>
              {STATS.map(s => (
                <div key={s.label} style={{ background: C.surface, padding: "22px 18px", textAlign: "center" }}>
                  <div style={{ fontFamily: C.mono, fontSize: "1.5rem", fontWeight: 600, color: C.text }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </Section>

        <Section id="how" style={{ padding: "60px 24px 90px" }}>
          <Reveal>
            <div style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontFamily: C.display, fontSize: "1.9rem", fontWeight: 600, margin: "0 0 40px", letterSpacing: "-0.015em" }}>Four steps. Then it's hands-off.</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
            {STEPS.map((s, idx) => (
              <Reveal key={s.n} delay={idx * 0.08}>
                <div className="step-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontFamily: C.mono, fontSize: "0.8rem", color: C.accent, marginBottom: 16 }}>{s.n}</div>
                  <div style={{ fontWeight: 600, marginBottom: 9, fontSize: "1rem" }}>{s.title}</div>
                  <div style={{ fontSize: "0.87rem", color: C.text2, lineHeight: 1.58 }}>{s.body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section style={{ padding: "0 24px 90px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {FEATURES.map((f, idx) => (
              <Reveal key={f.title} delay={idx * 0.07}>
                <div className="feature-card" style={{
                  background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.border}`,
                  borderRadius: 18, padding: 26, height: "100%", boxSizing: "border-box",
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.2rem", marginBottom: 18, background: `${f.color}18`, border: `1px solid ${f.color}33`,
                    boxShadow: `0 0 20px -6px ${f.color}55`,
                  }}>{f.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "1rem" }}>{f.title}</div>
                  <div style={{ fontSize: "0.87rem", color: C.text2, lineHeight: 1.58 }}>{f.body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section style={{ padding: "0 24px 100px" }}>
          <Reveal>
            <div style={{
              background: `linear-gradient(135deg, ${C.accent}1f, ${C.accent2}10)`, border: `1px solid ${C.borderLight}`,
              borderRadius: 22, padding: "44px 36px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 36,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}22, transparent 70%)` }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: 9 }}>Never touched an API key?</div>
                <div style={{ fontSize: "0.9rem", color: C.text2, lineHeight: 1.62 }}>
                  Skip it entirely. Top up your balance in SUPRA and use the built-in
                  AI to write and post for you — no technical setup required.
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: 9 }}>Know your way around one?</div>
                <div style={{ fontSize: "0.9rem", color: C.text2, lineHeight: 1.62 }}>
                  Connect your own Telegram bot, Twitter/X, Discord or Instagram
                  credentials in Channels, and post straight from your own accounts.
                </div>
              </div>
            </div>
          </Reveal>
        </Section>

        <Section style={{ padding: "0 24px 100px", textAlign: "center" }}>
          <Reveal>
            <div style={{
              background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.border}`,
              borderRadius: 26, padding: "56px 32px", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 2, background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
              <h2 style={{ fontFamily: C.display, fontSize: "2rem", fontWeight: 600, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
                Ready to put your feed on autopilot?
              </h2>
              <p style={{ color: C.text2, marginBottom: 32 }}>Connect your wallet and generate your first post in under a minute.</p>
              <Btn variant="primary" size="lg" onClick={onEnter}>Launch App</Btn>
            </div>
          </Reveal>
        </Section>

        <Section style={{ padding: "24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: "0.78rem", color: C.muted }}>© {new Date().getFullYear()} SupraPost</div>
          <div style={{ fontSize: "0.78rem", color: C.muted }}>Built on Supra</div>
        </Section>
      </div>
    </div>
  );
}
