import { NextRequest, NextResponse } from "next/server";
import { completeJSON, hasAIConfigured } from "@/lib/ai";
import type { SemanticSearchResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!hasAIConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Set GEMINI_API_KEY (or other provider key) in .env.local" },
      { status: 503 }
    );
  }

  try {
    const { query, notes } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ results: [] });
    }

    const noteSummaries = (notes ?? []).map(
      (n: { id: string; title: string; content: string; tags: string[] }) => ({
        id: n.id,
        title: n.title,
        excerpt: (n.content ?? "").slice(0, 400),
        tags: n.tags,
      })
    );

    const result = await completeJSON<{ results: SemanticSearchResult[] }>(
      `You are a semantic search engine for personal notes. Given a natural language query, rank notes by conceptual relevance (not just keyword match).
Return ONLY valid JSON:
{
  "results": [
    { "noteId": "id", "score": 0.95, "reason": "why this matches" }
  ]
}
Include up to 10 results, sorted by score descending. Score is 0-1. Only include notes with score >= 0.3.`,
      `Query: "${query}"

Notes:
${JSON.stringify(noteSummaries, null, 2)}`
    );

    return NextResponse.json({ results: result.results ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Semantic search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
