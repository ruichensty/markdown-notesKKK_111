import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { Note, NoteFormData } from "@types";
import { generateId, formatDate } from "@utils/export";
import { saveSingleNote, deleteSingleNote, loadNotes } from "@utils/storage";
import { idbDeleteFile } from "@utils/indexedDBStorage";

export function useNotes(selectedFolderId: string | null = null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const prevNotesRef = useRef<Note[]>([]);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const currentNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentNoteIdRef.current = currentNoteId;
  }, [currentNoteId]);

  useEffect(() => {
    loadNotes()
      .then(data => {
        setNotes(data);
        prevNotesRef.current = data;
        if (data.length > 0) {
          setCurrentNoteId(data[0].id);
        }
        setLoaded(true);
      })
      .catch(error => {
        console.error("Failed to load notes:", error);
        setLoaded(true);
      });
  }, []);

  const notesMap = useMemo(() => {
    const map = new Map<string, Note>();
    for (const n of notes) map.set(n.id, n);
    return map;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!selectedFolderId) return notes;
    return notes.filter(note => {
      const folderIds = note.folderIds || [];
      return folderIds.includes(selectedFolderId);
    });
  }, [notes, selectedFolderId]);

  const currentNote = useMemo(() => {
    return notesMap.get(currentNoteId ?? "") ?? null;
  }, [notesMap, currentNoteId]);

  useEffect(() => {
    if (!loaded) return;

    const prevMap = new Map<string, Note>();
    for (const n of prevNotesRef.current) prevMap.set(n.id, n);

    const added: Note[] = [];
    const updated: Note[] = [];

    for (const note of notes) {
      const prev = prevMap.get(note.id);
      if (!prev) {
        added.push(note);
      } else if (prev.updatedAt !== note.updatedAt) {
        updated.push(note);
      }
    }

    const currentMap = new Map<string, unknown>();
    for (const n of notes) currentMap.set(n.id, n);
    const deleted = prevNotesRef.current.filter(n => !currentMap.has(n.id));

    if (added.length > 0 || updated.length > 0 || deleted.length > 0) {
      saveQueueRef.current = saveQueueRef.current
        .then(async () => {
          for (const note of added) await saveSingleNote(note);
          for (const note of updated) await saveSingleNote(note);
          for (const note of deleted) await deleteSingleNote(note.id);
        })
        .catch(error => {
          console.error("Failed to save notes:", error);
          setSaveError(true);
        });
    }

    prevNotesRef.current = notes;
  }, [notes, loaded]);

  const createNote = useCallback((data: NoteFormData): Note => {
    const newNote: Note = {
      id: generateId(),
      title: data.title || "Untitled",
      content: data.content || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderIds: data.folderIds || [],
      attachments: [],
    };
    setNotes(prev => [newNote, ...prev]);
    setCurrentNoteId(newNote.id);
    return newNote;
  }, []);

  const updateNote = useCallback(
    (id: string, data: Partial<NoteFormData & { attachments?: Note["attachments"] }>): void => {
      setNotes(prev =>
        prev.map(note =>
          note.id === id
            ? {
                ...note,
                ...data,
                updatedAt: Date.now(),
              }
            : note
        )
      );
    },
    []
  );

  const deleteNote = useCallback((id: string): void => {
    setNotes(prev => {
      const note = prev.find(n => n.id === id);
      if (note?.attachments) {
        for (const att of note.attachments) {
          idbDeleteFile(att.id).catch(() => {});
        }
      }
      const newNotes = prev.filter(n => n.id !== id);
      if (currentNoteIdRef.current === id) {
        setCurrentNoteId(newNotes.length > 0 ? newNotes[0].id : null);
      }
      return newNotes;
    });
  }, []);

  const getFormattedDate = useCallback(
    (id: string): string => {
      const note = notesMap.get(id);
      return note ? formatDate(note.updatedAt) : "";
    },
    [notesMap]
  );

  const reorderNotes = useCallback((activeId: string, overId: string) => {
    setNotes(prev => {
      const activeIndex = prev.findIndex(n => n.id === activeId);
      const overIndex = prev.findIndex(n => n.id === overId);
      if (activeIndex === -1 || overIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(activeIndex, 1);
      next.splice(overIndex, 0, moved);
      return next.map((n, i) => ({ ...n, order: i }));
    });
  }, []);

  return {
    notes: filteredNotes,
    allNotes: notes,
    currentNote,
    currentNoteId,
    setCurrentNoteId,
    createNote,
    updateNote,
    deleteNote,
    reorderNotes,
    getFormattedDate,
    loaded,
    saveError,
    clearSaveError: useCallback(() => setSaveError(false), []),
  };
}
