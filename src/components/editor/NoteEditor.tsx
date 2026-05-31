"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Pin, Tag, Save, Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code, Heading1, Heading2, Link } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useNotesStore } from "@/store/notesStore";
import { cn } from "@/lib/utils";

const AUTOSAVE_DELAY_MS = 800;

type FormatAction = {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix?: string;
  block?: boolean;
};

export function NoteEditor() {
  const { notes, activeNoteId, updateNote, togglePin } = useNotesStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [tagInput, setTagInput] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setSaveStatus("saved");
    } else {
      setTitle("");
      setContent("");
    }
  }, [activeNote?.id, activeNote?.title, activeNote?.content]);

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

  const handleTitleChange = (value: string) => {
    setTitle(value);
    scheduleSave(value, content);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    scheduleSave(title, value);
  };

  const applyFormat = (prefix: string, suffix?: string, block?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const sfx = suffix ?? prefix;

    let newContent: string;
    let newStart: number;
    let newEnd: number;

    if (block) {
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const before = content.slice(0, lineStart);
      const after = content.slice(lineStart);
      newContent = before + prefix + after;
      newStart = newEnd = lineStart + prefix.length;
    } else {
      newContent = content.slice(0, start) + prefix + selected + sfx + content.slice(end);
      newStart = start + prefix.length;
      newEnd = end + prefix.length;
    }

    handleContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || !activeNote) return;
    if (activeNote.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, {
      tags: activeNote.tags.filter((t) => t !== tag),
    });
  };

  const formatActions: FormatAction[] = [
    { icon: <Heading1 className="h-3.5 w-3.5" />, label: "H1", prefix: "# ", block: true },
    { icon: <Heading2 className="h-3.5 w-3.5" />, label: "H2", prefix: "## ", block: true },
    { icon: <Bold className="h-3.5 w-3.5" />, label: "Bold", prefix: "**", suffix: "**" },
    { icon: <Italic className="h-3.5 w-3.5" />, label: "Italic", prefix: "_", suffix: "_" },
    { icon: <Strikethrough className="h-3.5 w-3.5" />, label: "Strikethrough", prefix: "~~", suffix: "~~" },
    { icon: <Code className="h-3.5 w-3.5" />, label: "Code", prefix: "`", suffix: "`" },
    { icon: <List className="h-3.5 w-3.5" />, label: "Bullet list", prefix: "- ", block: true },
    { icon: <ListOrdered className="h-3.5 w-3.5" />, label: "Numbered list", prefix: "1. ", block: true },
    { icon: <Quote className="h-3.5 w-3.5" />, label: "Quote", prefix: "> ", block: true },
    { icon: <Link className="h-3.5 w-3.5" />, label: "Link", prefix: "[", suffix: "](url)" },
  ];

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
          <span
            className={cn(
              "flex items-center gap-1 text-xs transition-all ease-in-out",
              saveStatus === "saved" ? "text-emerald-300/80" : "text-white/40"
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {saveStatus === "saving" ? "Saving..." : "Saved"}
          </span>
          <button
            type="button"
            onClick={() => togglePin(activeNote.id)}
            className={cn(
              "glass-button rounded-lg p-2",
              activeNote.pinned && "text-amber-300"
            )}
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
            {preview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-6 py-2">
        <Tag className="h-3.5 w-3.5 text-white/40" />
        {activeNote.tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-white/40 hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag..."
          className="glass-input w-24 rounded-lg px-2 py-0.5 text-xs"
        />
      </div>

      {/* Formatting toolbar */}
      {!preview && (
        <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-4 py-2">
          {formatActions.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              onClick={() => applyFormat(action.prefix, action.suffix, action.block)}
              className="glass-button rounded-md p-1.5 text-white/70 hover:text-white"
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {preview ? (
          <div className="markdown-preview h-full overflow-y-auto px-8 py-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || "*Nothing to preview yet*"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing..."
            className="h-full w-full resize-none bg-transparent px-8 py-6 text-[15px] leading-relaxed text-white/85 placeholder:text-white/30 focus:outline-none"
            spellCheck
          />
        )}
      </div>

      <footer className="border-t border-white/10 px-6 py-2 text-xs text-white/35">
        Markdown supported · Auto-saves as you type
      </footer>
    </GlassPanel>
  );
}