"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Pin, Tag, Save, Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code, Heading1, Heading2, Link, Undo, Redo } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useNotesStore } from "@/store/notesStore";
import { cn } from "@/lib/utils";

const AUTOSAVE_DELAY_MS = 800;

export function NoteEditor() {
  const { notes, activeNoteId, updateNote, togglePin } = useNotesStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);

  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [tagInput, setTagInput] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingFromStore = useRef(false);

  const persist = useCallback(
    (newTitle: string, newContent: string) => {
      if (!activeNoteId) return;
      setSaveStatus("saving");
      updateNote(activeNoteId, { title: newTitle, content: newContent });
      setTimeout(() => setSaveStatus("saved"), 300);
    },
    [activeNoteId, updateNote]
  );

  const scheduleSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("saving");
      saveTimer.current = setTimeout(() => {
        persist(newTitle, newContent);
      }, AUTOSAVE_DELAY_MS);
    },
    [persist]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: activeNote?.content || "",
    editorProps: {
      attributes: {
        class: "tiptap-editor h-full w-full px-8 py-6 text-[15px] leading-relaxed text-white focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingFromStore.current) return;
      const html = editor.getHTML();
      scheduleSave(title, html);
    },
  });

  useEffect(() => {
    if (activeNote && editor) {
      setTitle(activeNote.title);
      setSaveStatus("saved");
      if (editor.getHTML() !== activeNote.content) {
        isUpdatingFromStore.current = true;
        editor.commands.setContent(activeNote.content || "");
        isUpdatingFromStore.current = false;
      }
    } else if (!activeNote) {
      setTitle("");
      editor?.commands.setContent("");
    }
  }, [activeNote?.id]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    scheduleSave(value, editor?.getHTML() || "");
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || !activeNote) return;
    if (activeNote.tags.includes(tag)) { setTagInput(""); return; }
    updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, { tags: activeNote.tags.filter((t) => t !== tag) });
  };

  if (!activeNote) {
    return (
      <GlassPanel className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-shadow-readable text-lg font-medium text-white/80">
            Select a note or create a new one
          </p>
          <p className="mt-2 text-sm text-white/45">
            Your thoughts deserve a beautiful canvas
          </p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="text-shadow-readable min-w-0 flex-1 bg-transparent text-xl font-semibold text-white placeholder:text-white/30 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1 text-xs transition-all ease-in-out",
            saveStatus === "saved" ? "text-emerald-300/80" : "text-white/40"
          )}>
            <Save className="h-3.5 w-3.5" />
            {saveStatus === "saving" ? "Saving..." : "Saved"}
          </span>
          <button
            type="button"
            onClick={() => togglePin(activeNote.id)}
            className={cn("glass-button rounded-lg p-2", activeNote.pinned && "text-amber-300")}
            title={activeNote.pinned ? "Unpin" : "Pin"}
          >
            <Pin className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="glass-button rounded-lg p-2"
            title={preview ? "Edit" : "Preview"}
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-6 py-2">
        <Tag className="h-3.5 w-3.5 text-white/40" />
        {activeNote.tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-white/40 hover:text-white">×</button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="Add tag..."
          className="glass-input w-24 rounded-lg px-2 py-0.5 text-xs"
        />
      </div>

      {/* Formatting toolbar */}
      {!preview && editor && (
        <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-4 py-2">
          <button type="button" title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("heading", { level: 1 }) ? "text-white bg-white/20" : "text-white/70")}>
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("heading", { level: 2 }) ? "text-white bg-white/20" : "text-white/70")}>
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-white/20" />
          <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("bold") ? "text-white bg-white/20" : "text-white/70")}>
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("italic") ? "text-white bg-white/20" : "text-white/70")}>
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("strike") ? "text-white bg-white/20" : "text-white/70")}>
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Code" onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("code") ? "text-white bg-white/20" : "text-white/70")}>
            <Code className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-white/20" />
          <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("bulletList") ? "text-white bg-white/20" : "text-white/70")}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("orderedList") ? "text-white bg-white/20" : "text-white/70")}>
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn("glass-button rounded-md p-1.5", editor.isActive("blockquote") ? "text-white bg-white/20" : "text-white/70")}>
            <Quote className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-white/20" />
          <button type="button" title="Undo" onClick={() => editor.chain().focus().undo().run()}
            className="glass-button rounded-md p-1.5 text-white/70">
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Redo" onClick={() => editor.chain().focus().redo().run()}
            className="glass-button rounded-md p-1.5 text-white/70">
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      <footer className="border-t border-white/10 px-6 py-2 text-xs text-white/35">
        Auto-saves as you type
      </footer>
    </GlassPanel>
  );
}