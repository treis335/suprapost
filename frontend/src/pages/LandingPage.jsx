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

const PLATFORMS = [
  { id: "telegram", name: "Telegram", color: "#34b7eb", path: "M21.05 3.16 2.9 10.36c-1.24.5-1.23 1.2-.23 1.5l4.65 1.45 1.8 5.53c.22.6.11.84.75.84.5 0 .72-.23 1-.5l2.4-2.33 4.98 3.68c.92.5 1.58.24 1.82-.85l3.28-15.47c.36-1.33-.5-1.93-1.3-1.55Z" },
  { id: "twitter", name: "X", color: "#e7e9ea", path: "M18.9 3H22l-7.4 8.4L23 21h-6.8l-5.3-6.9L4.7 21H1.6l7.9-9L1 3h7l4.8 6.3L18.9 3Zm-1.2 16.2h1.9L7.4 4.7H5.3l12.4 14.5Z" },
  { id: "discord", name: "Discord", color: "#5865F2", path: "M19.5 5.7A17 17 0 0 0 15.4 4.4c-.2.35-.4.8-.55 1.16a15.8 15.8 0 0 0-4.7 0c-.15-.36-.36-.81-.56-1.16A17 17 0 0 0 5.5 5.7C2.7 9.8 1.95 13.8 2.3 17.75a17.1 17.1 0 0 0 5.2 2.6c.42-.57.8-1.18 1.1-1.83a11 11 0 0 1-1.75-.83c.15-.1.3-.22.43-.33a12.2 12.2 0 0 0 10.4 0c.15.11.28.23.44.33-.56.33-1.15.6-1.76.83.32.65.68 1.26 1.1 1.83a17 17 0 0 0 5.2-2.6c.42-4.58-.72-8.55-3.16-12.05ZM9.7 15.35c-1.05 0-1.9-.95-1.9-2.13 0-1.17.83-2.13 1.9-2.13 1.06 0 1.92.96 1.9 2.13 0 1.18-.84 2.13-1.9 2.13Zm5.6 0c-1.05 0-1.9-.95-1.9-2.13 0-1.17.84-2.13 1.9-2.13 1.06 0 1.92.96 1.9 2.13 0 1.18-.83 2.13-1.9 2.13Z" },
  { id: "instagram", name: "Instagram", color: "#E1306C", path: "M12 2.2c3.2 0 3.58.01 4.85.07 1.17.06 1.97.24 2.43.42.55.2.94.46 1.36.87.4.42.66.8.87 1.36.18.46.36 1.26.42 2.43.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.06 1.17-.24 1.97-.42 2.43-.2.55-.46.94-.87 1.36-.42.4-.8.66-1.36.87-.46.18-1.26.36-2.43.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.06-1.97-.24-2.43-.42a3.7 3.7 0 0 1-1.36-.87 3.7 3.7 0 0 1-.87-1.36c-.18-.46-.36-1.26-.42-2.43C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.06-1.17.24-1.97.42-2.43.2-.55.46-.94.87-1.36.42-.4.8-.66 1.36-.87.46-.18 1.26-.36 2.43-.42C8.42 2.21 8.8 2.2 12 2.2Zm0 1.98c-3.15 0-3.5.01-4.73.07-1 .05-1.55.21-1.9.35-.48.19-.82.41-1.18.77-.36.36-.58.7-.77 1.18-.14.36-.3.9-.35 1.9-.06 1.23-.07 1.58-.07 4.73s.01 3.5.07 4.73c.05 1 .21 1.55.35 1.9.19.48.41.82.77 1.18.36.36.7.58 1.18.77.36.14.9.3 1.9.35 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c1-.05 1.55-.21 1.9-.35.48-.19.82-.41 1.18-.77.36-.36.58-.7.77-1.18.14-.36.3-.9.35-1.9.06-1.23.07-1.58.07-4.73s-.01-3.5-.07-4.73c-.05-1-.21-1.55-.35-1.9a3.16 3.16 0 0 0-.77-1.18 3.16 3.16 0 0 0-1.18-.77c-.36-.14-.9-.3-1.9-.35-1.23-.06-1.58-.07-4.73-.07Zm0 3.38a4.44 4.44 0 1 1 0 8.88 4.44 4.44 0 0 1 0-8.88Zm0 1.98a2.46 2.46 0 1 0 0 4.92 2.46 2.46 0 0 0 0-4.92Zm4.62-2.2a1.04 1.04 0 1 1 0 2.08 1.04 1.04 0 0 1 0-2.08Z" },
];

