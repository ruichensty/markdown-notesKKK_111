import { useState, useRef, lazy, Suspense } from "react";
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
} from "@components";
import type { EditorHandle } from "@components/Editor";

const Preview = lazy(() => import("./components/Preview"));

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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"home" | "editor" | "preview" | "split">("home");
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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
  } = useNotes(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);

  const handleJumpToLine = (line: number) => {
    editorRef.current?.scrollToLine(line);
  };

  const handleNewNote = (folderIds?: string[]) => {
    try {
      createNote({ title: "", content: "", folderIds });
      setViewMode("split");
      showToast("New note created", "success");
    } catch (error) {
      handleStorageError(error as Error);
    }
  };

  const handleNoteUpdate = (id: string, data: { title?: string; content?: string }) => {
    try {
      updateNote(id, data);
    } catch (error) {
      handleStorageError(error as Error);
    }
  };

  const handleNoteSelect = (id: string) => {
    setCurrentNoteId(id);
  };

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
    setViewMode(mode);
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

  useWelcomeNote(loaded, notes, createNote, handleStorageError, showToast);

  useKeyboardShortcuts([
    {
      key: "s",
      ctrlKey: true,
      handler: () => {
        if (currentNote) {
          handleNoteUpdate(currentNote.id, {});
          showToast("Note saved", "success");
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
        const next =
          viewMode === "editor" ? "preview" : viewMode === "preview" ? "split" : "editor";
        setViewMode(next);
      },
      preventDefault: true,
    },
  ]);

  return (
    <>
      <div className="app-shell h-screen w-screen flex bg-background text-foreground relative overflow-hidden">
        <NoteList
          notes={notes}
          activeNoteId={currentNoteId}
          onNoteSelect={id => {
            handleNoteSelect(id);
            if (viewMode === "home") setViewMode("split");
          }}
          onNewNote={handleNewNote}
          onNoteDelete={id => {
            deleteNote(id);
          }}
          onRemoveFolderFromNotes={handleRemoveFolderFromNotes}
          onReorderNotes={reorderNotes}
          searchInputRef={searchInputRef}
          getFormattedDate={getFormattedDate}
          sidebarWidth={settings.sidebarWidth}
          collapsed={!sidebarOpen}
          currentNoteContent={currentNote?.content}
          onJumpToLine={handleJumpToLine}
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
          />

          <div className="flex-1 flex overflow-hidden relative">
            {viewMode === "home" ? (
              <HomeView onNewNote={handleNewNote} />
            ) : currentNote ? (
              <div className="flex-1 flex min-w-0">
                {(viewMode === "editor" || viewMode === "split") && (
                  <Editor
                    ref={editorRef}
                    note={currentNote}
                    onUpdate={handleNoteUpdate}
                    fontSize={settings.fontSize}
                    lineHeight={settings.lineHeight}
                    focusMode={settings.focusMode}
                    typewriterMode={settings.typewriterMode}
                    autoPair={settings.autoPair}
                  />
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

          <StatusBar allNotes={allNotes} currentNote={currentNote} />
        </div>
      </div>
    </>
  );
}
