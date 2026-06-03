"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { Editor } from "tldraw";

const Tldraw = dynamic(
  async () => (await import("tldraw")).Tldraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-white/50 text-sm">
        Loading canvas...
      </div>
    ),
  }
);

const STORAGE_KEY = "liquid-notes-drawing";

export function DrawingCanvas() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleMount = (editor: Editor) => {
    // Load saved drawing
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const snapshot = JSON.parse(saved);
        editor.loadSnapshot(snapshot);
      }
    } catch {}

    // Auto-save every 2 seconds when changes happen
    editor.store.listen(() => {
      try {
        const snapshot = editor.getSnapshot();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {}
    }, { scope: "document", source: "user" });
  };

  return (
    <GlassPanel className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4 shrink-0">
        <h2 className="text-lg font-semibold text-white">Drawing Canvas</h2>
        <span className="text-xs text-white/40">Freehand · Shapes · Text · Highlighting</span>
      </header>
      <div className="flex-1 overflow-hidden" style={{ position: "relative", width: "100%", height: "100%" }}>
        {mounted && (
          <Tldraw
            hideUi={false}
            className="absolute inset-0"
            onMount={handleMount}
          />
        )}
      </div>
    </GlassPanel>
  );
}