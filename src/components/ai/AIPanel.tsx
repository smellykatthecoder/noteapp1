"use client";

import { useCallback, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  Loader2,
  MessageCircle,
  Sparkles,
  Wand2,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { AIChat } from "@/components/ai/AIChat";
import { ConnectionStatus } from "@/components/ai/ConnectionStatus";
import { useNotesStore } from "@/store/notesStore";
import { cn } from "@/lib/utils";
import type { NoteInsights } from "@/lib/types";

type Tab = "chat" | "tools";

export function AIPanel() {
  const { notes, activeNoteId, folders, applyCategorization, getAllTags } =
    useNotesStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);

  const [tab, setTab] = useState<Tab>("chat");
  const [insights, setInsights] = useState<NoteInsights | null>(null);
  const [categorizeReason, setCategorizeReason] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingCategorize, setLoadingCategorize] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInsights = useCallback(async () => {
    if (!activeNote) return;
    setLoadingInsights(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeNote.title,
          content: activeNote.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insights");
      setInsights(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Insights failed");
    } finally {
      setLoadingInsights(false);
    }
  }, [activeNote]);

  const handleCategorize = useCallback(async () => {
    if (!activeNote) return;
    setLoadingCategorize(true);
    setError(null);
    setCategorizeReason(null);

    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeNote.title,
          content: activeNote.content,
          existingFolders: folders.map((f) => ({ id: f.id, name: f.name })),
          existingTags: getAllTags(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to categorize");

      applyCategorization(
        activeNote.id,
        data.tags ?? [],
        data.folderId,
        data.folderName
      );
      setCategorizeReason(data.reasoning ?? "Tags and folder updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Categorization failed");
    } finally {
      setLoadingCategorize(false);
    }
  }, [activeNote, folders, applyCategorization, getAllTags]);

  return (
    <GlassPanel className="flex h-full w-96 shrink-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-300" />
          <h2 className="text-shadow-readable text-sm font-semibold">
            AI Assistant <span className="text-xs text-indigo-300">(beta)</span>
          </h2>
        </div>

        <ConnectionStatus />

        <div className="glass-subtle mt-3 flex rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab("chat")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ease-in-out",
              tab === "chat"
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white/80"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setTab("tools")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ease-in-out",
              tab === "tools"
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white/80"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Tools
          </button>
        </div>
      </div>

      {tab === "chat" ? (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <AIChat />
        </div>
      ) : (
        <>
          <div className="border-b border-white/10 px-4 pb-4">
            {!activeNote ? (
              <p className="text-xs text-white/45">
                Open a note to use AI tools
              </p>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCategorize}
                  disabled={loadingCategorize}
                  className="glass-button glass-button-primary flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50"
                >
                  {loadingCategorize ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Auto-Categorize
                </button>
                <button
                  type="button"
                  onClick={handleInsights}
                  disabled={loadingInsights}
                  className="glass-button flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50"
                >
                  {loadingInsights ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lightbulb className="h-3.5 w-3.5" />
                  )}
                  Summarise & Insights
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-3 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            {categorizeReason && (
              <div className="mb-4 rounded-lg bg-emerald-500/15 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Categorized
                </div>
                <p className="text-xs text-white/60">{categorizeReason}</p>
              </div>
            )}

            {insights ? (
              <div className="space-y-4">
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/50">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Summary
                  </h3>
                  <ul className="space-y-2">
                    {insights.summary.map((bullet, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm leading-relaxed text-white/75"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </section>

                {insights.actionItems.length > 0 && (
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/50">
                      <ListChecks className="h-3.5 w-3.5" />
                      Action Items
                    </h3>
                    <ul className="space-y-2">
                      {insights.actionItems.map((item, i) => (
                        <li
                          key={i}
                          className="glass-subtle flex gap-2 rounded-lg px-3 py-2 text-sm text-white/75"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-violet-400"
                            readOnly
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              !error &&
              activeNote && (
                <p className="text-center text-xs text-white/35">
                  Generate a 3-bullet summary and extract action items
                </p>
              )
            )}
          </div>
        </>
      )}
    </GlassPanel>
  );
}
