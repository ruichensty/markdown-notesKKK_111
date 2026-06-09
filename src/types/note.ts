export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
  data?: ArrayBuffer;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  folderIds?: string[];
  attachments?: Attachment[];
  order?: number;
}

export interface NoteFormData {
  title: string;
  content: string;
  folderIds?: string[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface FolderFormData {
  name: string;
  parentId?: string | null;
}

export type Theme = "light" | "dark";

export type SaveStatus = "saved" | "saving" | "retrying" | "error";

export interface StorageData {
  notes: Note[];
  folders: Folder[];
  theme: Theme;
}
