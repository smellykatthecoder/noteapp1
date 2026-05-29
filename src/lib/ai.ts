export type AIProvider = "openai" | "anthropic" | "groq" | "gemini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase().trim();
  if (provider === "anthropic") return "anthropic";
  if (provider === "groq") return "groq";
  if (provider === "gemini") return "gemini";
  return "openai";
}

function cleanEnvValue(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function getApiKey(): string {
  const provider = getAIProvider();
  if (provider === "anthropic") return cleanEnvValue(process.env.ANTHROPIC_API_KEY);
  if (provider === "groq") return cleanEnvValue(process.env.GROQ_API_KEY);
  if (provider === "gemini") {
    return (
      cleanEnvValue(process.env.GEMINI_API_KEY) ||
      cleanEnvValue(process.env.GOOGLE_API_KEY)
    );
  }
  return cleanEnvValue(process.env.OPENAI_API_KEY);
}

export function hasAIConfigured(): boolean {
  return Boolean(getApiKey());
}

export function getModel(): string {
  const provider = getAIProvider();
  if (provider === "anthropic") {
    return cleanEnvValue(process.env.ANTHROPIC_MODEL) || "claude-3-5-haiku-latest";
  }
  if (provider === "groq") {
    return cleanEnvValue(process.env.GROQ_MODEL) || "llama-3.1-8b-instant";
  }
  if (provider === "gemini") {
    return cleanEnvValue(process.env.GEMINI_MODEL) || "gemini-2.0-flash";
  }
  return cleanEnvValue(process.env.OPENAI_MODEL) || "gpt-4o-mini";
}

export async function completeJSON<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const raw = await completeChat(systemPrompt, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain valid JSON");
  }
  return JSON.parse(jsonMatch[0]) as T;
}

export async function completeChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return completeMessages([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

async function completeGemini(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get one at aistudio.google.com/apikey and add it to .env.local"
    );
  }

  const system = messages.find((m) => m.role === "system")?.content;
  const chatMessages = messages.filter((m) => m.role !== "system");

  const contents = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw formatProviderError("Gemini", err, key);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("");

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

export async function completeMessages(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const provider = getAIProvider();
  const temperature = options?.temperature ?? 0.4;
  const maxTokens = options?.maxTokens ?? 2048;

  if (provider === "gemini") {
    return completeGemini(messages, temperature, maxTokens);
  }

  if (provider === "anthropic") {
    const key = getApiKey();
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");

    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const chatMessages = messages.filter((m) => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: maxTokens,
        system,
        messages: chatMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw formatProviderError("Anthropic", err, key);
    }

    const data = (await res.json()) as {
      content: { type: string; text: string }[];
    };
    return data.content.map((c) => c.text).join("");
  }

  const isGroq = provider === "groq";
  const key = getApiKey();
  if (!key) {
    throw new Error(
      isGroq
        ? "GROQ_API_KEY is not set. Add it to .env.local and restart the dev server."
        : "OPENAI_API_KEY is not configured"
    );
  }

  const baseUrl = isGroq
    ? "https://api.groq.com/openai/v1"
    : "https://api.openai.com/v1";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw formatProviderError(isGroq ? "Groq" : "OpenAI", err, key);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "";
}

function formatProviderError(
  provider: string,
  errText: string,
  key: string
): Error {
  let message = `${provider} API error: ${errText}`;

  const invalidKey =
    errText.includes("invalid_api_key") ||
    errText.includes("Invalid API Key") ||
    errText.includes("API_KEY_INVALID") ||
    errText.includes("API key not valid");

  if (invalidKey) {
    const prefix = key.slice(0, 8);
    const helpUrl =
      provider === "Gemini"
        ? "aistudio.google.com/apikey"
        : provider === "Groq"
          ? "console.groq.com/keys"
          : "your provider's dashboard";
    message =
      `Invalid API key for ${provider} (starts with "${prefix}…"). ` +
      `Get a fresh key at ${helpUrl}, update .env.local (no quotes), then restart: npm run dev`;
  }

  return new Error(message);
}
