/**
 * Sliding-window rate limiter for API endpoints.
 * Per-IP tracking using in-memory Map<string, number[]>.
 */

import { NextRequest, NextResponse } from "next/server";
import type { RateLimitConfig, RateLimitResult } from "./types";

/** Per-IP sliding-window buckets: IP → sorted array of request timestamps (ms) */
const buckets = new Map<string, number[]>();

/**
 * Check whether a request from the given IP is allowed under the rate limit.
 * Prunes stale timestamps outside the sliding window before checking.
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Get or create the timestamp array for this IP
  let timestamps = buckets.get(ip);
  if (!timestamps) {
    timestamps = [];
    buckets.set(ip, timestamps);
  }

  // Prune stale timestamps outside the sliding window
  const pruned = timestamps.filter((ts) => ts > cutoff);

  // Compute the earliest timestamp to determine when the window slides forward
  const oldest = pruned.length > 0 ? pruned[0] : now;
  const reset = Math.ceil((oldest + config.windowMs) / 1000);

  if (pruned.length >= config.maxRequests) {
    // Rate limit exceeded — do not add the current request
    // But we still update the bucket with the pruned list
    buckets.set(ip, pruned);
    return { allowed: false, remaining: 0, reset };
  }

  // Allow the request — record it
  pruned.push(now);
  buckets.set(ip, pruned);

  return {
    allowed: true,
    remaining: config.maxRequests - pruned.length,
    reset,
  };
}

/**
 * Extract the client IP from a NextRequest.
 * Checks common proxy/load-balancer headers, falling back to a sentinel.
 */
export function extractIp(request: NextRequest): string {
  // 1. First check request.ip — the built-in IP from the hosting platform/Next.js
  //    (available at runtime; not yet in NextRequest's type declarations)
  const platformIp = (request as unknown as { ip?: string | null }).ip;
  if (platformIp) return platformIp.trim();

  // 2. Fall back to x-forwarded-for (may contain comma-separated IPs; take the first)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  // 3. Fallback: use a constant sentinel. All requests without identifiable IP
  // share this bucket, so server-to-server callers without forwarding headers
  // are throttled together.
  return "unknown";
}

/**
 * Apply standard rate-limit headers to a NextResponse.
 * Mutates and returns the same response object for chaining.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
  return response;
}

/**
 * Reset all rate-limit buckets. Exported for test use only.
 * **Dangerous in production** — do not call outside test suites.
 */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}
