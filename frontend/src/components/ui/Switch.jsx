import { C } from "../../theme";

/* A pill-style toggle switch — used for "enabled" states across the
   Channels and Automation tabs. Replaces plain checkboxes for a more
   fluid, modern feel with an animated knob. */
export function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 42, height: 24, borderRadius: 20, border: `1px solid ${checked ? C.accent : C.border}`,
        background: checked ? `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` : C.raised,
        position: "relative", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
        transition: "background 0.25s, border-color 0.25s", padding: 0, flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%",
        background: "#fff", transition: "left 0.22s cubic-bezier(.4,0,.2,1)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}
