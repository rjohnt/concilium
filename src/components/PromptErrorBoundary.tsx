"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface PromptErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface PromptErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class PromptErrorBoundary extends Component<PromptErrorBoundaryProps, PromptErrorBoundaryState> {
  constructor(props: PromptErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: unknown): PromptErrorBoundaryState {
    return {
      hasError: true,
      error: error instanceof Error ? error : null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      "PromptErrorBoundary caught an error:",
      error,
      errorInfo.componentStack
    );
  }

  handleReset(): void {
    this.setState({ hasError: false, error: null });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Allow custom fallback override (used in tests)
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message;

      return (
        <div className="max-w-5xl mx-auto">
          <div className="card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-cardinal/30 flex items-center justify-center mb-6">
              <AlertTriangle size={36} className="text-cardinal" />
            </div>
            <h2 className="text-2xl font-bold text-ink-primary mb-3">
              Session Ran Into an Issue
            </h2>
            <p className="text-ink-secondary max-w-md mb-2 leading-relaxed">
              The prompt session encountered an unexpected error. You can try
              recovering, or return to the dashboard.
            </p>
            {errorMessage && (
              <p className="text-xs text-ink-muted font-mono mb-8">
                {errorMessage}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button onClick={this.handleReset} className="btn-primary">
                <RefreshCw size={18} />
                Try Again
              </button>
              <Link href="/" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PromptErrorBoundary;
