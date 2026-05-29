"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { AIPanel } from "@/components/ai/AIPanel";
import { useNotesStore } from "@/store/notesStore";

export function AppShell() {
  const { notes, activeNoteId, createNote, setActiveNoteId } = useNotesStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useNotesStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useNotesStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (notes.length === 0) {
      createNote();
    } else if (!activeNoteId) {
      setActiveNoteId(notes[0].id);
    }
  }, [hydrated, notes.length, activeNoteId, createNote, setActiveNoteId]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="glass rounded-2xl px-8 py-6 text-sm text-white/60">
          Loading notes...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen gap-4 p-4">
      <Sidebar />
      <NoteEditor />
      <AIPanel />
    </div>
  );
}
