"use client";

import { XCircle, RefreshCw, Loader2, AlertTriangle } from "lucide-react";

interface BuildRetryCardProps {
  errorMessage?: string;
  buildRetryCount?: number;
  isRetrying: boolean;
  onRetry?: () => void;
}

export function BuildRetryCard({
  errorMessage,
  buildRetryCount = 0,
  isRetrying,
  onRetry,
}: BuildRetryCardProps) {
  const attempts = buildRetryCount + (isRetrying ? 1 : 0);
  const maxedOut = buildRetryCount >= 3;

  return (
    <div className="card border-cardinal/30 bg-cardinal/5">
      {/* Header: XCircle icon + title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cardinal/10 flex items-center justify-center">
          <XCircle size={20} className="text-cardinal" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-cardinal">
            Build Generation Failed
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            {maxedOut
              ? "Maximum retry attempts reached"
              : `Attempt ${attempts} of 3`}
          </p>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-cardinal/10 border border-cardinal/20">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-cardinal mt-0.5 flex-shrink-0" />
            <p className="text-xs text-ink-secondary leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Terminal message after 3 failures */}
      {maxedOut && (
        <div className="mb-4 p-3 rounded-lg bg-elevated/50 border border-border-subtle">
          <p className="text-xs text-ink-muted font-mono leading-relaxed">
            <span className="text-cardinal">$</span> build --retry
            {"\n"}
            <span className="text-cardinal">error:</span> Build generation failed
            after 3 attempts. The AI service may be experiencing issues. Please
            try again later or check your API configuration.
          </p>
        </div>
      )}

      {/* Spinner when retrying */}
      {isRetrying && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-steel/10 border border-blue-steel/20">
          <Loader2 size={14} className="animate-spin text-blue-steel" />
          <span className="text-xs text-blue-steel">
            Retrying build... Attempt {Math.min(buildRetryCount + 1, 3)} of 3
          </span>
        </div>
      )}

      {/* Retry Build button — always present */}
      <button
        onClick={onRetry}
        disabled={isRetrying || maxedOut}
        className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRetrying ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Retrying...
          </>
        ) : maxedOut ? (
          <>
            <XCircle size={16} />
            Max Retries Reached
          </>
        ) : (
          <>
            <RefreshCw size={16} />
            Retry Build
          </>
        )}
      </button>
    </div>
  );
}
