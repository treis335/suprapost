import { useState, useEffect } from "react";
import { C } from "../theme";

const fmt = (n) => Number(n ?? 0).toFixed(2);

function authHeaders() {
  try {
    const raw = sessionStorage.getItem("suprapost_session");
    const s = raw ? JSON.parse(raw) : null;
    return s?.token ? { Authorization: `Bearer ${s.token}` } : {};
  } catch { return {}; }
}

export function ReferralPage({ walletAddress, isMobile }) {
  const [stats, setStats]   = useState(null);
  const [copied, setCopied] = useState(false);

  const refLink = walletAddress
    ? `${window.location.origin}/?ref=0x${walletAddress.replace(/^0x/, "")}`
    : "";

  useEffect(() => {
    if (!walletAddress) return;
    fetch("/api/referral", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.ok) setStats(d); })
      .catch(() => {});
  }, [walletAddress]);

  function copyLink() {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560, margin: "0 auto" }}>

      {/* Header */}
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: C.display, letterSpacing: "-0.02em" }}>
            Referrals
          </div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>
            Share your link. Earn 10% of every deposit — forever.
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.supra}14, ${C.supra}06)`,
          border: `1px solid ${C.supra}33`, borderRadius: 14, padding: "18px 20px",
        }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: C.mono, color: C.supra, lineHeight: 1 }}>
            {fmt(stats?.referralEarned ?? 0)}
          </div>
          <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            SUPRA earned
          </div>
        </div>
        <div style={{
          background: `linear-gradient(135deg, ${C.accent}12, ${C.accent}05)`,
          border: `1px solid ${C.accent}33`, borderRadius: 14, padding: "18px 20px",
        }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: C.mono, color: C.accent, lineHeight: 1 }}>
            {stats?.referralCount ?? 0}
          </div>
          <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Users referred
          </div>
        </div>
      </div>

      {/* Referral link card */}
      <div style={{
        background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "20px 22px",
      }}>
        <div style={{ fontSize: "0.74rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          Your referral link
        </div>

        {/* Link box */}
        <div style={{
          background: C.bg, border: `1.5px solid ${copied ? C.supra + "66" : C.border}`,
          borderRadius: 11, padding: "12px 16px",
          fontFamily: C.mono, fontSize: "0.78rem", color: C.text2,
          wordBreak: "break-all", lineHeight: 1.5, marginBottom: 12,
          transition: "border-color 0.2s",
        }}>
          {refLink || "—"}
        </div>

        {/* Copy button */}
        <button onClick={copyLink} disabled={!refLink} style={{
          width: "100%", padding: "13px 0", borderRadius: 11, border: "none",
          cursor: refLink ? "pointer" : "not-allowed",
          background: copied
            ? `linear-gradient(135deg, ${C.supra}cc, ${C.supra}99)`
            : `linear-gradient(135deg, ${C.accent}, ${C.accentDeep || C.accent})`,
          color: copied ? "#0a1f13" : "#fff",
          fontWeight: 700, fontSize: "0.95rem", fontFamily: C.sans,
          transition: "all 0.2s", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8,
        }}>
          {copied ? "✓  Link copied!" : "📋  Copy referral link"}
        </button>
      </div>

      {/* How it works */}
      <div style={{
        background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "20px 22px",
      }}>
        <div style={{ fontSize: "0.74rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
          How it works
        </div>
        {[
          { n: "1", title: "Share your link", desc: "Send it to anyone — Telegram groups, Twitter, Discord, anywhere." },
          { n: "2", title: "They sign up", desc: "When someone opens your link and connects their wallet for the first time, they're linked to you permanently." },
          { n: "3", title: "You earn 10% forever", desc: "Every time they deposit SUPRA, 10% is automatically credited to your balance. No limits, no expiry." },
        ].map(s => (
          <div key={s.n} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: `${C.accent}18`, border: `1px solid ${C.accent}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: C.mono, fontWeight: 700, fontSize: "0.82rem", color: C.accent,
            }}>{s.n}</div>
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 600, color: C.text, marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: "0.78rem", color: C.text2, lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          </div>
        ))}

        {/* Referrer info */}
        {stats?.referredBy && (
          <div style={{
            marginTop: 4, padding: "10px 14px", borderRadius: 9,
            background: `${C.accent}0a`, border: `1px solid ${C.accent}22`,
            fontSize: "0.76rem", color: C.muted,
          }}>
            You were referred by <span style={{ fontFamily: C.mono, color: C.accent2 }}>
              0x{stats.referredBy.slice(0, 6)}...{stats.referredBy.slice(-4)}
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
