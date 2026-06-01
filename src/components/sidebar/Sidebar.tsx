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
  Pencil,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useNotesStore } from "@/store/notesStore";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { SemanticSearchResult } from "@/lib/types";
import { useCloudSync } from "@/hooks/useCloudSync";

const FOLDER_COLORS = [
  "#93c5fd", "#a78bfa", "#67e8f9", "#86efac", "#fda4af",
  "#fcd34d", "#fb923c", "#e879f9", "#f472b6", "#34d399",
];

type SidebarView = "notes" | "notebooks";

export function Sidebar() {
  const {
    notes, folders, activeNoteId, searchQuery, selectedFolderId, selectedTag,
    setSearchQuery, setSelectedFolderId, setSelectedTag, setActiveNoteId,
    createNote, deleteNote, togglePin, getFilteredNotes, getAllTags,
    cloudEnabled, setCloudEnabled, createFolder, deleteFolder,
  } = useNotesStore();

  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [sidebarView, setSidebarView] = useState<SidebarView>("notes");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [editingFolderColor, setEditingFolderColor] = useState("");

  const cloud = useCloudSync();
  const filteredNotes = getFilteredNotes();
  const allTags = getAllTags();
  const userEmail = useMemo(() => cloud.user?.email ?? null, [cloud.user?.email]);

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSemanticResults(null); setSearchMode("keyword"); return; }
    setIsSearching(true); setSearchMode("semantic");
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, notes }),
      });
      const data = await res.json();
      if (res.ok) { setSemanticResults(data.results ?? []); }
      else { setSemanticResults(null); setSearchMode("keyword"); }
    } catch { setSemanticResults(null); setSearchMode("keyword"); }
    finally { setIsSearching(false); }
  }, [searchQuery, notes]);

  const displayNotes = searchMode === "semantic" && semanticResults
    ? semanticResults.map((r) => { const note = notes.find((n) => n.id === r.noteId); return note ? { note, reason: r.reason, score: r.score } : null; }).filter(Boolean) as { note: (typeof notes)[0]; reason: string; score: number }[]
    : filteredNotes.map((note) => ({ note, reason: null, score: null }));

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowNewFolder(false);
  };

  const handleRenameFolder = (id: string) => {
    if (!editingFolderName.trim()) return;
    useNotesStore.setState((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, name: editingFolderName.trim(), color: editingFolderColor } : f
      ),
    }));
    setEditingFolderId(null);
  };

  return (
    <GlassPanel className="flex h-full w-80 shrink-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-300" />
          <h1 className="text-shadow-readable text-lg font-semibold tracking-tight">Liquid Notes</h1>
        </div>

        {/* View toggle */}
        <div className="mb-4 flex rounded-xl bg-white/5 p-1">
          <button type="button" onClick={() => setSidebarView("notes")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all",
              sidebarView === "notes" ? "bg-white/15 text-white" : "text-white/50 hover:text-white")}>
            <Search className="h-3.5 w-3.5" /> Notes
          </button>
          <button type="button" onClick={() => setSidebarView("notebooks")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all",
              sidebarView === "notebooks" ? "bg-white/15 text-white" : "text-white/50 hover:text-white")}>
            <BookOpen className="h-3.5 w-3.5" /> Notebooks
          </button>
        </div>

        {/* Cloud sync */}
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
              <input type="checkbox" checked={cloudEnabled} onChange={(e) => setCloudEnabled(e.target.checked)} className="accent-indigo-400" />
              Enable sync
            </label>
            <button type="button" onClick={() => cloud.syncNow()} disabled={!cloudEnabled || !cloud.user || cloud.syncing}
              className="glass-button flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] disabled:opacity-40">
              <RefreshCw className={cn("h-3.5 w-3.5", cloud.syncing && "animate-spin")} /> Sync
            </button>
          </div>
          {cloud.syncError && (
            <div className="mt-2 rounded-lg bg-red-500/20 px-2.5 py-2 text-xs text-red-200">{cloud.syncError}</div>
          )}
          {userEmail ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-white/70">{userEmail}</p>
                <p className="text-[10px] text-white/40">
                  {cloud.lastSyncAt ? `Last sync: ${new Date(cloud.lastSyncAt).toLocaleString()}` : "Not synced yet"}
                </p>
              </div>
              <button type="button" onClick={() => cloud.signOut()}
                className="glass-button rounded-lg p-2 text-white/60 hover:text-white" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <a href="/auth"
                className="glass-button glass-button-primary flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium">
                Sign in to sync
              </a>
            </div>
          )}
        </div>

        {sidebarView === "notes" && (
          <>
            <button type="button" onClick={() => createNote()}
              className="glass-button glass-button-primary mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
              <Plus className="h-4 w-4" /> New Note
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input type="text" placeholder="Search notes..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSemanticResults(null); setSearchMode("keyword"); }}
                onKeyDown={(e) => e.key === "Enter" && handleSmartSearch()}
                className="glass-input w-full rounded-xl py-2.5 pl-10 pr-3 text-sm" />
            </div>
            <button type="button" onClick={handleSmartSearch} disabled={isSearching || !searchQuery.trim()}
              className="glass-button mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40">
              <Sparkles className="h-3.5 w-3.5" />
              {isSearching ? "Searching..." : "AI Smart Search"}
            </button>
            {searchMode === "semantic" && semanticResults && (
              <p className="mt-1.5 text-xs text-white/50">Semantic results · {semanticResults.length} found</p>
            )}
          </>
        )}

        {sidebarView === "notebooks" && (
          <button type="button" onClick={() => setShowNewFolder(true)}
            className="glass-button glass-button-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
            <Plus className="h-4 w-4" /> New Notebook
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* NOTEBOOKS VIEW */}
        {sidebarView === "notebooks" && (
          <section className="p-3">
            <h2 className="mb-3 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-white/50">
              <BookOpen className="h-3.5 w-3.5" /> Notebooks
            </h2>
            {showNewFolder && (
              <div className="mb-3 rounded-xl border border-white/15 bg-white/5 p-3 space-y-2">
                <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Notebook name..." autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                  className="glass-input w-full rounded-lg px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-1.5">
                  {FOLDER_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setNewFolderColor(c)}
                      className={cn("h-5 w-5 rounded-full transition-all", newFolderColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : "opacity-70 hover:opacity-100")}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCreateFolder} className="glass-button glass-button-primary flex-1 rounded-lg py-1.5 text-xs">Create</button>
                  <button type="button" onClick={() => setShowNewFolder(false)} className="glass-button flex-1 rounded-lg py-1.5 text-xs">Cancel</button>
                </div>
              </div>
            )}
            <ul className="space-y-1">
              <li>
                <button type="button" onClick={() => { setSelectedFolderId(null); setSidebarView("notes"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all">
                  <FolderOpen className="h-4 w-4" />
                  All Notes
                  <span className="ml-auto text-xs text-white/40">{notes.length}</span>
                </button>
              </li>
              {folders.map((folder) => (
                <li key={folder.id}>
                  {editingFolderId === folder.id ? (
                    <div className="rounded-xl border border-white/15 bg-white/5 p-3 space-y-2">
                      <input type="text" value={editingFolderName} onChange={(e) => setEditingFolderName(e.target.value)} autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameFolder(folder.id); if (e.key === "Escape") setEditingFolderId(null); }}
                        className="glass-input w-full rounded-lg px-3 py-2 text-sm" />
                      <div className="flex flex-wrap gap-1.5">
                        {FOLDER_COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => setEditingFolderColor(c)}
                            className={cn("h-5 w-5 rounded-full transition-all", editingFolderColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : "opacity-70 hover:opacity-100")}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleRenameFolder(folder.id)} className="glass-button glass-button-primary flex-1 rounded-lg py-1.5 text-xs flex items-center justify-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Save
                        </button>
                        <button type="button" onClick={() => setEditingFolderId(null)} className="glass-button flex-1 rounded-lg py-1.5 text-xs flex items-center justify-center gap-1">
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-center gap-1 rounded-lg transition-all hover:bg-white/10">
                      <button type="button" onClick={() => { setSelectedFolderId(folder.id); setSidebarView("notes"); }}
                        className="flex flex-1 items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:text-white">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: folder.color ?? "#a78bfa" }} />
                        <span className="truncate">{folder.name}</span>
                        <span className="ml-auto text-xs text-white/40">{notes.filter((n) => n.folderId === folder.id).length}</span>
                      </button>
                      <div className="flex shrink-0 gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button"
                          onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); setEditingFolderColor(folder.color ?? FOLDER_COLORS[0]); }}
                          className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white" title="Rename">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {folder.id !== "inbox" && (
                          <button type="button" onClick={() => deleteFolder(folder.id)}
                            className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-red-300" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* NOTES VIEW */}
        {sidebarView === "notes" && (
          <>
            <section className="p-3">
              <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-white/50">
                <Folder className="h-3.5 w-3.5" /> Folders
              </h2>
              <ul className="space-y-0.5">
                <li>
                  <button type="button" onClick={() => setSelectedFolderId(null)}
                    className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ease-in-out",
                      !selectedFolderId && !selectedTag ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
                    <FolderOpen className="h-4 w-4" />
                    All Notes
                    <span className="ml-auto text-xs text-white/40">{notes.length}</span>
                  </button>
                </li>
                {folders.map((folder) => (
                  <li key={folder.id}>
                    <button type="button" onClick={() => setSelectedFolderId(folder.id)}
                      className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ease-in-out",
                        selectedFolderId === folder.id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: folder.color ?? "#a78bfa" }} />
                      {folder.name}
                      <span className="ml-auto text-xs text-white/40">{notes.filter((n) => n.folderId === folder.id).length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {allTags.length > 0 && (
              <section className="border-t border-white/10 p-3">
                <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-white/50">
                  <Tag className="h-3.5 w-3.5" /> Tags
                </h2>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {allTags.map((tag) => (
                    <button key={tag} type="button" onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={cn("rounded-full px-2.5 py-1 text-xs transition-all ease-in-out",
                        selectedTag === tag ? "bg-indigo-500/40 text-white ring-1 ring-white/30" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white")}>
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="border-t border-white/10 p-3">
              <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-white/50">Notes</h2>
              {displayNotes.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-white/40">{searchQuery ? "No notes found" : "Create your first note"}</p>
              ) : (
                <ul className="space-y-1">
                  {displayNotes.map(({ note, reason }) => (
                    <li key={note.id}>
                      <div className={cn("group flex items-start gap-1 rounded-xl transition-all ease-in-out",
                        activeNoteId === note.id ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/10")}>
                        <button type="button" onClick={() => setActiveNoteId(note.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                          <div className="flex items-center gap-1.5">
                            {note.pinned && <Pin className="h-3 w-3 shrink-0 fill-amber-300 text-amber-300" />}
                            <span className="text-shadow-readable truncate text-sm font-medium">{note.title || "Untitled"}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-white/45">{note.content.slice(0, 60) || "Empty note"}</p>
                          {reason && <p className="mt-1 text-xs italic text-indigo-300/80">{reason}</p>}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-white/35">{formatRelativeTime(note.updatedAt)}</span>
                            {note.tags.slice(0, 2).map((t) => (
                              <span key={t} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">{t}</span>
                            ))}
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col gap-0.5 pr-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button type="button" onClick={() => togglePin(note.id)}
                            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-amber-300" title={note.pinned ? "Unpin" : "Pin"}>
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => deleteNote(note.id)}
                            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-red-300" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </GlassPanel>
  );
}