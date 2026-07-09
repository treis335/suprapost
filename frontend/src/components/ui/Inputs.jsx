import { C } from "../../theme";

export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div style={{
          fontSize: "0.7rem", color: C.text2,
          marginBottom: 6, fontWeight: 500,
          letterSpacing: "0.01em",
        }}>{label}</div>
      )}
      {children}
      {hint && (
        <div style={{
          fontSize: "0.65rem", color: C.muted,
          marginTop: 5, lineHeight: 1.5,
        }}>{hint}</div>
      )}
    </div>
  );
}

const base = {
  width: "100%",
  background: C.bg,
  border: `0.5px solid ${C.border}`,
  borderRadius: 9,
  color: C.text,
  fontFamily: C.sans,
  fontSize: "0.84rem",
  padding: "10px 13px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export function Input(props) {
  return (
    <input {...props} style={{ ...base, ...props.style }}
      onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 2.5px ${C.accent}1a`; props.onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; props.onBlur?.(e); }}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea {...props} style={{ ...base, minHeight: 80, resize: "vertical", lineHeight: 1.6, ...props.style }}
      onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 2.5px ${C.accent}1a`; props.onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; props.onBlur?.(e); }}
    />
  );
}

export function Select(props) {
  return (
    <select {...props} style={{ ...base, cursor: "pointer", ...props.style }} />
  );
}
