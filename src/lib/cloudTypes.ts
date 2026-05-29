export interface CloudFolderRow {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudNoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  folder_id: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

