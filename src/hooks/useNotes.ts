import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { AiEditorSnapshot, Note, NoteFormData, NoteVersionSource, SaveStatus } from "@types";
import { generateId, formatDate } from "@utils/export";
import { saveSingleNote, deleteSingleNote, loadNotes, loadSingleNote } from "@utils/storage";
import {
  idbDeleteNoteVersion,
  idbGetNoteVersions,
  idbPruneNoteVersions,
  idbSaveNoteVersion,
  idbPurgeNotes,
} from "@utils/indexedDBStorage";
import { invalidateAllDataCache } from "@utils/storage";
import { diffNotes } from "@utils/noteDiff";
import { publishCrossTabChange, subscribeCrossTabChange } from "@utils/crossTabSync";
import {
  createNoteVersion,
  hasMeaningfulNoteChange,
  NOTE_VERSION_LIMIT,
  shouldCreateAutoVersion,
} from "@utils/noteVersion";

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

export function useNotes(selectedFolderId: string | null = null, autoSave = true) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const prevNotesRef = useRef<Note[]>([]);
  const notesRef = useRef<Note[]>(notes);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const sourceIdRef = useRef(generateId());
  const currentNoteIdRef = useRef<string | null>(null);
  const lastVersionAtRef = useRef(new Map<string, number | null>());
  const [versionSaveError, setVersionSaveError] = useState<Error | null>(null);
  const versionRetryRef = useRef<(() => Promise<void>) | null>(null);
  const markPending = useCallback(() => setSaveStatus("dirty"), []);

  const saveNoteVersion = useCallback(
    async (
      note: Pick<Note, "id" | "title" | "content">,
      source: NoteVersionSource,
      now = Date.now()
    ) => {
      await idbSaveNoteVersion(createNoteVersion(note, source, now));
      await idbPruneNoteVersions(note.id, NOTE_VERSION_LIMIT);
      lastVersionAtRef.current.set(note.id, now);
      setVersionSaveError(null);
      versionRetryRef.current = null;
      publishCrossTabChange("note-versions");
    },
    []
  );

  const captureAutoVersion = useCallback(
    async (previous: Note, next: Note) => {
      if (!hasMeaningfulNoteChange(previous, next)) return;
      let lastVersionAt = lastVersionAtRef.current.get(previous.id);
      if (lastVersionAt === undefined) {
        lastVersionAt = (await idbGetNoteVersions(previous.id))[0]?.createdAt ?? null;
        lastVersionAtRef.current.set(previous.id, lastVersionAt);
      }
      const now = Date.now();
      if (!shouldCreateAutoVersion(lastVersionAt, now)) return;
      await saveNoteVersion(previous, "auto", now);
    },
    [saveNoteVersion]
  );

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const reloadNotes = useCallback(async (preferredNoteId?: string | null) => {
    invalidateAllDataCache();
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
      const { added, updated, deleted } = diffNotes(snapshot, previousNotes);

      if (added.length === 0 && updated.length === 0 && deleted.length === 0) return false;

      let statusTimer = 0;
      if (isRetry) {
        setSaveStatus("retrying");
      } else {
        statusTimer = window.setTimeout(() => setSaveStatus("saving"), 150);
      }

      try {
        for (let attempt = 0; attempt <= SAVE_RETRY_DELAYS_MS.length; attempt += 1) {
          try {
            for (const note of added) await saveSingleNote(note);
            for (const note of updated) {
              const latest = await loadSingleNote(note.id);
              if (!latest) continue;
              if (latest.updatedAt > note.updatedAt) continue;
              try {
                await captureAutoVersion(latest, note);
              } catch (versionError) {
                console.error("Failed to save note version:", versionError);
                const error =
                  versionError instanceof Error ? versionError : new Error(String(versionError));
                setVersionSaveError(error);
                versionRetryRef.current = () => saveNoteVersion(latest, "auto");
              }
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
      } finally {
        clearTimeout(statusTimer);
      }

      return false;
    },
    [broadcastNotesChanged, captureAutoVersion, saveNoteVersion]
  );

  useEffect(() => {
    currentNoteIdRef.current = currentNoteId;
  }, [currentNoteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState 发生在 await 之后，非同步
    reloadNotes()
      .then(() => {
        setLoaded(true);
      })
      .catch(error => {
        console.error("Failed to load notes:", error);
        setLoaded(true);
      });
  }, [reloadNotes]);

  useEffect(
    () =>
      subscribeCrossTabChange("notes", () => {
        saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(() => reloadNotes(null));
      }),
    [reloadNotes]
  );

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
    const active = notes.filter(note => !note.deletedAt);
    if (!selectedFolderId) return active;
    return active.filter(note => {
      const folderIds = note.folderIds || [];
      return folderIds.includes(selectedFolderId);
    });
  }, [notes, selectedFolderId]);

  const activeNotes = useMemo(() => notes.filter(note => !note.deletedAt), [notes]);

  const trashedNotes = useMemo(
    () =>
      notes.filter(note => note.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [notes]
  );

  const currentNote = useMemo(() => {
    return notesMap.get(currentNoteId ?? "") ?? null;
  }, [notesMap, currentNoteId]);

  useEffect(() => {
    if (!loaded || !autoSave) return;

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
  }, [notes, loaded, autoSave, persistChanges]);

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

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!loaded) return false;

    setSaveStatus("saving");
    const snapshot = notesRef.current;
    const previousNotes = prevNotesRef.current;
    let saved = false;
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(async () => {
        saved = await persistChanges(snapshot, previousNotes);
      });
    await saveQueueRef.current;
    if (!saved) setSaveStatus("saved");
    return saved;
  }, [loaded, persistChanges]);

  const saveEditorSnapshotNow = useCallback(
    async (snapshot: AiEditorSnapshot): Promise<boolean> => {
      if (!loaded) return false;
      const existing = notesRef.current.find(note => note.id === snapshot.noteId);
      if (!existing) return false;
      if (existing.title === snapshot.title && existing.content === snapshot.content) {
        return saveNow();
      }
      setSaveStatus("saving");
      const updated: Note = {
        ...existing,
        title: snapshot.title,
        content: snapshot.content,
        updatedAt: Date.now(),
      };
      const next = notesRef.current.map(note => (note.id === updated.id ? updated : note));
      notesRef.current = next;
      setNotes(next);
      let saved = false;
      saveQueueRef.current = saveQueueRef.current
        .catch(() => {})
        .then(async () => {
          saved = await persistChanges(next, prevNotesRef.current);
        });
      await saveQueueRef.current;
      return saved;
    },
    [loaded, persistChanges, saveNow]
  );

  const createNote = useCallback(
    (data: NoteFormData): Note => {
      const newNote: Note = {
        id: generateId(),
        title: data.title || "Untitled",
        content: data.content || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        folderIds: data.folderIds || [],
        attachments: [],
      };
      markPending();
      setNotes(prev => [newNote, ...prev]);
      setCurrentNoteId(newNote.id);
      return newNote;
    },
    [markPending]
  );

  const updateNote = useCallback(
    (id: string, data: Partial<NoteFormData & { attachments?: Note["attachments"] }>): void => {
      markPending();
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
    [markPending]
  );

  const deleteNote = useCallback(
    (id: string): void => {
      markPending();
      setNotes(prev => {
        const next = prev.map(note =>
          note.id === id ? { ...note, deletedAt: Date.now(), updatedAt: Date.now() } : note
        );
        if (currentNoteIdRef.current === id) {
          const remaining = next.filter(n => n.id !== id && !n.deletedAt);
          setCurrentNoteId(remaining.length > 0 ? remaining[0].id : null);
        }
        return next;
      });
    },
    [markPending]
  );

  const restoreNote = useCallback(
    (id: string): void => {
      markPending();
      setNotes(prev =>
        prev.map(note => {
          if (note.id !== id) return note;
          const rest = { ...note };
          delete rest.deletedAt;
          return { ...rest, updatedAt: Date.now() };
        })
      );
    },
    [markPending]
  );

  const purgeNote = useCallback(
    async (id: string): Promise<void> => {
      await idbPurgeNotes([id]);
      setNotes(prev => {
        const next = prev.filter(note => note.id !== id);
        notesRef.current = next;
        return next;
      });
      prevNotesRef.current = prevNotesRef.current.filter(note => note.id !== id);
      lastVersionAtRef.current.delete(id);
      broadcastNotesChanged(id);
      publishCrossTabChange("note-versions");
    },
    [broadcastNotesChanged]
  );

  const deleteNoteVersion = useCallback(async (noteId: string, versionId: string) => {
    await idbDeleteNoteVersion(versionId);
    lastVersionAtRef.current.delete(noteId);
    publishCrossTabChange("note-versions");
  }, []);

  const retryVersionSave = useCallback(() => {
    const retry = versionRetryRef.current;
    if (!retry) return;
    setVersionSaveError(null);
    void retry().catch(reason => {
      setVersionSaveError(reason instanceof Error ? reason : new Error(String(reason)));
    });
  }, []);

  const emptyTrash = useCallback(async (): Promise<void> => {
    const trashedIds = notesRef.current.filter(note => note.deletedAt).map(note => note.id);
    await idbPurgeNotes(trashedIds);
    const next = notesRef.current.filter(note => !note.deletedAt);
    notesRef.current = next;
    setNotes(next);
    const removed = new Set(trashedIds);
    prevNotesRef.current = prevNotesRef.current.filter(note => !removed.has(note.id));
    for (const id of trashedIds) lastVersionAtRef.current.delete(id);
    broadcastNotesChanged();
    publishCrossTabChange("note-versions");
  }, [broadcastNotesChanged]);

  const getFormattedDate = useCallback(
    (id: string): string => {
      const note = notesMap.get(id);
      return note ? formatDate(note.updatedAt) : "";
    },
    [notesMap]
  );

  const reorderNotes = useCallback(
    (activeId: string, overId: string) => {
      markPending();
      setNotes(prev => {
        const activeIndex = prev.findIndex(n => n.id === activeId);
        const overIndex = prev.findIndex(n => n.id === overId);
        if (activeIndex === -1 || overIndex === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(activeIndex, 1);
        next.splice(overIndex, 0, moved);
        const now = Date.now();
        return next.map((note, index) =>
          note.order === index ? note : { ...note, order: index, updatedAt: now }
        );
      });
    },
    [markPending]
  );

  const reorderNotesInFolder = useCallback(
    (folderId: string, activeId: string, overId: string) => {
      markPending();
      setNotes(prev => {
        const inFolder = prev
          .filter(n => Array.isArray(n.folderIds) && n.folderIds.includes(folderId))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const activeIndex = inFolder.findIndex(n => n.id === activeId);
        const overIndex = inFolder.findIndex(n => n.id === overId);
        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return prev;
        const reordered = [...inFolder];
        const [moved] = reordered.splice(activeIndex, 1);
        reordered.splice(overIndex, 0, moved);

        const orderMap = new Map<string, number>();
        reordered.forEach((n, i) => orderMap.set(n.id, i));

        const now = Date.now();
        return prev.map(note => {
          const nextOrder = orderMap.get(note.id);
          if (nextOrder === undefined || note.order === nextOrder) return note;
          return { ...note, order: nextOrder, updatedAt: now };
        });
      });
    },
    [markPending]
  );

  return {
    notes: filteredNotes,
    allNotes: activeNotes,
    trashedNotes,
    currentNote,
    currentNoteId,
    setCurrentNoteId,
    createNote,
    updateNote,
    deleteNote,
    restoreNote,
    purgeNote,
    emptyTrash,
    reorderNotes,
    reorderNotesInFolder,
    getFormattedDate,
    loaded,
    saveError,
    saveStatus,
    clearSaveError: useCallback(() => setSaveError(false), []),
    retrySave,
    saveNow,
    saveEditorSnapshotNow,
    saveNoteVersion,
    deleteNoteVersion,
    versionSaveError,
    retryVersionSave,
  };
}