const CONSOLE_LINES = [
  { t: "> reading profile: niche=\"DeFi\", tone=\"technical\"", c: "muted" },
  { t: "✓ draft generated (deepseek)", c: "accent2" },
  { t: "✓ self-critique score: 8.7/10 — approved", c: "supra" },
  { t: "→ posting to telegram, twitter, discord", c: "text2" },
  { t: "✓ published · 1.00 SUPRA charged", c: "accent" },
  { t: "… next cycle in 00:29:41", c: "muted" },
];

const EXAMPLE_POSTS = [
  { platform: "telegram", tag: "✈ Telegram", text: "Stop trading noise. Start building signal. Supra fundamentals have never been stronger — on-chain data doesn't lie. 📈" },
  { platform: "twitter", tag: "𝕏 X", text: "GM builders ☀️ Shipping is the only alpha. What are you building on Supra this week?" },
  { platform: "discord", tag: "🎮 Discord", text: "New week, new milestones. The roadmap update is live in #announcements — feedback welcome!" },
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

        {/* ── Platform logos ─────────────────────────────────── */}
        <Section style={{ padding: "0 24px 70px" }}>
          <Reveal>
            <div style={{ textAlign: "center", fontSize: "0.72rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 22 }}>
              Publishes straight to
            </div>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "14px 36px" }}>
              {PLATFORMS.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9, opacity: 0.9 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={p.color}><path d={p.path} /></svg>
                  <span style={{ fontSize: "0.92rem", color: C.text2, fontWeight: 500 }}>{p.name}</span>
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

        {/* ── Live console ────────────────────────────────────── */}
        <Section style={{ padding: "0 24px 90px" }}>
          <Reveal>
            <div style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 10 }}>What's happening under the hood</div>
            <h2 style={{ fontFamily: C.display, fontSize: "1.7rem", fontWeight: 600, margin: "0 0 28px", letterSpacing: "-0.015em" }}>One cycle, start to finish.</h2>
            <div style={{
              background: "#0a0d14", border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 24px",
              boxShadow: "0 24px 50px -28px rgba(0,0,0,0.6)", maxWidth: 640,
            }}>
              <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f56" }} />
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e" }} />
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#27c93f" }} />
              </div>
              {CONSOLE_LINES.map((l, i) => (
                <div key={i} style={{ fontFamily: C.mono, fontSize: "0.83rem", color: C[l.c] || C.text2, lineHeight: 1.9 }}>{l.t}</div>
              ))}
            </div>
          </Reveal>
        </Section>

        {/* ── Example posts ───────────────────────────────────── */}
        <Section style={{ padding: "0 24px 90px" }}>
          <Reveal>
            <div style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 10 }}>Examples</div>
            <h2 style={{ fontFamily: C.display, fontSize: "1.7rem", fontWeight: 600, margin: "0 0 28px", letterSpacing: "-0.015em" }}>What the AI actually writes.</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
            {EXAMPLE_POSTS.map((p, idx) => (
              <Reveal key={p.tag} delay={idx * 0.08}>
                <div className="feature-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 600, marginBottom: 12 }}>{p.tag}</div>
                  <div style={{ fontSize: "0.9rem", color: C.text, lineHeight: 1.6 }}>{p.text}</div>
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
