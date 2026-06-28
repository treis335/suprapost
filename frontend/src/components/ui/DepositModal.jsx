import { useState, useEffect } from "react";
import { C } from "../../theme";
import { depositSupra } from "../../payment";

const fmt = (n) => Number(n ?? 0).toFixed(2);
const PRESETS = [10, 25, 50, 100];

export function DepositModal({ wallet, walletAddress, onCredited, onClose }) {
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [done, setDone] = useState(false);

  const finalAmount = custom !== "" ? Number(custom) : amount;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleDeposit() {
    setError(""); setTxHash(""); setDone(false);
    const result = await depositSupra(walletAddress, finalAmount, setStatus);
    setStatus(null);
    if (result.ok) {
      setDone(true);
      if (result.txHash) setTxHash(result.txHash);
      onCredited?.();
    } else {
      setError(result.error || "Deposit failed.");
      if (result.txHash) setTxHash(result.txHash);
    }
  }

  function reset() { setDone(false); setError(""); setStatus(null); setTxHash(""); }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(8,6,18,0.75)",
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.2s ease both",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 201,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, pointerEvents: "none",
      }}>
        <div
          style={{
            background: `linear-gradient(160deg, ${C.surface2} 0%, ${C.surface} 100%)`,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            width: "100%", maxWidth: 440,
            boxShadow: `0 32px 80px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset`,
            pointerEvents: "auto",
            animation: "scaleIn 0.22s cubic-bezier(.2,.8,.2,1) both",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "20px 24px 0",
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 16,
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: C.display, letterSpacing: "-0.02em" }}>
                Deposit SUPRA
              </div>
              <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 3 }}>
                Current balance:{" "}
                <span style={{ color: C.supra, fontFamily: C.mono, fontWeight: 600 }}>
                  {fmt(wallet.balance)} SUPRA
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                all: "unset", cursor: "pointer", width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, color: C.muted, fontSize: "1.1rem",
                background: C.raised, border: `1px solid ${C.border}`,
                transition: "color 0.15s, background 0.15s", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.surface2; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = C.raised; }}
            >✕</button>
          </div>

          {/* Body */}
          <div style={{ padding: "20px 24px 24px" }}>
            {done ? (
              /* ── Success ── */
              <div className="scale-in" style={{ textAlign: "center", padding: "12px 0 8px" }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%", margin: "0 auto 16px",
                  background: `${C.supra}18`, border: `2px solid ${C.supra}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.8rem", color: C.supra,
                }}>✓</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: C.supra, marginBottom: 6 }}>
                  {finalAmount} SUPRA added!
                </div>
                <div style={{ fontSize: "0.8rem", color: C.text2, marginBottom: txHash ? 14 : 22, lineHeight: 1.5 }}>
                  Your balance has been updated. You can now publish posts.
                </div>
                {txHash && (
                  <div style={{ marginBottom: 20 }}>
                    <a
                      href={`https://suprascan.io/tx/${txHash.startsWith("0x") ? txHash.slice(2) : txHash}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: "0.73rem", color: C.accent2, fontFamily: C.mono, textDecoration: "none" }}
                    >
                      View on SupraScan ↗
                    </a>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={reset} style={{
                    all: "unset", cursor: "pointer", padding: "9px 18px", borderRadius: 10,
                    fontSize: "0.82rem", fontWeight: 600, color: C.text2,
                    background: C.raised, border: `1px solid ${C.border}`,
                  }}>Deposit more</button>
                  <button onClick={onClose} style={{
                    all: "unset", cursor: "pointer", padding: "9px 18px", borderRadius: 10,
                    fontSize: "0.82rem", fontWeight: 600, color: "#fff",
                    background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`,
                  }}>Done</button>
                </div>
              </div>
            ) : (
              <>
                {/* Preset amounts */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: "0.74rem", color: C.text2, fontWeight: 500, marginBottom: 10 }}>
                    Amount
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {PRESETS.map((p) => {
                      const active = amount === p && custom === "";
                      return (
                        <button
                          key={p}
                          onClick={() => { setAmount(p); setCustom(""); }}
                          disabled={!!status}
                          style={{
                            flex: 1, padding: "11px 0", borderRadius: 10, cursor: "pointer",
                            fontFamily: C.mono, fontWeight: 700, fontSize: "0.92rem",
                            border: `1.5px solid ${active ? C.supra : C.border}`,
                            background: active ? `${C.supra}16` : C.raised,
                            color: active ? C.supra : C.text2,
                            transition: "all 0.18s",
                          }}
                        >{p}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom amount */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: "0.74rem", color: C.text2, fontWeight: 500, marginBottom: 8 }}>
                    Custom amount
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number" min="1" placeholder="0"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      disabled={!!status}
                      style={{
                        width: "100%", background: C.bg,
                        border: `1.5px solid ${custom !== "" ? C.supra : C.border}`,
                        borderRadius: 10, color: C.text, fontFamily: C.mono,
                        fontSize: "1.05rem", fontWeight: 600,
                        padding: "12px 64px 12px 16px",
                        outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = C.supra; e.target.style.boxShadow = `0 0 0 3px ${C.supra}22`; }}
                      onBlur={(e) => { if (custom === "") { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; } }}
                    />
                    <span style={{
                      position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                      fontFamily: C.mono, fontSize: "0.78rem", color: C.muted, fontWeight: 600,
                      pointerEvents: "none",
                    }}>SUPRA</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleDeposit}
                  disabled={!!status || finalAmount <= 0}
                  style={{
                    width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                    cursor: !!status || finalAmount <= 0 ? "not-allowed" : "pointer",
                    opacity: !!status || finalAmount <= 0 ? 0.5 : 1,
                    background: `linear-gradient(135deg, ${C.supra}cc, ${C.supra}99)`,
                    color: "#0a1f13", fontWeight: 700, fontSize: "0.96rem",
                    fontFamily: C.sans, transition: "filter 0.15s, transform 0.1s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={(e) => { if (!status) e.currentTarget.style.filter = "brightness(1.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
                  onMouseDown={(e) => { if (!status) e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {status ? (
                    <>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", background: "#0a1f13",
                        animation: "softPulse 1s ease-in-out infinite", display: "inline-block",
                      }} />
                      {status.message || "Processing…"}
                    </>
                  ) : (
                    `Deposit ${finalAmount > 0 ? finalAmount : ""} SUPRA`
                  )}
                </button>

                {error && (
                  <div className="fade-up" style={{
                    marginTop: 12, fontSize: "0.78rem", color: C.danger,
                    background: `${C.danger}12`, border: `1px solid ${C.danger}33`,
                    borderRadius: 8, padding: "10px 13px", lineHeight: 1.5,
                  }}>
                    {error}
                    {txHash && (
                      <div style={{ marginTop: 6, fontSize: "0.7rem" }}>
                        TX enviado —{" "}
                        <a
                          href={`https://suprascan.io/tx/${txHash.startsWith("0x") ? txHash.slice(2) : txHash}`}
                          target="_blank" rel="noreferrer"
                          style={{ color: C.accent2 }}
                        >ver no explorer ↗</a>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
