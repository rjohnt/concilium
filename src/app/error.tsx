"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: Props) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="card flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-cardinal-900/20 border border-cardinal-800 flex items-center justify-center mb-6">
          <AlertTriangle size={36} className="text-cardinal-400" />
        </div>
        <h2 className="text-2xl font-bold text-ink-primary mb-3">
          Something went wrong
        </h2>
        <p className="text-ink-secondary max-w-md mb-2 leading-relaxed">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-ink-muted mb-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button onClick={reset} className="btn-primary">
          <RefreshCw size={18} />
          Try Again
        </button>
      </div>
    </div>
  );
}
