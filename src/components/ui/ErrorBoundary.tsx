'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  /** Short surface name shown in the fallback, e.g. "Track Map". */
  label: string;
  children: ReactNode;
  className?: string;
}

interface State {
  error: Error | null;
}

/**
 * Per-surface error boundary. One bad widget (a chart fed garbage, a WebGL
 * context loss) must never take down the whole page — it collapses to a
 * styled fallback with a retry, and everything around it keeps running.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${this.props.label}] crashed:`, error);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className={`panel flex flex-col items-center justify-center gap-2 h-full min-h-[120px] p-4 ${this.props.className ?? ''}`}
          role="alert"
        >
          <span className="label">{this.props.label}</span>
          <span className="mono text-xs text-[#FFD600]">surface failed to render</span>
          <button
            onClick={() => this.setState({ error: null })}
            className="mono text-[11px] px-3 py-1.5 border border-border-strong text-white hover:bg-[#ffffff0c]"
            style={{ borderRadius: 2 }}
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
