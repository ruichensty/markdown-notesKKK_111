import { useState, useRef, lazy, Suspense, useEffect, useCallback } from "react";
import { ThemeProvider, ToastProvider, useToast } from "@context";
import {
  useNotes,
  useKeyboardShortcuts,
  useErrorHandler,
  useSettings,
  useWelcomeNote,
} from "@hooks";
import {
  Toolbar,
  NoteList,
  Editor,
  StatusBar,
  ErrorBoundary,
  SettingsPanel,
  HomeView,
  ConfirmDialog,
} from "@components";
import type { EditorHandle } from "@components/Editor";

const Preview = lazy(() => import("./components/Preview"));

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { showToast } = useToast();
  const { handleStorageError } = useErrorHandler();
  const { settings, updateSettings } = useSettings();
  const isMobile = useIsMobile();

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [viewMode, setViewMode] = useState<"home" | "editor" | "preview" | "split">("home");
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const newNoteLockRef = useRef(false);

  const {
    notes,
    allNotes,
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
    clearSaveError,
    retrySave,
  } = useNotes(null);

  useEffect(() => {
    if (saveError) {
      showToast("保存失败，请检查存储空间", "error");
      clearSaveError();
    }
  }, [saveError, clearSaveError, showToast]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);

  const handleJumpToLine = (line: number) => {
    editorRef.current?.scrollToLine(line);
  };

  const handleNewNote = (folderIds?: string[]) => {
    if (newNoteLockRef.current) return;
    newNoteLockRef.current = true;

    try {
      createNote({ title: "", content: "", folderIds });
      setViewMode("split");
      showToast("新笔记已创建", "success");
    } catch (error) {
      handleStorageError(error as Error);
    } finally {
      window.setTimeout(() => {
        newNoteLockRef.current = false;
      }, 500);
    }
  };

  const handleNoteUpdate = (id: string, data: { title?: string; content?: string }) => {
    try {
      updateNote(id, data);
    } catch (error) {
      handleStorageError(error as Error);
    }
  };

  const handleNoteSelect = useCallback(
    (id: string) => {
      setCurrentNoteId(id);
      if (isMobile) setSidebarOpen(false);
    },
    [isMobile, setCurrentNoteId]
  );

  const handleExportMenuToggle = () => {
    setShowExportMenu(!showExportMenu);
  };

  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleViewModeChange = (mode: "home" | "editor" | "preview" | "split") => {
    if (isMobile && mode === "split") {
      setViewMode("editor");
    } else {
      setViewMode(mode);
    }
  };

  const handleRemoveFolderFromNotes = (folderIds: string[]) => {
    const folderIdSet = new Set(folderIds);
    for (const note of allNotes) {
      if (note.folderIds && note.folderIds.some(id => folderIdSet.has(id))) {
        updateNote(note.id, {
          folderIds: note.folderIds.filter(id => !folderIdSet.has(id)),
        });
      }
    }
  };

  const handleGoHome = () => {
    setCurrentNoteId(null);
    setViewMode("home");
  };

  const handleSplitDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = (e.target as HTMLElement).parentElement;
    if (!container) return;
    const startX = e.clientX;
    const startWidth = container.getBoundingClientRect().width;
    const leftPane = container.firstElementChild as HTMLElement;
    if (!leftPane) return;
    const startLeftWidth = leftPane.getBoundingClientRect().width;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newLeftWidth = Math.max(200, Math.min(startWidth - 200, startLeftWidth + dx));
      setSplitRatio(newLeftWidth / startWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const handleAttachmentAdd = useCallback(
    (
      noteId: string,
      attachment: {
        id: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedAt: number;
      }
    ) => {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) return;
      updateNote(noteId, {
        attachments: [...(note.attachments || []), attachment],
      });
    },
    [allNotes, updateNote]
  );

  const handleBatchDelete = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        deleteNote(id);
      }
      showToast(`已删除 ${ids.length} 条笔记`, "success");
    },
    [deleteNote, showToast]
  );

  useWelcomeNote(loaded, notes, createNote, handleStorageError, showToast);

  useKeyboardShortcuts([
    {
      key: "s",
      ctrlKey: true,
      handler: () => {
        if (currentNote) {
          handleNoteUpdate(currentNote.id, {});
          showToast("笔记已保存", "success");
        }
      },
      preventDefault: true,
    },
    {
      key: "n",
      ctrlKey: true,
      handler: handleNewNote,
      preventDefault: true,
    },
    {
      key: "f",
      ctrlKey: true,
      handler: () => {
        searchInputRef.current?.focus();
      },
      preventDefault: true,
    },
    {
      key: "F8",
      handler: () => {
        const next = !settings.focusMode;
        updateSettings({ focusMode: next });
        showToast(next ? "焦点模式已开启" : "焦点模式已关闭", "success");
      },
    },
    {
      key: "F9",
      handler: () => {
        const next = !settings.typewriterMode;
        updateSettings({ typewriterMode: next });
        showToast(next ? "打字机模式已开启" : "打字机模式已关闭", "success");
      },
    },
    {
      key: "e",
      ctrlKey: true,
      handler: () => {
        if (!currentNote) return;
        const next = viewMode === "editor" ? "split" : viewMode === "split" ? "preview" : "editor";
        setViewMode(next);
      },
      preventDefault: true,
    },
  ]);

  return (
    <>
      <div className="app-shell h-screen w-screen flex bg-background text-foreground relative overflow-hidden">
        {isMobile && sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
        <NoteList
          notes={notes}
          activeNoteId={currentNoteId}
          onNoteSelect={id => {
            handleNoteSelect(id);
            if (viewMode === "home") setViewMode(isMobile ? "editor" : "split");
          }}
          onNewNote={handleNewNote}
          onNoteDelete={id => {
            setDeleteTarget(id);
          }}
          onRemoveFolderFromNotes={handleRemoveFolderFromNotes}
          onReorderNotes={reorderNotes}
          searchInputRef={searchInputRef}
          getFormattedDate={getFormattedDate}
          sidebarWidth={settings.sidebarWidth}
          collapsed={!sidebarOpen}
          currentNoteContent={currentNote?.content}
          onJumpToLine={handleJumpToLine}
          isMobile={isMobile}
          onBatchDelete={handleBatchDelete}
        />

        <div className="content-area flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Toolbar
            currentNote={currentNote}
            onNewNote={handleNewNote}
            showExportMenu={showExportMenu}
            onToggleExportMenu={handleExportMenuToggle}
            onToggleSidebar={handleToggleSidebar}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onToggleSettings={handleToggleSettings}
            onGoHome={handleGoHome}
            focusMode={settings.focusMode}
            typewriterMode={settings.typewriterMode}
            onToggleFocusMode={() => updateSettings({ focusMode: !settings.focusMode })}
            onToggleTypewriterMode={() =>
              updateSettings({ typewriterMode: !settings.typewriterMode })
            }
            isMobile={isMobile}
          />

          <div className="flex-1 flex overflow-hidden relative">
            {viewMode === "home" ? (
              <HomeView onNewNote={handleNewNote} />
            ) : currentNote ? (
              <div className="flex-1 flex min-w-0">
                {(viewMode === "editor" || viewMode === "split") && (
                  <div
                    style={
                      viewMode === "split"
                        ? {
                            width: `${splitRatio * 100}%`,
                            flexShrink: 0,
                            display: "flex",
                            minHeight: 0,
                          }
                        : undefined
                    }
                    className={viewMode !== "split" ? "contents" : undefined}
                  >
                    <Editor
                      ref={editorRef}
                      note={currentNote}
                      onUpdate={handleNoteUpdate}
                      fontSize={settings.fontSize}
                      lineHeight={settings.lineHeight}
                      focusMode={settings.focusMode}
                      typewriterMode={settings.typewriterMode}
                      autoPair={settings.autoPair}
                      isMobile={isMobile}
                      onAttachmentAdd={attachment =>
                        handleAttachmentAdd(currentNote.id, attachment)
                      }
                    />
                  </div>
                )}
                {viewMode === "split" && (
                  <div className="split-handle" onMouseDown={handleSplitDrag} />
                )}
                {(viewMode === "preview" || viewMode === "split") && (
                  <Suspense
                    fallback={
                      <div className="flex-1 flex flex-col items-center justify-center bg-card/50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-xs text-muted-foreground mt-2">Loading preview...</p>
                      </div>
                    }
                  >
                    <Preview note={currentNote} showLineNumbers={settings.showLineNumbers} />
                  </Suspense>
                )}
              </div>
            ) : (
              <HomeView onNewNote={handleNewNote} />
            )}

            <SettingsPanel
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              settings={settings}
              onUpdate={updateSettings}
            />
          </div>

          <StatusBar
            allNotes={allNotes}
            currentNote={currentNote}
            saveStatus={saveStatus}
            onRetrySave={retrySave}
          />
        </div>
      </div>
      {deleteTarget && (
        <ConfirmDialog
          message="确定要删除这条笔记吗？此操作不可恢复。"
          onConfirm={() => {
            deleteNote(deleteTarget);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
