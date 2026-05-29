"use client";

import {
  FolderOpen,
  Plus,
  Search,
  Sparkles,
  Tag,
  Pin,
  Trash2,
  Folder,
  Cloud,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useNotesStore } from "@/store/notesStore";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { SemanticSearchResult } from "@/lib/types";
import { useCloudSync } from "@/hooks/useCloudSync";

export function Sidebar() {
  const {
    notes,
    folders,
    activeNoteId,
    searchQuery,
    selectedFolderId,
    selectedTag,
    setSearchQuery,
    setSelectedFolderId,
    setSelectedTag,
    setActiveNoteId,
    createNote,
    deleteNote,
    togglePin,
    getFilteredNotes,
    getAllTags,
    cloudEnabled,
    setCloudEnabled,
  } = useNotesStore();

  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [email, setEmail] = useState("");
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const cloud = useCloudSync();

  const filteredNotes = getFilteredNotes();
  const allTags = getAllTags();
  const userEmail = useMemo(() => cloud.user?.email ?? null, [cloud.user?.email]);

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSemanticResults(null);
      setSearchMode("keyword");
      return;
    }

    setIsSearching(true);
    setSearchMode("semantic");

    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        setSemanticResults(data.results ?? []);
      } else {
        setSemanticResults(null);
        setSearchMode("keyword");
      }
    } catch {
      setSemanticResults(null);
      setSearchMode("keyword");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, notes]);

  const displayNotes =
    searchMode === "semantic" && semanticResults
      ? semanticResults
          .map((r) => {
            const note = notes.find((n) => n.id === r.noteId);
            return note ? { note, reason: r.reason, score: r.score } : null;
          })
          .filter(Boolean) as { note: (typeof notes)[0]; reason: string; score: number }[]
      : filteredNotes.map((note) => ({ note, reason: null, score: null }));

  return (
    <GlassPanel className="flex h-full w-80 shrink-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-300" />
          <h1 className="text-shadow-readable text-lg font-semibold tracking-tight">
            Liquid Notes
          </h1>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/50">
            <Cloud className="h-3.5 w-3.5" />
            Cloud Sync
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">
              {cloud.available ? "Supabase" : "Not configured"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={cloudEnabled}
                onChange={(e) => setCloudEnabled(e.target.checked)}
                className="accent-indigo-400"
              />
              Enable sync
            </label>
            <button
              type="button"
              onClick={() => cloud.syncNow()}
              disabled={!cloudEnabled || !cloud.user || cloud.syncing}
              className="glass-button flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] disabled:opacity-40"
              title="Pull from cloud then push local"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", cloud.syncing && "animate-spin")} />
              Sync
            </button>
          </div>

          {cloud.syncError && (
            <div className="mt-2 rounded-lg bg-red-500/20 px-2.5 py-2 text-xs text-red-200">
              {cloud.syncError}
            </div>
          )}

          {userEmail ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-white/70">{userEmail}</p>
                <p className="text-[10px] text-white/40">
                  {cloud.lastSyncAt ? `Last sync: ${new Date(cloud.lastSyncAt).toLocaleString()}` : "Not synced yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => cloud.signOut()}
                className="glass-button rounded-lg p-2 text-white/60 hover:text-white"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="glass-input w-full rounded-lg px-3 py-2 text-xs"
              />
              <button
                type="button"
                disabled={!cloudEnabled || !cloud.available || authLoading || !email.trim()}
                onClick={async () => {
                  setAuthLoading(true);
                  setAuthMsg(null);
                  try {
                    await cloud.signInWithEmail(email);
                    setAuthMsg("Check your email for the sign-in link.");
                  } catch (e) {
                    setAuthMsg(e instanceof Error ? e.message : "Sign-in failed");
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                className="glass-button glass-button-primary w-full rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
              >
                {authLoading ? "Sending link..." : "Sign in (email link)"}
              </button>
              {authMsg && <p className="text-[11px] text-white/55">{authMsg}</p>}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => createNote()}
          className="glass-button glass-button-primary mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Note
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSemanticResults(null);
              setSearchMode("keyword");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSmartSearch()}
            className="glass-input w-full rounded-xl py-2.5 pl-10 pr-3 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleSmartSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="glass-button mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isSearching ? "Searching..." : "AI Smart Search"}
        </button>
        {searchMode === "semantic" && semanticResults && (
          <p className="mt-1.5 text-xs text-white/50">
            Semantic results · {semanticResults.length} found
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <section className="p-3">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-white/50">
            <Folder className="h-3.5 w-3.5" />
            Folders
          </h2>
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ease-in-out",
                  !selectedFolderId && !selectedTag
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                All Notes
                <span className="ml-auto text-xs text-white/40">{notes.length}</span>
              </button>
            </li>
            {folders.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ease-in-out",
                    selectedFolderId === folder.id
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: folder.color ?? "#a78bfa" }}
                  />
                  {folder.name}
                  <span className="ml-auto text-xs text-white/40">
                    {notes.filter((n) => n.folderId === folder.id).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {allTags.length > 0 && (
          <section className="border-t border-white/10 p-3">
            <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-white/50">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </h2>
            <div className="flex flex-wrap gap-1.5 px-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedTag(selectedTag === tag ? null : tag)
                  }
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs transition-all ease-in-out",
                    selectedTag === tag
                      ? "bg-indigo-500/40 text-white ring-1 ring-white/30"
                      : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-white/10 p-3">
          <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-white/50">
            Notes
          </h2>
          {displayNotes.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-white/40">
              {searchQuery ? "No notes found" : "Create your first note"}
            </p>
          ) : (
            <ul className="space-y-1">
              {displayNotes.map(({ note, reason }) => (
                <li key={note.id}>
                  <div
                    className={cn(
                      "group flex items-start gap-1 rounded-xl transition-all ease-in-out",
                      activeNoteId === note.id
                        ? "bg-white/15 ring-1 ring-white/20"
                        : "hover:bg-white/10"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveNoteId(note.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        {note.pinned && (
                          <Pin className="h-3 w-3 shrink-0 fill-amber-300 text-amber-300" />
                        )}
                        <span className="text-shadow-readable truncate text-sm font-medium">
                          {note.title || "Untitled"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {note.content.slice(0, 60) || "Empty note"}
                      </p>
                      {reason && (
                        <p className="mt-1 text-xs italic text-indigo-300/80">
                          {reason}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-white/35">
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                        {note.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col gap-0.5 pr-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => togglePin(note.id)}
                        className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-amber-300"
                        title={note.pinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </GlassPanel>
  );
}
