"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useNotesStore } from "@/store/notesStore";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Summarise my open note.",
  "Do any notes mention homework?",
];

export function AIChat() {
  const { notes, folders, activeNoteId } = useNotesStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"checking" | "ok" | "error">("checking");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setAiStatus(d.ok ? "ok" : "error"))
      .catch(() => setAiStatus("error"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildNoteContext = useCallback(() => {
    return notes.map((n) => ({
      id: n.id,
      title: n.title,
      // Keep Gemini prompts small to avoid quota blowups.
      content: (n.content || "").slice(0, 800),
      tags: n.tags,
      folderName: folders.find((f) => f.id === n.folderId)?.name,
    }));
  }, [notes, folders]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            activeNote: activeNote
              ? {
                  id: activeNote.id,
                  title: activeNote.title,
                  content: (activeNote.content || "").slice(0, 2000),
                  tags: activeNote.tags,
                  folderName: folders.find((f) => f.id === activeNote.folderId)
                    ?.name,
                }
              : null,
            notes: buildNoteContext(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Chat failed");

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.reply,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chat failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, activeNote, folders, buildNoteContext]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {aiStatus === "error" && (
        <div className="mb-2 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-100">
          API key issue — update <code className="text-amber-50">GEMINI_API_KEY</code> in{" "}
          <code className="text-amber-50">.env.local</code> and restart{" "}
          <code className="text-amber-50">npm run dev</code>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-center text-xs text-white/40">
              Ask anything about your notes — I can see your library and the
              note you have open.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="glass-subtle rounded-full px-2.5 py-1 text-[11px] text-white/65 transition-all ease-in-out hover:bg-white/10 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-4 bg-indigo-500/25 text-white/90"
                  : "mr-2 glass-subtle text-white/80"
              )}
            >
              {msg.content}
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking...
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 shrink-0 border-t border-white/10 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about your notes..."
            disabled={loading}
            className="glass-input min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="glass-button glass-button-primary shrink-0 rounded-xl p-2.5 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            className="mt-2 flex items-center gap-1 text-[10px] text-white/35 hover:text-white/55"
          >
            <Trash2 className="h-3 w-3" />
            Clear chat
          </button>
        )}
      </div>
    </div>
  );
}
