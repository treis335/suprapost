import { useState } from "react";
import { C } from "./theme";
import { depositSupra } from "./payment";

// Reusable component — used in SetupPage and anywhere a deposit is needed
export function TopUpFlow({ walletAddress, onCredited }) {
  const [amount, setAmount]   = useState(10);
  const [status, setStatus]   = useState(null);
  const [error, setError]     = useState("");
  const [txHash, setTxHash]   = useState("");
  const [done, setDone]       = useState(false);

  const PRESETS = [5, 10, 25, 50];

  async function handleDeposit() {
    setError(""); setTxHash(""); setDone(false);
    const result = await depositSupra(walletAddress, Number(amount), setStatus);
    setStatus(null);
    if (result.ok) {
      setDone(true);
      if (result.txHash) setTxHash(result.txHash);
      onCredited?.();
    } else {
      setError(result.error || "Deposit failed");
      if (result.txHash) setTxHash(result.txHash);
    }
  }

  function reset() { setDone(false); setError(""); setStatus(null); setTxHash(""); }

  if (done) {
    return (
      <div className="scale-in">
        <div style={{ fontSize: "0.9rem", color: C.supra, fontWeight: 600, marginBottom: 8 }}>
          ✓ {amount} SUPRA added to balance
        </div>
        {txHash && (
          <div style={{ fontSize: "0.72rem", color: C.muted, marginBottom: 12 }}>
            <a href={`https://suprascan.io/tx/${txHash.replace("0x","")}`}
              target="_blank" rel="noreferrer" style={{ color: C.accent2, textDecoration: "none" }}>
              View transaction on SupraScan ↗
            </a>
          </div>
        )}
        <button onClick={reset} style={{
          all: "unset", cursor: "pointer", fontSize: "0.78rem", color: C.accent,
          fontWeight: 600, textDecoration: "underline",
        }}>Make another deposit</button>
      </div>
    );
  }

  return (
    <div>
      {/* Quick presets */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {PRESETS.map((p) => (
          <button key={p} onClick={() => setAmount(p)} disabled={!!status} style={{
            all: "unset", cursor: "pointer", flex: 1, textAlign: "center",
            padding: "7px 0", borderRadius: 8,
            fontSize: "0.8rem", fontFamily: "var(--font-mono, monospace)", fontWeight: 600,
            border: `1.5px solid ${Number(amount) === p ? C.supra : C.border}`,
            background: Number(amount) === p ? `${C.supra}14` : C.raised,
            color: Number(amount) === p ? C.supra : C.muted,
            transition: "all 0.15s",
          }}>{p}</button>
        ))}
      </div>

      {/* Input + button */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="number" min="1" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!!status}
            style={{
              width: "100%", background: C.bg,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10, color: C.text,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "1rem", fontWeight: 600,
              padding: "10px 52px 10px 14px",
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = C.supra; }}
            onBlur={(e) => { e.target.style.borderColor = C.border; }}
          />
          <span style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            fontSize: "0.72rem", color: C.muted, fontWeight: 600, pointerEvents: "none",
          }}>SUPRA</span>
        </div>
        <button
          onClick={handleDeposit}
          disabled={!!status || Number(amount) <= 0}
          style={{
            all: "unset", cursor: !!status ? "not-allowed" : "pointer",
            opacity: !!status || Number(amount) <= 0 ? 0.5 : 1,
            padding: "10px 18px", borderRadius: 10, fontWeight: 700,
            fontSize: "0.86rem", color: "#0a1f13",
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
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0a1f13", animation: "softPulse 1s ease-in-out infinite", display: "inline-block" }} />
              {status.message || "A processar..."}
            </>
          ) : "Depositar"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: "0.75rem", color: C.danger, marginTop: 6, lineHeight: 1.5 }}>
          {error}
          {txHash && (
            <div style={{ marginTop: 4, color: C.muted }}>
              TX sent —{" "}
              <a href={`https://suprascan.io/tx/${txHash.replace("0x","")}`}
                target="_blank" rel="noreferrer" style={{ color: C.accent2 }}>
                view on explorer ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
