import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { Note, NoteFormData, SaveStatus } from "@types";
import { generateId, formatDate } from "@utils/export";
import { saveSingleNote, deleteSingleNote, loadNotes, loadSingleNote } from "@utils/storage";
import { idbDeleteFile } from "@utils/indexedDBStorage";

const SAVE_DEBOUNCE_MS = 300;
const SAVE_RETRY_DELAYS_MS = [1000, 3000, 7000];
const NOTES_CHANNEL = "markdown-notes-sync";

type NotesSyncMessage = {
  sourceId: string;
  type: "notes-changed";
  noteId?: string;
  timestamp: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export function useNotes(selectedFolderId: string | null = null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const prevNotesRef = useRef<Note[]>([]);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const sourceIdRef = useRef(generateId());
  const currentNoteIdRef = useRef<string | null>(null);

  const reloadNotes = useCallback(async (preferredNoteId?: string | null) => {
    const data = await loadNotes();
    setNotes(data);
    prevNotesRef.current = data;

    const targetId = preferredNoteId ?? currentNoteIdRef.current;
    if (targetId && data.some(note => note.id === targetId)) return;
    setCurrentNoteId(data.length > 0 ? data[0].id : null);
  }, []);

  const broadcastNotesChanged = useCallback((noteId?: string) => {
    channelRef.current?.postMessage({
      sourceId: sourceIdRef.current,
      type: "notes-changed",
      noteId,
      timestamp: Date.now(),
    } satisfies NotesSyncMessage);
  }, []);

  const persistChanges = useCallback(
    async (snapshot: Note[], previousNotes: Note[], isRetry = false): Promise<boolean> => {
      const prevMap = new Map<string, Note>();
      for (const n of previousNotes) prevMap.set(n.id, n);

      const added: Note[] = [];
      const updated: Note[] = [];

      for (const note of snapshot) {
        const prev = prevMap.get(note.id);
        if (!prev) {
          added.push(note);
        } else if (prev.updatedAt !== note.updatedAt) {
          updated.push(note);
        }
      }

      const currentMap = new Map<string, unknown>();
      for (const n of snapshot) currentMap.set(n.id, n);
      const deleted = previousNotes.filter(n => !currentMap.has(n.id));

      if (added.length === 0 && updated.length === 0 && deleted.length === 0) return false;

      setSaveStatus(isRetry ? "retrying" : "saving");

      for (let attempt = 0; attempt <= SAVE_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          for (const note of added) await saveSingleNote(note);
          for (const note of updated) {
            const latest = await loadSingleNote(note.id);
            if (!latest) continue;
            if (latest.updatedAt > note.updatedAt) continue;
            await saveSingleNote(note);
          }
          for (const note of deleted) await deleteSingleNote(note.id);
          prevNotesRef.current = snapshot;
          broadcastNotesChanged(updated[0]?.id ?? added[0]?.id ?? deleted[0]?.id);
          setSaveError(false);
          setSaveStatus("saved");
          return true;
        } catch (error) {
          if (attempt === SAVE_RETRY_DELAYS_MS.length) {
            console.error("Failed to save notes:", error);
            setSaveError(true);
            setSaveStatus("error");
            throw error;
          }

          setSaveStatus("retrying");
          await sleep(SAVE_RETRY_DELAYS_MS[attempt]);
        }
      }

      return false;
    },
    [broadcastNotesChanged]
  );

  useEffect(() => {
    currentNoteIdRef.current = currentNoteId;
  }, [currentNoteId]);

  useEffect(() => {
    window.setTimeout(() => {
      reloadNotes()
        .then(() => {
          setLoaded(true);
        })
        .catch(error => {
          console.error("Failed to load notes:", error);
          setLoaded(true);
        });
    }, 0);
  }, [reloadNotes]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(NOTES_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = event => {
      const message = event.data as Partial<NotesSyncMessage>;
      if (message.type !== "notes-changed" || message.sourceId === sourceIdRef.current) return;

      saveQueueRef.current = saveQueueRef.current
        .catch(() => {})
        .then(async () => {
          await reloadNotes(message.noteId ?? null);
        });
    };

    return () => {
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [reloadNotes]);

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

    const timeoutId = window.setTimeout(() => {
      const snapshot = notes;
      const previousNotes = prevNotesRef.current;
      saveQueueRef.current = saveQueueRef.current
        .catch(() => {})
        .then(async () => {
          await persistChanges(snapshot, previousNotes);
        });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [notes, loaded, persistChanges]);

  const retrySave = useCallback(() => {
    if (!loaded) return;

    const snapshot = notes;
    const previousNotes = prevNotesRef.current;
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(async () => {
        await persistChanges(snapshot, previousNotes, true);
      });
  }, [loaded, notes, persistChanges]);

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
    saveStatus,
    clearSaveError: useCallback(() => setSaveError(false), []),
    retrySave,
  };
}
