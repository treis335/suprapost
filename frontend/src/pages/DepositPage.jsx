import { useState } from "react";
import { C, fmt } from "../theme";
import { Card, Btn, Pill } from "../components/ui";
import { depositSupra } from "../payment";
import { getSession } from "../wallet";

/* ── Deposit history ───────────────────────────────────────────── */
function DepositHistory() {
  const [deposits, setDeposits] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const session = getSession();
      const res = await fetch("/api/wallet/deposits", {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      });
      const data = await res.json();
      setDeposits(data.ok ? data.deposits : []);
    } catch {
      setDeposits([]);
    }
  }

  function toggle() {
    if (!open && deposits === null) load();
    setOpen((o) => !o);
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString("pt-PT", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function shortHash(h) {
    if (!h) return "—";
    return h.slice(0, 8) + "…" + h.slice(-6);
  }

  function explorerUrl(hash) {
    const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
    return `https://suprascan.io/tx/${clean}`;
  }

  return (
    <div>
      <button
        onClick={toggle}
        style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: "0.78rem", color: C.text2, fontWeight: 500,
          padding: "10px 0",
        }}
      >
        <span style={{
          fontSize: "0.6rem", transition: "transform 0.2s",
          display: "inline-block", transform: open ? "rotate(90deg)" : "none",
        }}>▶</span>
        Transaction history
      </button>

      {open && (
        <div className="fade-up" style={{ marginTop: 4 }}>
          {deposits === null && (
            <div style={{ fontSize: "0.76rem", color: C.muted, padding: "10px 0" }}>Loading…</div>
          )}
          {deposits !== null && deposits.length === 0 && (
            <div style={{ fontSize: "0.76rem", color: C.muted, padding: "10px 0" }}>No deposits yet.</div>
          )}
          {deposits !== null && deposits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {deposits.map((d) => (
                <div key={d.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: C.surface2, borderRadius: 10, padding: "10px 14px", fontSize: "0.77rem",
                  border: `1px solid ${C.border}`,
                }}>
                  <div>
                    <div style={{ color: C.supra, fontWeight: 700, fontFamily: C.mono }}>+{d.amount} SUPRA</div>
                    <div style={{ color: C.muted, marginTop: 3, fontSize: "0.7rem" }}>{fmtDate(d.createdAt)}</div>
                  </div>
                  {d.txHash ? (
                    <a
                      href={explorerUrl(d.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: C.accent2, textDecoration: "none", fontFamily: C.mono, fontSize: "0.7rem" }}
                      title={d.txHash}
                    >
                      {shortHash(d.txHash)} ↗
                    </a>
                  ) : (
                    <span style={{ color: C.muted, fontFamily: C.mono, fontSize: "0.7rem" }}>—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Quick-select amounts ──────────────────────────────────────── */
const PRESETS = [10, 25, 50, 100];

/* ── Main page ─────────────────────────────────────────────────── */
export function DepositPage({ isMobile, wallet, walletAddress, onCredited }) {
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError]   = useState("");
  const [txHash, setTxHash] = useState("");
  const [done, setDone]     = useState(false);

  const finalAmount = custom !== "" ? Number(custom) : amount;

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
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>
            Deposit SUPRA
          </div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>
            Add funds to your account to generate and publish posts.
          </div>
        </div>
      )}

      {/* ── Balance card ──── */}
      <Card accentTop={C.supra}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.66rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
              Current balance
            </div>
            <div style={{ fontFamily: C.mono, fontSize: "2.4rem", fontWeight: 700, color: C.supra, lineHeight: 1 }}>
              {fmt(wallet.balance)}
              <span style={{ fontSize: "0.9rem", color: C.muted, fontWeight: 400, marginLeft: 8 }}>SUPRA</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", color: C.muted }}>Cost per post</div>
            <div style={{ fontFamily: C.mono, fontSize: "1.1rem", color: C.text, fontWeight: 600, marginTop: 3 }}>
              {fmt(wallet.costPerPost)} SUPRA
            </div>
          </div>
        </div>
      </Card>

      {/* ── Deposit form ──── */}
      <Card eyebrow="Deposit" title="Add SUPRA">
        {done ? (
          <div className="scale-in" style={{ textAlign: "center", padding: "16px 0" }}>
            {/* Success */}
            <div style={{
              width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
              background: `${C.supra}18`, border: `2px solid ${C.supra}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
            }}>✓</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: C.supra, marginBottom: 6 }}>
              {finalAmount} SUPRA added
            </div>
            <div style={{ fontSize: "0.8rem", color: C.text2, marginBottom: txHash ? 12 : 20 }}>
              Your balance has been updated.
            </div>
            {txHash && (
              <div style={{ marginBottom: 20 }}>
                <a
                  href={`https://suprascan.io/tx/${txHash.startsWith("0x") ? txHash.slice(2) : txHash}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: "0.74rem", color: C.accent2, fontFamily: C.mono, textDecoration: "none" }}
                >
                  View transaction ↗
                </a>
              </div>
            )}
            <Btn variant="ghost" size="sm" onClick={reset}>Deposit more</Btn>
          </div>
        ) : (
          <>
            {/* Preset amounts */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: "0.74rem", color: C.text2, fontWeight: 500, marginBottom: 10 }}>Amount</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setAmount(p); setCustom(""); }}
                    style={{
                      flex: "1 1 60px",
                      padding: "10px 0", borderRadius: 10, cursor: "pointer",
                      fontFamily: C.mono, fontWeight: 700, fontSize: "0.9rem",
                      border: `1.5px solid ${amount === p && custom === "" ? C.supra : C.border}`,
                      background: amount === p && custom === ""
                        ? `${C.supra}16`
                        : C.raised,
                      color: amount === p && custom === "" ? C.supra : C.text2,
                      transition: "all 0.18s",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: "0.74rem", color: C.text2, fontWeight: 500, marginBottom: 8 }}>
                Or enter a custom amount
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  disabled={!!status}
                  style={{
                    width: "100%", background: C.bg, border: `1.5px solid ${custom !== "" ? C.supra : C.border}`,
                    borderRadius: 10, color: C.text, fontFamily: C.mono,
                    fontSize: "1.1rem", fontWeight: 600, padding: "12px 60px 12px 16px",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = C.supra; e.target.style.boxShadow = `0 0 0 3px ${C.supra}22`; }}
                  onBlur={(e) => { if (custom === "") { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; } }}
                />
                <span style={{
                  position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                  fontFamily: C.mono, fontSize: "0.8rem", color: C.muted, fontWeight: 600,
                }}>SUPRA</span>
              </div>
            </div>

            {/* CTA */}
            <Btn
              variant="supra"
              full
              size="lg"
              onClick={handleDeposit}
              disabled={!!status || finalAmount <= 0}
            >
              {status ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: C.supra,
                    animation: "softPulse 1s ease-in-out infinite",
                    display: "inline-block", flexShrink: 0,
                  }} />
                  {status.message || "Processing…"}
                </span>
              ) : (
                `Deposit ${finalAmount > 0 ? finalAmount : ""} SUPRA`
              )}
            </Btn>

            {error && (
              <div className="fade-up" style={{
                marginTop: 12, fontSize: "0.78rem", color: C.danger,
                background: `${C.danger}12`, border: `1px solid ${C.danger}33`,
                borderRadius: 8, padding: "10px 13px", lineHeight: 1.5,
              }}>
                {error}
                {txHash && (
                  <div style={{ marginTop: 6, color: C.muted, fontFamily: C.mono, fontSize: "0.7rem" }}>
                    TX submitted —{" "}
                    <a href={`https://suprascan.io/tx/${txHash.startsWith("0x") ? txHash.slice(2) : txHash}`}
                      target="_blank" rel="noreferrer" style={{ color: C.accent2 }}>
                      view on explorer ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── History ──── */}
      <Card>
        <DepositHistory />
      </Card>
    </div>
  );
}
