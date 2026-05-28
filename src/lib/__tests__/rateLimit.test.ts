import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  extractIp,
  applyRateLimitHeaders,
  resetRateLimitBuckets,
} from "../rateLimit";
import { NextRequest, NextResponse } from "next/server";
import type { RateLimitConfig } from "../types";

const defaultConfig: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 5,
};

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    vi.useRealTimers();
  });

  it("allows first request from IP, remaining = max - 1", () => {
    const result = checkRateLimit("192.168.1.1", defaultConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.reset).toBeGreaterThan(0);
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("192.168.1.1", defaultConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("blocks request when limit exceeded (allowed=false, remaining=0)", () => {
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.1", defaultConfig);
    }

    // 6th request should be blocked
    const blocked = checkRateLimit("192.168.1.1", defaultConfig);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("different IPs have independent counters", () => {
    // Exhaust IP 1
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.1", defaultConfig);
    }

    // IP 1 should be blocked
    expect(checkRateLimit("192.168.1.1", defaultConfig).allowed).toBe(false);

    // IP 2 should be unaffected
    const ip2Result = checkRateLimit("192.168.1.2", defaultConfig);
    expect(ip2Result.allowed).toBe(true);
    expect(ip2Result.remaining).toBe(4);

    // IP 3 should also be clean
    const ip3Result = checkRateLimit("10.0.0.1", defaultConfig);
    expect(ip3Result.allowed).toBe(true);
    expect(ip3Result.remaining).toBe(4);
  });

  it("window resets after windowMs passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.1", defaultConfig);
    }

    // 6th request should be blocked
    expect(checkRateLimit("192.168.1.1", defaultConfig).allowed).toBe(false);

    // Advance just past the window (60s + 1ms)
    vi.advanceTimersByTime(60_001);

    // Now should be allowed again (all old timestamps are stale)
    const afterReset = checkRateLimit("192.168.1.1", defaultConfig);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(4);

    vi.useRealTimers();
  });

  it("prunes stale timestamps so old requests don't block forever", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

    // Send 3 requests at T=0
    for (let i = 0; i < 3; i++) {
      checkRateLimit("10.0.0.5", defaultConfig);
    }

    // Advance 30 seconds — still inside window
    vi.advanceTimersByTime(30_000);

    // Send 2 more requests (total = 5, limit reached)
    let result = checkRateLimit("10.0.0.5", defaultConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);

    result = checkRateLimit("10.0.0.5", defaultConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);

    // 6th should be blocked
    expect(checkRateLimit("10.0.0.5", defaultConfig).allowed).toBe(false);

    // Advance past the first 3 timestamps' window (30s more = 60s total from first 3)
    // The first 3 should be pruned, leaving only the last 2 + current window
    vi.advanceTimersByTime(30_001);

    // Now the first 3 are stale, so we have 2 active timestamps
    // Next request should be allowed (remaining slots)
    const afterPrune = checkRateLimit("10.0.0.5", defaultConfig);
    expect(afterPrune.allowed).toBe(true);
    // We had 2 active, now 3 active → remaining = 5 - 3 = 2
    expect(afterPrune.remaining).toBe(2);

    vi.useRealTimers();
  });

  it("works with various window sizes and maxRequests configs", () => {
    const tinyConfig: RateLimitConfig = { windowMs: 1000, maxRequests: 2 };

    const r1 = checkRateLimit("ip-a", tinyConfig);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = checkRateLimit("ip-a", tinyConfig);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    // 3rd should be blocked
    expect(checkRateLimit("ip-a", tinyConfig).allowed).toBe(false);

    resetRateLimitBuckets();

    const largeConfig: RateLimitConfig = { windowMs: 300_000, maxRequests: 100 };
    const r = checkRateLimit("ip-b", largeConfig);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(99);
  });

  it("shared 'unknown' bucket when no IP is provided", () => {
    // Two calls with "unknown" IP share the same bucket
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 3 };

    const r1 = checkRateLimit("unknown", config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit("unknown", config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit("unknown", config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th "unknown" should be blocked
    expect(checkRateLimit("unknown", config).allowed).toBe(false);
  });
});

describe("extractIp", () => {
  it("uses request.ip when available (highest priority)", () => {
    const request = new NextRequest("http://localhost:3000/api/test");
    Object.defineProperty(request, "ip", { value: "192.0.2.1", writable: false });
    expect(extractIp(request)).toBe("192.0.2.1");
  });

  it("falls back to x-forwarded-for when request.ip is absent", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(extractIp(request)).toBe("203.0.113.1");
  });

  it("extracts single IP from x-forwarded-for", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "198.51.100.42" },
    });
    expect(extractIp(request)).toBe("198.51.100.42");
  });

  it("returns 'unknown' when neither request.ip nor headers are present", () => {
    const request = new NextRequest("http://localhost:3000/api/test");
    expect(extractIp(request)).toBe("unknown");
  });

  it("prefers request.ip over x-forwarded-for when both are present", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "203.0.113.50, 10.0.0.2" },
    });
    Object.defineProperty(request, "ip", { value: "192.0.2.99", writable: false });
    expect(extractIp(request)).toBe("192.0.2.99");
  });
});

describe("applyRateLimitHeaders", () => {
  it("sets X-RateLimit-Remaining and X-RateLimit-Reset headers", () => {
    const response = NextResponse.json({ ok: true });
    const result = { allowed: true, remaining: 4, reset: 1716930600 };

    const modified = applyRateLimitHeaders(response, result);
    expect(modified.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(modified.headers.get("X-RateLimit-Reset")).toBe("1716930600");
  });

  it("sets remaining=0 for blocked requests", () => {
    const response = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const result = { allowed: false, remaining: 0, reset: 1716930600 };

    const modified = applyRateLimitHeaders(response, result);
    expect(modified.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(modified.headers.get("X-RateLimit-Reset")).toBe("1716930600");
  });

  it("returns the same response object", () => {
    const response = NextResponse.json({});
    const result = { allowed: true, remaining: 9, reset: 1716930600 };
    const modified = applyRateLimitHeaders(response, result);
    expect(modified).toBe(response);
  });
});

describe("resetRateLimitBuckets", () => {
  it("clears all rate-limit state", () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 2 };

    // Exhaust the limit
    checkRateLimit("ip-1", config);
    checkRateLimit("ip-1", config);
    expect(checkRateLimit("ip-1", config).allowed).toBe(false);

    // Reset
    resetRateLimitBuckets();

    // Should be clean
    const fresh = checkRateLimit("ip-1", config);
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(1);
  });
});
