"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { AIPanel } from "@/components/ai/AIPanel";
import { DrawingCanvas } from "@/components/drawing/DrawingCanvas";
import { useNotesStore } from "@/store/notesStore";

type MobileTab = "notes" | "editor" | "ai" | "draw";

export function AppShell() {
  const { notes, activeNoteId, createNote, setActiveNoteId } = useNotesStore();
  const [hydrated, setHydrated] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("notes");
  const [showDraw, setShowDraw] = useState(false);

  useEffect(() => {
    const unsub = useNotesStore.persist.onFinishHydration(() => setHydrated(true));
    if (useNotesStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (notes.length === 0) createNote();
    else if (!activeNoteId) setActiveNoteId(notes[0].id);
  }, [hydrated, notes.length, activeNoteId, createNote, setActiveNoteId]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="glass rounded-2xl px-8 py-6 text-sm text-white/60">Loading notes...</div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden md:flex h-screen gap-4 p-4">
        <Sidebar />
        {showDraw ? (
          <>
            <DrawingCanvas />
            <AIPanel />
          </>
        ) : (
          <>
            <NoteEditor />
            <AIPanel />
          </>
        )}
      </div>

      {/* Desktop draw toggle */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass flex rounded-full px-2 py-1.5 gap-1">
          <button
            onClick={() => setShowDraw(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!showDraw ? "bg-white/20 text-white" : "text-white/50 hover:text-white"}`}>
            ✏️ Notes
          </button>
          <button
            onClick={() => setShowDraw(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${showDraw ? "bg-white/20 text-white" : "text-white/50 hover:text-white"}`}>
            🎨 Draw
          </button>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-col overflow-hidden" style={{ height: "100dvh" }}>
        <div className="flex-1 overflow-hidden min-h-0">
          {mobileTab === "notes" && <Sidebar />}
          {mobileTab === "editor" && <NoteEditor />}
          {mobileTab === "ai" && <AIPanel />}
          {mobileTab === "draw" && <DrawingCanvas />}
        </div>

        {/* Bottom tab bar */}
        <div className="glass flex items-center justify-around px-4 py-3 border-t border-white/10 shrink-0">
          <button onClick={() => setMobileTab("notes")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${mobileTab === "notes" ? "text-white" : "text-white/40"}`}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs">Notes</span>
          </button>
          <button onClick={() => setMobileTab("editor")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${mobileTab === "editor" ? "text-white" : "text-white/40"}`}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs">Editor</span>
          </button>
          <button onClick={() => setMobileTab("draw")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${mobileTab === "draw" ? "text-white" : "text-white/40"}`}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="text-xs">Draw</span>
          </button>
          <button onClick={() => setMobileTab("ai")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${mobileTab === "ai" ? "text-white" : "text-white/40"}`}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
            <span className="text-xs">AI</span>
          </button>
        </div>
      </div>
    </>
  );
}