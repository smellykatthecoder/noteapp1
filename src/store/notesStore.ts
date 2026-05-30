"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { Folder, Note } from "@/lib/types";

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

interface NotesState {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  searchQuery: string;
  selectedFolderId: string | null;
  selectedTag: string | null;
  cloudEnabled: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedFolderId: (folderId: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  setActiveNoteId: (id: string | null) => void;
  setCloudEnabled: (enabled: boolean) => void;

  createNote: () => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "content" | "tags" | "folderId" | "pinned">>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;

  createFolder: (name: string) => string;
  deleteFolder: (id: string) => void;

  applyCategorization: (noteId: string, tags: string[], folderId: string | null, folderName?: string | null) => void;
  hydrateFromCloud: (data: { notes: Note[]; folders: Folder[] }) => void;
  getFilteredNotes: () => Note[];
  getAllTags: () => string[];
}

const DEFAULT_FOLDERS: Folder[] = [
  { id: "inbox", name: "Inbox", color: "#93c5fd" },
  { id: "work", name: "Work", color: "#a78bfa" },
  { id: "personal", name: "Personal", color: "#67e8f9" },
];

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        notes: [],
        folders: DEFAULT_FOLDERS,
        activeNoteId: null,
        searchQuery: "",
        selectedFolderId: null,
        selectedTag: null,
        cloudEnabled: true,

        setSearchQuery: (query) => set({ searchQuery: query }),
        setSelectedFolderId: (folderId) =>
          set({ selectedFolderId: folderId, selectedTag: null }),
        setSelectedTag: (tag) =>
          set({ selectedTag: tag, selectedFolderId: null }),
        setActiveNoteId: (id) => set({ activeNoteId: id }),
        setCloudEnabled: (enabled) => set({ cloudEnabled: enabled }),

        createNote: () => {
          const id = generateId();
          const note: Note = {
            id,
            title: "Untitled Note",
            content: "",
            tags: [],
            folderId: get().selectedFolderId ?? "inbox",
            pinned: false,
            createdAt: now(),
            updatedAt: now(),
          };
          set((state) => ({
            notes: [note, ...state.notes],
            activeNoteId: id,
          }));
          return id;
        },

        updateNote: (id, patch) =>
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === id ? { ...n, ...patch, updatedAt: now() } : n
            ),
          })),

        deleteNote: (id) =>
          set((state) => {
            const remaining = state.notes.filter((n) => n.id !== id);
            const nextActive =
              state.activeNoteId === id
                ? (remaining[0]?.id ?? null)
                : state.activeNoteId;
            return { notes: remaining, activeNoteId: nextActive };
          }),

        togglePin: (id) =>
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === id ? { ...n, pinned: !n.pinned, updatedAt: now() } : n
            ),
          })),

        createFolder: (name) => {
          const id = generateId();
          const folder: Folder = { id, name };
          set((state) => ({ folders: [...state.folders, folder] }));
          return id;
        },

        deleteFolder: (id) => {
          if (id === "inbox") return;
          set((state) => ({
            folders: state.folders.filter((f) => f.id !== id),
            notes: state.notes.map((n) =>
              n.folderId === id ? { ...n, folderId: "inbox", updatedAt: now() } : n
            ),
            selectedFolderId:
              state.selectedFolderId === id ? null : state.selectedFolderId,
          }));
        },

        applyCategorization: (noteId, tags, folderId, folderName) => {
          set((state) => {
            let folders = state.folders;
            let resolvedFolderId = folderId;

            if (folderName && !folderId) {
              const existing = folders.find(
                (f) => f.name.toLowerCase() === folderName.toLowerCase()
              );
              if (existing) {
                resolvedFolderId = existing.id;
              } else {
                const newId = generateId();
                folders = [...folders, { id: newId, name: folderName }];
                resolvedFolderId = newId;
              }
            }

            return {
              folders,
              notes: state.notes.map((n) =>
                n.id === noteId
                  ? {
                      ...n,
                      tags,
                      folderId: resolvedFolderId ?? n.folderId,
                      updatedAt: now(),
                    }
                  : n
              ),
            };
          });
        },

        hydrateFromCloud: ({ notes, folders }) => {
          const existingActive = get().activeNoteId;
          set({
            folders: folders.length ? folders : DEFAULT_FOLDERS,
            notes,
            activeNoteId: existingActive && notes.some((n) => n.id === existingActive)
              ? existingActive
              : (notes[0]?.id ?? null),
          });
        },

        getFilteredNotes: () => {
          const { notes, searchQuery, selectedFolderId, selectedTag } = get();
          let filtered = [...notes];

          if (selectedFolderId) {
            filtered = filtered.filter((n) => n.folderId === selectedFolderId);
          }
          if (selectedTag) {
            filtered = filtered.filter((n) =>
              n.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
            );
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (n) =>
                n.title.toLowerCase().includes(q) ||
                n.content.toLowerCase().includes(q) ||
                n.tags.some((t) => t.toLowerCase().includes(q))
            );
          }

          return filtered.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          });
        },

        getAllTags: () => {
          const tags = new Set<string>();
          get().notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
          return Array.from(tags).sort();
        },
      }),
      {
        name: "liquid-notes-storage",
        partialize: (state) => ({
          notes: state.notes,
          folders: state.folders,
          activeNoteId: state.activeNoteId,
          cloudEnabled: state.cloudEnabled,
        }),
      }
    )
  )
);