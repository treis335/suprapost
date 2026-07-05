import { useState, useEffect } from "react";
import { C } from "../theme";
import { OrbitRing } from "../components/ui/OrbitRing";
import { Btn } from "../components/ui/Btn";

/* ============================================================
   LANDING PAGE — the "cover" of the product.
   Signature element: the same OrbitRing used inside the app for
   the automation cycle, here animated through the real stages a
   post goes through — the hero literally demonstrates the product.
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

function Section({ children, style }) {
  return <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", ...style }}>{children}</section>;
}

const STEPS = [
  { n: "01", title: "Connect your wallet", body: "Sign in with StarKey — your Supra address is your account. No email, no password." },
  { n: "02", title: "Set your profile & channels", body: "Tell it your niche, tone and audience. Connect Telegram, Twitter/X, Discord or Instagram — only the ones you use." },
  { n: "03", title: "Let it run", body: "AI writes, scores, and posts on its own schedule — from every 30 seconds to once a day. Close the browser, it keeps going." },
  { n: "04", title: "Top up with SUPRA", body: "That's the only thing you ever pay for. No API keys to manage, no subscriptions to juggle." },
];

const FEATURES = [
  { icon: "✎", title: "AI writing & images", body: "Generates on-brand posts and matching visuals, self-checked before anything goes out." },
  { icon: "📡", title: "Every major channel", body: "Telegram, Twitter/X, Discord, Instagram — toggle each on, test the connection, done." },
  { icon: "⚡", title: "True 24/7 automation", body: "Runs on the server, not your browser. Restarts recover exactly where they left off." },
  { icon: "⬡", title: "Pay only in SUPRA", body: "Non-custodial deposits straight from your wallet. No hidden fees, no card on file." },
];

export function LandingPage({ onEnter }) {
  const { stage, progress } = useCycle();

  return (
    <div style={{ background: C.bg, backgroundImage: C.bgGrad, color: C.text, fontFamily: C.sans, minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px);} to { opacity: 1; transform: translateY(0);} }
        .fu { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) both; }
        .landing-cta:hover { filter: brightness(1.08); }
        @media (max-width: 760px) { .hero-grid { grid-template-columns: 1fr !important; } .hero-ring { order: -1; margin-bottom: 8px; } }
      `}</style>

      {/* ── Nav ───────────────────────────────────────────── */}
      <Section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: C.mono, fontSize: "1.3rem", color: C.accent }}>⬡</span>
          <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>SupraPost</span>
        </div>
        <Btn variant="primary" size="sm" onClick={onEnter}>Launch App →</Btn>
      </Section>

      {/* ── Hero ──────────────────────────────────────────── */}
      <Section style={{ padding: "56px 24px 90px" }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "center" }}>
          <div className="fu">
            <div style={{ fontFamily: C.mono, fontSize: "0.72rem", color: C.accent2, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 18 }}>
              AI social automation · paid in SUPRA
            </div>
            <h1 style={{ fontFamily: C.display, fontSize: "clamp(2.1rem, 5vw, 3.4rem)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: 0, fontWeight: 600 }}>
              Your social presence,<br />running <span style={{ color: C.accent }}>while you don't.</span>
            </h1>
            <p style={{ fontSize: "1.05rem", color: C.text2, lineHeight: 1.6, marginTop: 22, maxWidth: 480 }}>
              SupraPost writes, checks, and publishes your posts across every
              channel that matters — on its own schedule, on its own server.
              You just top up the balance and watch it work.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
              <Btn variant="primary" size="lg" onClick={onEnter}>Launch App</Btn>
              <Btn variant="ghost" size="lg" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See how it works</Btn>
            </div>
          </div>

          <div className="hero-ring fu" style={{ display: "flex", justifyContent: "center", animationDelay: "0.15s" }}>
            <div style={{ padding: 34, borderRadius: 24, background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px -30px rgba(0,0,0,0.6)" }}>
              <OrbitRing running progress={progress} size={200} label={stage.label} sublabel={stage.sublabel} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── How it works ──────────────────────────────────── */}
      <Section id="how" style={{ padding: "20px 24px 90px" }}>
        <div style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 10 }}>How it works</div>
        <h2 style={{ fontFamily: C.display, fontSize: "1.8rem", fontWeight: 600, margin: "0 0 40px", letterSpacing: "-0.01em" }}>Four steps. Then it's hands-off.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: C.mono, fontSize: "0.78rem", color: C.accent, marginBottom: 14 }}>{s.n}</div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.98rem" }}>{s.title}</div>
              <div style={{ fontSize: "0.86rem", color: C.text2, lineHeight: 1.55 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Features ──────────────────────────────────────── */}
      <Section style={{ padding: "20px 24px 90px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: "0.86rem", color: C.text2, lineHeight: 1.55 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── For everyone ──────────────────────────────────── */}
      <Section style={{ padding: "20px 24px 100px" }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.accent}18, ${C.accent2}0d)`, border: `1px solid ${C.borderLight}`,
          borderRadius: 20, padding: "40px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32,
        }}>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>Never touched an API key?</div>
            <div style={{ fontSize: "0.88rem", color: C.text2, lineHeight: 1.6 }}>
              Skip it entirely. Top up your balance in SUPRA and use the built-in
              AI to write and post for you — no technical setup required.
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>Know your way around one?</div>
            <div style={{ fontSize: "0.88rem", color: C.text2, lineHeight: 1.6 }}>
              Connect your own Telegram bot, Twitter/X, Discord or Instagram
              credentials in Channels, and post straight from your own accounts.
            </div>
          </div>
        </div>
      </Section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <Section style={{ padding: "0 24px 90px", textAlign: "center" }}>
        <h2 style={{ fontFamily: C.display, fontSize: "1.9rem", fontWeight: 600, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
          Ready to put your feed on autopilot?
        </h2>
        <p style={{ color: C.text2, marginBottom: 30 }}>Connect your wallet and generate your first post in under a minute.</p>
        <Btn variant="primary" size="lg" onClick={onEnter}>Launch App</Btn>
      </Section>

      <Section style={{ padding: "24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: "0.78rem", color: C.muted }}>© {new Date().getFullYear()} SupraPost</div>
        <div style={{ fontSize: "0.78rem", color: C.muted }}>Built on Supra</div>
      </Section>
    </div>
  );
}
