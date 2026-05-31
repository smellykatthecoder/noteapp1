"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";

const Tldraw = dynamic(
  async () => (await import("tldraw")).Tldraw,
  { ssr: false, loading: () => (
    <div className="flex h-full items-center justify-center text-white/50 text-sm">
      Loading canvas...
    </div>
  )}
);

export function DrawingCanvas() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <GlassPanel className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4 shrink-0">
        <h2 className="text-lg font-semibold text-white">Drawing Canvas</h2>
        <span className="text-xs text-white/40">Freehand · Shapes · Text · Highlighting</span>
      </header>
      <div className="flex-1 overflow-hidden" style={{ position: "relative" }}>
        {mounted && <Tldraw />}
      </div>
    </GlassPanel>
  );
}