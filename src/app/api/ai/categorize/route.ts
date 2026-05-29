import { NextRequest, NextResponse } from "next/server";
import { completeJSON, hasAIConfigured } from "@/lib/ai";
import type { CategorizeResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!hasAIConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Set GEMINI_API_KEY (or other provider key) in .env.local" },
      { status: 503 }
    );
  }

  try {
    const { content, title, existingFolders, existingTags } = await req.json();
    const trimmedContent = (content ?? "").slice(0, 6000);

    const result = await completeJSON<CategorizeResult>(
      `You are a note organization assistant. Analyze notes and suggest tags and folders.
Return ONLY valid JSON with this shape:
{
  "tags": ["tag1", "tag2"],
  "folderId": "existing-folder-id-or-null",
  "folderName": "suggested new folder name or existing folder name",
  "reasoning": "brief explanation"
}
Use 2-5 concise lowercase tags. Prefer existing folders when appropriate.`,
      `Title: ${title ?? "Untitled"}
Content:
${trimmedContent}

Existing folders: ${JSON.stringify(existingFolders ?? [])}
Existing tags in library: ${JSON.stringify(existingTags ?? [])}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Categorization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
