import { C } from "../../theme";

export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <div style={{ fontSize: "0.76rem", color: C.text2, marginBottom: 7, fontWeight: 500 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: "0.67rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
  color: C.text, fontFamily: C.sans, fontSize: "0.86rem", padding: "11px 14px",
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
};

export function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }}
    onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}22`; props.onFocus?.(e); }}
    onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; props.onBlur?.(e); }} />;
}

export function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontFamily: C.sans, lineHeight: 1.6, ...(props.style || {}) }}
    onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}22`; props.onFocus?.(e); }}
    onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; props.onBlur?.(e); }} />;
}

export function Select(props) {
  return <select {...props} style={{ ...inputStyle, cursor: "pointer", ...(props.style || {}) }} />;
}
