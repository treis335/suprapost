import { useState, useEffect } from "react";
import { C } from "../../theme";
import { depositSupra } from "../../payment";

const fmt = (n) => Number(n ?? 0).toFixed(2);

export function DepositModal({ wallet, walletAddress, onCredited, onClose }) {
  const [amount, setAmount] = useState(10);
  const [status, setStatus] = useState(null);
  const [error, setError]   = useState("");
  const [txHash, setTxHash] = useState("");
  const [done, setDone]     = useState(false);

  // Fechar com Escape
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Bloquear scroll do body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleDeposit() {
    setError(""); setTxHash(""); setDone(false);
    const result = await depositSupra(walletAddress, Number(amount), setStatus);
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
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,6,18,0.8)", backdropFilter: "blur(6px)",
        animation: "fadeIn 0.18s ease both",
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 201,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        pointerEvents: "none",
      }}>
        <div style={{
          background: `linear-gradient(160deg, ${C.surface2} 0%, ${C.surface} 100%)`,
          border: `1px solid ${C.border}`, borderRadius: 20, width: "100%", maxWidth: 380,
          boxShadow: "0 32px 80px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset",
          pointerEvents: "auto",
          animation: "scaleIn 0.2s cubic-bezier(.2,.8,.2,1) both",
        }}>

          {/* Header */}
          <div style={{
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: C.display }}>Deposit SUPRA</div>
              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>
                Balance: <span style={{ color: C.supra, fontFamily: C.mono, fontWeight: 600 }}>{fmt(wallet.balance)} SUPRA</span>
              </div>
            </div>
            <button onClick={onClose} style={{
              all: "unset", cursor: "pointer", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 7, color: C.muted, fontSize: "1rem",
              background: C.raised, border: `1px solid ${C.border}`,
            }}>✕</button>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 20px 20px" }}>
            {done ? (
              <div className="scale-in" style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px",
                  background: `${C.supra}18`, border: `2px solid ${C.supra}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem", color: C.supra,
                }}>✓</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: C.supra, marginBottom: 6 }}>
                  {amount} SUPRA adicionados!
                </div>
                <div style={{ fontSize: "0.78rem", color: C.text2, marginBottom: 16, lineHeight: 1.5 }}>
                  O teu saldo foi atualizado.
                </div>
                {txHash && (
                  <div style={{ marginBottom: 16 }}>
                    <a href={`https://suprascan.io/tx/${txHash.replace("0x", "")}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: "0.72rem", color: C.accent2, fontFamily: C.mono, textDecoration: "none" }}>
                      Ver no SupraScan ↗
                    </a>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button onClick={reset} style={{
                    all: "unset", cursor: "pointer", padding: "8px 16px", borderRadius: 9,
                    fontSize: "0.8rem", fontWeight: 600, color: C.text2,
                    background: C.raised, border: `1px solid ${C.border}`,
                  }}>Depositar mais</button>
                  <button onClick={onClose} style={{
                    all: "unset", cursor: "pointer", padding: "8px 16px", borderRadius: 9,
                    fontSize: "0.8rem", fontWeight: 600, color: "#fff",
                    background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`,
                  }}>Fechar</button>
                </div>
              </div>
            ) : (
              <>
                {/* Input + botão */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      type="number" min="1" value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={!!status}
                      style={{
                        width: "100%", background: C.bg,
                        border: `1.5px solid ${C.border}`, borderRadius: 10,
                        color: C.text, fontFamily: C.mono, fontSize: "1rem", fontWeight: 600,
                        padding: "11px 52px 11px 14px", outline: "none", boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = C.supra; e.target.style.boxShadow = `0 0 0 3px ${C.supra}22`; }}
                      onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                    />
                    <span style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      fontFamily: C.mono, fontSize: "0.72rem", color: C.muted, fontWeight: 600, pointerEvents: "none",
                    }}>SUPRA</span>
                  </div>
                  <button
                    onClick={handleDeposit}
                    disabled={!!status || Number(amount) <= 0}
                    style={{
                      all: "unset", cursor: !!status ? "not-allowed" : "pointer",
                      opacity: !!status || Number(amount) <= 0 ? 0.5 : 1,
                      padding: "11px 18px", borderRadius: 10, fontWeight: 700,
                      fontSize: "0.86rem", color: "#0a1f13", fontFamily: C.sans,
                      background: `${C.supra}cc`, whiteSpace: "nowrap",
                      transition: "filter 0.15s, transform 0.1s",
                      display: "flex", alignItems: "center", gap: 7,
                    }}
                    onMouseEnter={(e) => { if (!status) e.currentTarget.style.filter = "brightness(1.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
                    onMouseDown={(e) => { if (!status) e.currentTarget.style.transform = "scale(0.97)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {status ? (
                      <>
                        <span style={{
                          width: 7, height: 7, borderRadius: "50%", background: "#0a1f13",
                          animation: "softPulse 1s ease-in-out infinite", display: "inline-block",
                        }} />
                        {status.message || "A processar..."}
                      </>
                    ) : "Depositar"}
                  </button>
                </div>

                {/* Presets rápidos */}
                <div style={{ display: "flex", gap: 6, marginBottom: error ? 12 : 0 }}>
                  {[10, 25, 50, 100].map((p) => (
                    <button key={p} onClick={() => setAmount(p)} disabled={!!status} style={{
                      all: "unset", cursor: "pointer", flex: 1, textAlign: "center",
                      padding: "6px 0", borderRadius: 7,
                      fontSize: "0.76rem", fontFamily: C.mono, fontWeight: 600,
                      border: `1px solid ${Number(amount) === p ? C.supra : C.border}`,
                      background: Number(amount) === p ? `${C.supra}14` : C.raised,
                      color: Number(amount) === p ? C.supra : C.muted,
                      transition: "all 0.15s",
                    }}>{p}</button>
                  ))}
                </div>

                {error && (
                  <div className="fade-up" style={{
                    marginTop: 12, fontSize: "0.76rem", color: C.danger,
                    background: `${C.danger}12`, border: `1px solid ${C.danger}33`,
                    borderRadius: 8, padding: "9px 13px", lineHeight: 1.5,
                  }}>
                    {error}
                    {txHash && (
                      <div style={{ marginTop: 5, fontSize: "0.7rem" }}>
                        TX enviada —{" "}
                        <a href={`https://suprascan.io/tx/${txHash.replace("0x","")}`}
                          target="_blank" rel="noreferrer" style={{ color: C.accent2 }}>
                          ver no explorer ↗
                        </a>
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
