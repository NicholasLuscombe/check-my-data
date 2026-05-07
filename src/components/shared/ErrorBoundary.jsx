import React from "react";
import { C, FF, TF, FW, CR, SIGNAL, M } from "../../constants/tokens.js";

export class AnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[AnalysisErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: "700px", margin: "60px auto", padding: "32px", background: SIGNAL.RED.bg, border: `1px solid ${SIGNAL.RED.border}`, borderRadius: CR.LG, fontFamily: FF.UI }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "20px" }} aria-hidden="true">⚠</span>
            <span style={{ fontSize: TF.H2, fontWeight: FW.BOLD, color: SIGNAL.RED.text, ...M }}>Analysis Error</span>
          </div>
          <p style={{ fontSize: TF.BODY, color: C.TEXT, lineHeight: 1.5, marginBottom: "16px" }}>
            An unexpected error occurred while rendering the analysis results. Your data has not been lost.
          </p>
          <pre style={{ fontSize: TF.DETAIL, color: SIGNAL.RED.dot, background: C.WHITE, padding: "12px", borderRadius: CR.SM, overflow: "auto", maxHeight: "120px", marginBottom: "20px", border: `1px solid ${C.BORDER_L}` }}>
            {this.state.error?.message || "Unknown error"}
          </pre>
          <button
            onClick={() => { this.setState({ error: null, errorInfo: null }); this.props.onReset?.(); }}
            style={{ padding: "8px 20px", background: C.WHITE, border: `1px solid ${C.BORDER}`, borderRadius: CR.SM, cursor: "pointer", fontSize: TF.BODY, fontFamily: FF.UI, ...M }}
          >
            Back to Import
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
