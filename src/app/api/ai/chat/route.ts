import { NextRequest, NextResponse } from "next/server";
import { completeMessages, hasAIConfigured, type ChatMessage } from "@/lib/ai";

interface NoteContext {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderName?: string;
}

export async function POST(req: NextRequest) {
  if (!hasAIConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI is not configured. Set GEMINI_API_KEY in .env.local and restart the server.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const userMessages = (body.messages ?? []) as ChatMessage[];
    const activeNote = body.activeNote as NoteContext | null;
    const notes = (body.notes ?? []) as NoteContext[];

    const notesLimit = 12;
    const noteContextChars = 800;
    const activeNoteChars = 1200;

    const notesContext = notes
      .slice(0, notesLimit)
      .map(
        (n) =>
          `--- Note: "${n.title}" (${n.folderName ?? "Inbox"}, tags: ${
            n.tags.join(", ") || "none"
          }) ---\n${(n.content || "").slice(0, noteContextChars)}`
      )
      .join("\n\n");

    const activeSection = activeNote
      ? `\n\nCURRENTLY OPEN NOTE:\nTitle: ${activeNote.title}\nFolder: ${
          activeNote.folderName ?? "Inbox"
        }\nTags: ${activeNote.tags.join(", ") || "none"}\nContent:\n${(
          activeNote.content || ""
        ).slice(0, activeNoteChars) || "(empty)"}`
      : "\n\nNo note is currently open.";

    const systemPrompt = `You are a helpful AI assistant embedded in a personal note-taking app called Liquid Notes.
The user can ask questions about their notes, request summaries, comparisons, planning help, or writing suggestions.

Rules:
- Answer based on the user's notes when relevant; say clearly if information isn't in their notes.
- Be concise and practical unless they ask for detail.
- Reference note titles when citing specific notes.
- Do not invent note content that isn't provided.

USER'S NOTES LIBRARY:
${notesContext || "(no notes yet)"}
${activeSection}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...userMessages.filter((m) => m.role === "user" || m.role === "assistant"),
    ];

    const reply = await completeMessages(messages, {
      temperature: 0.5,
      // Keep responses smaller to reduce prompt+completion usage.
      maxTokens: 900,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
