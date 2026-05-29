import { NextRequest, NextResponse } from "next/server";
import {
  completeMessages,
  getAIProvider,
  getApiKey,
  getModel,
  hasAIConfigured,
} from "@/lib/ai";

async function checkStatus() {
  const provider = getAIProvider();
  const key = getApiKey();

  if (!hasAIConfigured()) {
    return {
      ok: false,
      provider,
      message: "No API key found in .env.local",
    };
  }

  try {
    await completeMessages(
      [{ role: "user", content: "Reply with exactly: OK" }],
      { maxTokens: 16, temperature: 0 }
    );

    return {
      ok: true,
      provider,
      model: getModel(),
      keyPrefix: key.slice(0, 8),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connection failed";
    return {
      ok: false,
      provider,
      model: getModel(),
      keyPrefix: key.slice(0, 8),
      message,
    };
  }
}

function statusHtml(result: Awaited<ReturnType<typeof checkStatus>>) {
  const ok = result.ok;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Status — Liquid Notes</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px; margin: 48px auto; padding: 0 24px; background: #0f172a; color: #e2e8f0; }
    h1 { font-size: 1.25rem; }
    .ok { color: #86efac; } .bad { color: #fca5a5; }
    a { color: #a5b4fc; }
    code { background: #1e293b; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>AI connection status</h1>
  <p class="${ok ? "ok" : "bad"}">
    <strong>${ok ? "✓ Connected" : "✗ Not connected"}</strong>
  </p>
  ${result.provider ? `<p>Provider: <code>${result.provider}</code></p>` : ""}
  ${"model" in result && result.model ? `<p>Model: <code>${result.model}</code></p>` : ""}
  ${"message" in result && result.message ? `<p>${result.message}</p>` : ""}
  <p><a href="/">← Back to Liquid Notes app</a></p>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const result = await checkStatus();
  const accept = req.headers.get("accept") ?? "";

  if (accept.includes("text/html")) {
    return new NextResponse(statusHtml(result), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json(result);
}
