"use client"
import { Component, ReactNode } from "react"

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--adm-text-secondary)" }}>
          <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>Something went wrong</p>
          <p style={{ fontSize: "0.75rem" }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: "0.5rem", backgroundColor: "var(--adm-accent)", color: "var(--adm-accent-text)", border: "none", cursor: "pointer", fontSize: "0.75rem" }}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
