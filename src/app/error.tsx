"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Application error:", error);
    }
  }, [error]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="card flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-cardinal/30 flex items-center justify-center mb-6">
          <AlertTriangle size={36} className="text-cardinal" />
        </div>
        <h2 className="text-2xl font-bold text-ink-primary mb-3">
          Something Went Wrong
        </h2>
        <p className="text-ink-secondary max-w-md mb-2 leading-relaxed">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-ink-muted font-mono mb-8">
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
