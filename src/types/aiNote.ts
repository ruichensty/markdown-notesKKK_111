export type AiNoteContextMode = "selection" | "section" | "full";
export type AiNoteApplyMode = "append" | "replace-selection" | "new-note";

export interface AiEditorSnapshot {
  noteId: string;
  title: string;
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface AiNoteContext {
  mode: AiNoteContextMode;
  title: string;
  content: string;
  label: string;
  sourceStart: number;
  sourceEnd: number;
  totalChars: number;
  sentChars: number;
  truncated: boolean;
}

export interface AiNoteApplyPreview {
  mode: AiNoteApplyMode;
  noteId: string | null;
  noteTitle: string;
  label: string;
  beforeContent: string;
  afterContent: string;
  caretStart: number;
  caretEnd: number;
}

export interface AiNoteActionResult {
  ok: boolean;
  message: string;
}
