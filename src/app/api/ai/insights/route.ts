import { NextRequest, NextResponse } from "next/server";
import { completeJSON, hasAIConfigured } from "@/lib/ai";
import type { NoteInsights } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!hasAIConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Set GEMINI_API_KEY (or other provider key) in .env.local" },
      { status: 503 }
    );
  }

  try {
    const { content, title } = await req.json();
    const trimmedContent = (content ?? "").slice(0, 6000);

    const result = await completeJSON<NoteInsights>(
      `You are a note analysis assistant. Summarize notes and extract action items.
Return ONLY valid JSON:
{
  "summary": ["bullet 1", "bullet 2", "bullet 3"],
  "actionItems": ["action 1", "action 2"]
}
Summary must be exactly 3 concise bullets. Action items should be concrete tasks found in the note, or an empty array.`,
      `Title: ${title ?? "Untitled"}
Content:
${trimmedContent || "(empty note)"}`
    );

    return NextResponse.json({
      summary: result.summary?.slice(0, 3) ?? [],
      actionItems: result.actionItems ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insights generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
