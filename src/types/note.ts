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
  deletedAt?: number;
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

export type Theme = "light" | "dark" | "black-rainbow";

export type SaveStatus = "saved" | "saving" | "retrying" | "error";

export interface StorageData {
  notes: Note[];
  folders: Folder[];
  theme: Theme;
}
