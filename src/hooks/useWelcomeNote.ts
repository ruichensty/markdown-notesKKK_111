import { useEffect } from "react";
import type { Note, NoteFormData } from "@types";

export function useWelcomeNote(
  loaded: boolean,
  notes: Note[],
  createNote: (data: NoteFormData) => Note,
  onError: (error: Error) => void,
  onSuccess: (message: string) => void
) {
  useEffect(() => {
    if (!loaded || notes.length > 0) return;
    try {
      createNote({
        title: "Welcome",
        content:
          '# Welcome to Markdown Notes\n\nThis is your first note. Start editing to see the magic!\n\n## Features\n\n- Real-time preview\n- Syntax highlighting\n- Auto-save\n- Dark mode\n- Export to Markdown, HTML, or Text\n\n## Try some code:\n\n```javascript\nconsole.log("Hello, World!");\n```\n\n## Lists\n\n- Item 1\n- Item 2\n  - Subitem 2.1\n  - Subitem 2.2\n- Item 3\n\n## Formatting\n\n**Bold text** and *italic text*\n\n~~Strikethrough~~\n\n[Link to React](https://react.dev)',
      });
      onSuccess("Welcome note created");
    } catch (error) {
      onError(error as Error);
    }
  }, [loaded, notes.length, createNote, onError, onSuccess]);
}
