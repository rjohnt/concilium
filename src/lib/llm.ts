/**
 * DeepSeek V4 Flash API client for the Concilium mediator.
 * Reads DEEPSEEK_API_KEY from environment (set on Railway).
 */

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-v4-flash";
export const DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Expect JSON response from the model */
  expectJson: boolean;
  /** Optional model override (defaults to DEEPSEEK_MODEL) */
  model?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function getApiKey(): string {
  const key =
    process.env.DEEPSEEK_API_KEY;

  if (!key) {
    throw new Error(
      "DEEPSEEK_API_KEY environment variable is not set. " +
        "Add it to Railway: railway variables set DEEPSEEK_API_KEY=<key>"
    );
  }
  return key;
}

/**
 * Send a prompt to DeepSeek V4 Flash and return the response.
 * Designed for the mediator — structured persona-aware feedback generation.
 */
export async function callDeepSeek(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getApiKey();

  const messages = [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.userPrompt },
  ];

  const body: Record<string, unknown> = {
    model: request.model ?? DEEPSEEK_MODEL,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  };

  if (request.expectJson) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "no error body");
    throw new Error(
      `DeepSeek API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error("DeepSeek API returned empty response");
  }

  return {
    content: choice.message.content,
    model: data.model ?? DEEPSEEK_MODEL,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}
