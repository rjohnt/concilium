"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="card flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-900/30 flex items-center justify-center mb-6">
          <AlertTriangle size={36} className="text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Something Went Wrong
        </h2>
        <p className="text-gray-400 max-w-md mb-2 leading-relaxed">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-600 font-mono mb-8">
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
