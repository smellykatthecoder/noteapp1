"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { CloudFolderRow, CloudNoteRow } from "@/lib/cloudTypes";
import type { Folder, Note } from "@/lib/types";
import { useNotesStore } from "@/store/notesStore";

function toFolder(row: CloudFolderRow): Folder {
  return { id: row.id, name: row.name, color: row.color ?? undefined };
}

function toNote(row: CloudNoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    folderId: row.folder_id,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toFolderRow(userId: string, folder: Folder): Partial<CloudFolderRow> {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    color: folder.color ?? null,
  };
}

function toNoteRow(userId: string, note: Note): Partial<CloudNoteRow> {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
    tags: note.tags,
    folder_id: note.folderId,
    pinned: note.pinned,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

export function useCloudSync() {
  const [available, setAvailable] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const store = useNotesStore();

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      setAvailable(false);
      return null;
    }
  }, []);

  const applyingRemoteRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function pullFromCloud(u: User) {
    if (!supabase) return;
    setSyncError(null);
    setSyncing(true);

    try {
      const [foldersRes, notesRes] = await Promise.all([
        supabase
          .from("folders")
          .select("*")
          .eq("user_id", u.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("notes")
          .select("*")
          .eq("user_id", u.id)
          .order("updated_at", { ascending: false }),
      ]);

      if (foldersRes.error) throw new Error(foldersRes.error.message);
      if (notesRes.error) throw new Error(notesRes.error.message);

      const folders = (foldersRes.data ?? []).map(toFolder);
      const notes = (notesRes.data ?? []).map(toNote);

      applyingRemoteRef.current = true;
      store.hydrateFromCloud({ folders, notes });
      applyingRemoteRef.current = false;

      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Cloud sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function pushToCloud(u: User, folders: Folder[], notes: Note[]) {
    if (!supabase) return;
    setSyncError(null);

    try {
      const folderRows = folders.map((f) => toFolderRow(u.id, f));
      const noteRows = notes.map((n) => toNoteRow(u.id, n));

      const [foldersUpsert, notesUpsert] = await Promise.all([
        supabase.from("folders").upsert(folderRows, { onConflict: "id" }),
        supabase.from("notes").upsert(noteRows, { onConflict: "id" }),
      ]);

      if (foldersUpsert.error) throw new Error(foldersUpsert.error.message);
      if (notesUpsert.error) throw new Error(notesUpsert.error.message);

      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Cloud sync failed");
    }
  }

  // Pull once on login
  useEffect(() => {
    if (!user) return;
    void pullFromCloud(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced push on local changes
  useEffect(() => {
    if (!supabase || !user) return;

    const unsub = useNotesStore.subscribe(
      (state) => ({ notes: state.notes, folders: state.folders }),
      (slice) => {
        if (applyingRemoteRef.current) return;
        if (pushTimer.current) clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(() => {
          void pushToCloud(user, slice.folders, slice.notes);
        }, 900);
      },
      { equalityFn: (a, b) => a.notes === b.notes && a.folders === b.folders }
    );

    return () => {
      unsub();
    };
  }, [supabase, user]);

  async function signInWithEmail(email: string) {
    if (!supabase) throw new Error("Supabase not configured");
    setSyncError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function syncNow() {
    if (!user) return;
    await pullFromCloud(user);
    await pushToCloud(user, store.folders, store.notes);
  }

  return {
    available,
    session,
    user,
    syncing,
    lastSyncAt,
    syncError,
    signInWithEmail,
    signOut,
    syncNow,
  };
}

