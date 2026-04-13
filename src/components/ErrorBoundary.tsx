import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlassCard } from './ui/GlassCard';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <GlassCard padding="2rem" className="max-w-md w-full border-danger/20 glow-danger">
            <h2 className="font-heading text-xl font-bold text-white mb-2">Something broke.</h2>
            <p className="text-sm text-white/50 mb-6 font-medium">
              ARDSOFT encountered an unexpected rendering error.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-danger text-white font-heading font-bold text-sm mb-4"
            >
              Retry
            </button>

            <details className="cursor-pointer">
              <summary className="text-[10px] text-white/20 uppercase tracking-widest hover:text-white/40">Error Detail</summary>
              <pre className="mt-2 p-3 rounded-lg bg-black/40 text-[10px] text-danger/80 overflow-auto max-h-40 font-mono">
                {this.state.error?.message}
                {"\n"}
                {this.state.error?.stack}
              </pre>
            </details>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
