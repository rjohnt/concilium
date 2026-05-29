import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callDeepSeek, DEEPSEEK_PRO_MODEL } from "../llm";
import type { LLMRequest, LLMResponse } from "../llm";

const TEST_API_KEY = "sk-test-key-123456";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

/** Helper: build a fetch Response-like object */
function mockResponse(status: number, body: unknown, ok = status >= 200 && status < 300) {
  const bodyText = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok,
    status,
    text: () => Promise.resolve(bodyText),
    json: () => Promise.resolve(typeof body === "string" ? JSON.parse(body) : body),
  };
}

/** Helper: build a minimal valid DeepSeek API success payload */
function mockSuccessPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "cmpl-abc123",
    object: "chat.completion",
    created: 1716930000,
    model: "deepseek-v4-flash",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Hello, I am DeepSeek.",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 25,
      completion_tokens: 8,
      total_tokens: 33,
    },
    ...overrides,
  };
}

describe("callDeepSeek", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    process.env.DEEPSEEK_API_KEY = TEST_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DEEPSEEK_API_KEY;
  });

  // ── Ticket item 1: Mock fetch globally ─────────────────────────
  it("uses the mocked fetch (global fetch is vi.fn)", () => {
    expect(globalThis.fetch).toBe(mockFetch);
  });

  // ── Ticket item 4: API key error ───────────────────────────────
  it("throws when DEEPSEEK_API_KEY is not set", async () => {
    delete process.env.DEEPSEEK_API_KEY;

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DEEPSEEK_API_KEY");
  });

  // ── Ticket item 2: Constructs correct request body ─────────────
  it("sends correct URL, method, headers, and body", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, mockSuccessPayload()));

    await callDeepSeek({
      systemPrompt: "You are helpful.",
      userPrompt: "What is 2+2?",
      expectJson: false,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(DEEPSEEK_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: `Bearer ${TEST_API_KEY}`,
    });

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.messages).toEqual([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "What is 2+2?" },
    ]);
    expect(body.max_tokens).toBe(2048);
    expect(body.temperature).toBe(0.7);
  });

  it("uses custom model when provided in request", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, mockSuccessPayload()));

    await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: false,
      model: DEEPSEEK_PRO_MODEL,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.model).toBe(DEEPSEEK_PRO_MODEL);
  });

  it("defaults model to deepseek-v4-flash when not specified", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, mockSuccessPayload()));

    await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: false,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.model).toBe("deepseek-v4-flash");
  });

  // ── Ticket item 8: expectJson option ───────────────────────────
  it("adds response_format json_object when expectJson is true", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, mockSuccessPayload()));

    await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: true,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("does NOT add response_format when expectJson is false", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, mockSuccessPayload()));

    await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: false,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body).not.toHaveProperty("response_format");
  });

  // ── Ticket item 3: Successful response parsing ─────────────────
  it("returns LLMResponse with content, model, and usage on success", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, mockSuccessPayload())
    );

    const result = await callDeepSeek({
      systemPrompt: "You are helpful.",
      userPrompt: "Say hello.",
      expectJson: false,
    });

    expect(result).toEqual<LLMResponse>({
      content: "Hello, I am DeepSeek.",
      model: "deepseek-v4-flash",
      usage: {
        promptTokens: 25,
        completionTokens: 8,
        totalTokens: 33,
      },
    });
  });

  it("returns content from the first choice's message.content", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(
        200,
        mockSuccessPayload({
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Custom response text." },
              finish_reason: "stop",
            },
          ],
        })
      )
    );

    const result = await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: false,
    });

    expect(result.content).toBe("Custom response text.");
  });

  it("falls back model to deepseek-v4-flash when API response has no model field", async () => {
    const payload = mockSuccessPayload();
    delete (payload as any).model; // any cast needed to test missing-field fallback behavior

    mockFetch.mockResolvedValue(mockResponse(200, payload));

    const result = await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: false,
    });

    expect(result.model).toBe("deepseek-v4-flash");
  });

  // ── Ticket item 10: Usage field fallback ───────────────────────
  it("falls back usage to 0/0/0 when API returns no usage data", async () => {
    const payload = mockSuccessPayload();
    delete (payload as any).usage; // any cast needed to test missing-field fallback behavior

    mockFetch.mockResolvedValue(mockResponse(200, payload));

    const result = await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: false,
    });

    expect(result.usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("falls back individual usage fields when partially missing", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(
        200,
        mockSuccessPayload({
          usage: { prompt_tokens: 10 },
          // completion_tokens and total_tokens missing
        })
      )
    );

    const result = await callDeepSeek({
      systemPrompt: "S",
      userPrompt: "U",
      expectJson: false,
    });

    expect(result.usage.promptTokens).toBe(10);
    expect(result.usage.completionTokens).toBe(0);
    expect(result.usage.totalTokens).toBe(0);
  });

  // ── Ticket item 9: Empty response (no choices) ─────────────────
  it("throws when API returns no choices array", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        id: "cmpl-abc",
        object: "chat.completion",
        model: "deepseek-v4-flash",
        choices: [],
      })
    );

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API returned empty response");
  });

  it("throws when choice has no message", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        id: "cmpl-abc",
        model: "deepseek-v4-flash",
        choices: [{ index: 0, finish_reason: "stop" }],
      })
    );

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API returned empty response");
  });

  it("throws when message.content is falsy (empty string)", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        id: "cmpl-abc",
        model: "deepseek-v4-flash",
        choices: [{ index: 0, message: { role: "assistant", content: "" } }],
      })
    );

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API returned empty response");
  });

  it("throws when choices is not an array (undefined)", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        id: "cmpl-abc",
        model: "deepseek-v4-flash",
      })
    );

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API returned empty response");
  });

  // ── Ticket item 5: Network error handling ──────────────────────
  it("throws when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("ECONNREFUSED");
  });

  it("propagates the original error from a fetch rejection", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("Failed to fetch");
  });

  // ── Ticket item 6: Non-200 response handling ───────────────────
  it("throws with status and error body on non-200 response", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(401, "Invalid API key", false)
    );

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API error (401): Invalid API key");
  });

  it("throws with status and error body on 500 response", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(500, "Internal server error", false)
    );

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API error (500): Internal server error");
  });

  it("throws with status and error body on 429 (rate limit) response", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(429, "Too many requests", false)
    );

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API error (429): Too many requests");
  });

  it("falls back to 'no error body' when response.text() fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.reject(new Error("body read failed")),
    });

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow("DeepSeek API error (503): no error body");
  });

  // ── Ticket item 7: JSON parse failure ─────────────────────────
  it("throws when response.json() fails on a 200 response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("not valid json {{{"),
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await expect(
      callDeepSeek({ systemPrompt: "S", userPrompt: "U", expectJson: false })
    ).rejects.toThrow();
  });
});
