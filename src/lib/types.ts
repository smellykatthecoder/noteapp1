export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
}

export interface NoteInsights {
  summary: string[];
  actionItems: string[];
}

export interface CategorizeResult {
  tags: string[];
  folderId: string | null;
  folderName: string | null;
  reasoning: string;
}

export interface SemanticSearchResult {
  noteId: string;
  score: number;
  reason: string;
}
