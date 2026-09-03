import { useState, useRef, lazy, Suspense, useEffect, useCallback } from "react";
import { ThemeProvider, ToastProvider, useToast, useTheme } from "@context";
import {
  useNotes,
  useFolders,
  useKeyboardShortcuts,
  useErrorHandler,
  useSettings,
  useWelcomeNote,
  useEyeCare,
  useHealthReminder,
  useTemplates,
} from "@hooks";
import {
  Toolbar,
  NoteList,
  Editor,
  StatusBar,
  ErrorBoundary,
  SettingsPanel,
  HomeView,
  ParticleBackground,
  UsageTimeWidget,
  DoodleCanvas,
  HealthReminderPopup,
  CommandPalette,
  TemplatePicker,
  TrashView,
} from "@components";
import { ContextMenuProvider } from "@components/ContextMenu";
import type { EditorHandle } from "@components/Editor";
import type { Note } from "@types";
import { applyTemplateVariables } from "@utils/template";
import { applyAccent } from "./constants/accents";

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
          <ContextMenuProvider>
            <AppContent />
          </ContextMenuProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="animate-pulse mb-3 text-foreground/20">
        <svg
          viewBox="0 0 16 16"
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
        >
          <path d="M4.5 1.5h4.672a1 1 0 01.707.293l3.328 3.328a1 1 0 01.293.707V13a1.5 1.5 0 01-1.5 1.5h-7.5A1.5 1.5 0 013 13V3a1.5 1.5 0 011.5-1.5z" />
          <path d="M9 1.5V6h4.5" />
        </svg>
      </div>
      <p className="text-xs text-muted-foreground/50">Loading...</p>
    </div>
  );
}

function AppContent() {
  const { showToast } = useToast();
  const { handleStorageError } = useErrorHandler();
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    applyAccent(settings.accentColor, theme);
  }, [settings.accentColor, theme]);
  const eyeCare = useEyeCare(settings.eyeCare);
  const healthReminder = useHealthReminder(
    settings.healthReminder,
    settings.reminderInterval,
    settings.focusMode
  );

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [viewMode, setViewMode] = useState<"home" | "editor" | "preview" | "split">("home");
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [sidebarDragWidth, setSidebarDragWidth] = useState<number | null>(null);
  const newNoteLockRef = useRef(false);

  const { templates } = useTemplates();

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
    reorderNotesInFolder,
    getFormattedDate,
    loaded,
    saveError,
    saveStatus,
    retrySave,
    saveNow,
    trashedNotes,
    restoreNote,
    purgeNote,
    emptyTrash,
  } = useNotes(null);

  const { folders, updateFolder } = useFolders();

  useEffect(() => {
    if (saveError) {
      showToast("保存失败，请检查存储空间后重试", "error", 0, {
        label: "重试",
        onClick: retrySave,
      });
    }
  }, [saveError, retrySave, showToast]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const currentNoteRef = useRef<Note | null>(null);

  useEffect(() => {
    currentNoteRef.current = currentNote;
  }, [currentNote]);

  const handleJumpToLine = useCallback((line: number) => {
    editorRef.current?.scrollToLine(line);
  }, []);

  const handleNewNote = useCallback(
    (folderIds?: string[], templateId?: string) => {
      if (newNoteLockRef.current) return;
      newNoteLockRef.current = true;

      try {
        let title = "";
        let content = "";

        if (templateId) {
          const tpl = templates.find(t => t.id === templateId);
          if (tpl) {
            title = tpl.name;
            content = tpl.content;
          }
        }

        const newNote = createNote({ title, content, folderIds });
        setViewMode("split");
        showToast("新笔记已创建", "success");

        if (content) {
          requestAnimationFrame(() => {
            const applied = applyTemplateVariables(content, title);
            updateNote(newNote.id, { title, content: applied });
          });
        }
      } catch (error) {
        handleStorageError(error as Error);
      } finally {
        window.setTimeout(() => {
          newNoteLockRef.current = false;
        }, 500);
      }
    },
    [templates, createNote, updateNote, showToast, handleStorageError]
  );

  const handleNewNoteFromPicker = useCallback(
    (templateId: string | undefined) => {
      handleNewNote(undefined, templateId);
    },
    [handleNewNote]
  );

  const handleInsertTemplate = useCallback(
    (templateId: string) => {
      const tpl = templates.find(t => t.id === templateId);
      const note = currentNoteRef.current;
      if (!tpl || !note) return;

      const applied = applyTemplateVariables(tpl.content, note.title || "Untitled");
      const newContent = note.content ? note.content + "\n\n" + applied : applied;
      updateNote(note.id, { content: newContent });
      showToast(`已插入模板「${tpl.name}」`, "success");
    },
    [templates, updateNote, showToast]
  );

  const handleNoteUpdate = useCallback(
    (id: string, data: { title?: string; content?: string }) => {
      try {
        updateNote(id, data);
      } catch (error) {
        handleStorageError(error as Error);
      }
    },
    [updateNote, handleStorageError]
  );

  const handleNoteSelect = useCallback(
    (id: string) => {
      setCurrentNoteId(id);
      if (isMobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    },
    [isMobile, setCurrentNoteId]
  );

  const handleExportMenuToggle = useCallback(() => {
    setShowExportMenu(prev => !prev);
  }, []);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleViewModeChange = useCallback(
    (mode: "home" | "editor" | "preview" | "split") => {
      if (isMobile && mode === "split") {
        setViewMode("editor");
      } else {
        setViewMode(mode);
      }
    },
    [isMobile]
  );

  const handleRemoveFolderFromNotes = useCallback(
    (folderIds: string[]) => {
      const folderIdSet = new Set(folderIds);
      for (const note of allNotes) {
        if (note.folderIds && note.folderIds.some(id => folderIdSet.has(id))) {
          updateNote(note.id, {
            folderIds: note.folderIds.filter(id => !folderIdSet.has(id)),
          });
        }
      }
    },
    [allNotes, updateNote]
  );

  const handleGoHome = useCallback(() => {
    setCurrentNoteId(null);
    setViewMode("home");
    if (
      settings.homeLayout === "writer" ||
      settings.homeLayout === "curtain" ||
      settings.homeLayout === "dashboard"
    ) {
      setSidebarOpen(false);
    }
  }, [setCurrentNoteId, settings.homeLayout]);

  const handleOpenInEditor = useCallback(
    (id: string) => {
      handleNoteSelect(id);
      setViewMode(isMobile ? "editor" : "split");
    },
    [handleNoteSelect, isMobile]
  );

  const handleStartNewNote = useCallback(() => {
    if (templates.length > 0) {
      setShowTemplatePicker(true);
    } else {
      handleNewNote();
    }
  }, [templates.length, handleNewNote]);

  const handleCloseCommandPalette = useCallback(() => {
    setShowCommandPalette(false);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleCloseTemplatePicker = useCallback(() => {
    setShowTemplatePicker(false);
  }, []);

  const handleOpenTrash = useCallback(() => {
    setShowTrash(true);
  }, []);

  const handleCloseTrash = useCallback(() => {
    setShowTrash(false);
  }, []);

  const handleRestoreFromTrash = useCallback(
    (id: string) => {
      restoreNote(id);
      showToast("笔记已恢复", "success");
    },
    [restoreNote, showToast]
  );

  const handlePurgeFromTrash = useCallback(
    (id: string) => {
      purgeNote(id);
      showToast("已永久删除", "success");
    },
    [purgeNote, showToast]
  );

  const handleEmptyTrash = useCallback(() => {
    emptyTrash();
    showToast("回收站已清空", "success");
  }, [emptyTrash, showToast]);

  const handleExpandedFoldersChange = useCallback(
    (ids: string[]) => {
      updateSettings({ expandedFolders: ids });
    },
    [updateSettings]
  );

  const handleClearFolderSelection = useCallback(() => {
    setSelectedFolderId(null);
  }, []);

  const handleToggleFocusMode = useCallback(() => {
    updateSettings({ focusMode: !settings.focusMode });
  }, [updateSettings, settings.focusMode]);

  const handleToggleTypewriterMode = useCallback(() => {
    updateSettings({ typewriterMode: !settings.typewriterMode });
  }, [updateSettings, settings.typewriterMode]);

  const handleEditorSave = useCallback(() => {
    void saveNow()
      .then(saved => {
        if (saved) showToast("笔记已保存", "success");
      })
      .catch(() => {});
  }, [saveNow, showToast]);

  const handleDoodleClear = useCallback(() => {
    showToast("涂鸦已清除", "success");
  }, [showToast]);

  const handlePaletteSelectNote = useCallback(
    (id: string) => {
      setSelectedFolderId(null);
      handleNoteSelect(id);
      if (viewMode === "home") setViewMode(isMobile ? "editor" : "split");
    },
    [handleNoteSelect, viewMode, isMobile]
  );

  const handlePaletteSelectFolder = useCallback((id: string) => {
    setSelectedFolderId(id);
    setSidebarOpen(true);
  }, []);

  const handlePaletteNewNote = useCallback(
    (templateId?: string) => {
      handleNewNote(undefined, templateId);
    },
    [handleNewNote]
  );

  const handleSplitDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const startX = e.clientX;
    const startWidth = container.getBoundingClientRect().width;
    const leftPane = container.firstElementChild as HTMLElement;
    if (!leftPane) return;
    const startLeftWidth = leftPane.getBoundingClientRect().width;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const newLeftWidth = Math.max(200, Math.min(startWidth - 200, startLeftWidth + dx));
      setSplitRatio(newLeftWidth / startWidth);
    };
    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, []);

  const handleSidebarResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const frame = (e.currentTarget as HTMLElement).parentElement;
      if (!frame) return;
      const startX = e.clientX;
      const startWidth = frame.getBoundingClientRect().width;
      const clampWidth = (width: number) => Math.max(220, Math.min(460, width));

      const onPointerMove = (ev: PointerEvent) => {
        setSidebarDragWidth(clampWidth(startWidth + (ev.clientX - startX)));
      };
      const onPointerUp = (ev: PointerEvent) => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        const next = clampWidth(startWidth + (ev.clientX - startX));
        setSidebarDragWidth(null);
        updateSettings({ sidebarWidth: next });
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [updateSettings]
  );

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

  const handleNoteDelete = useCallback(
    (id: string) => {
      const note = allNotes.find(n => n.id === id);
      const title = note?.title || "Untitled";
      deleteNote(id);
      showToast(`已将「${title}」移入回收站`, "success", 5000, {
        label: "撤销",
        onClick: () => restoreNote(id),
      });
    },
    [allNotes, deleteNote, restoreNote, showToast]
  );

  const handleBatchDelete = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        deleteNote(id);
      }
      showToast(`已将 ${ids.length} 条笔记移入回收站`, "success", 5000, {
        label: "撤销",
        onClick: () => {
          for (const id of ids) restoreNote(id);
        },
      });
    },
    [deleteNote, restoreNote, showToast]
  );

  const handleMoveNoteToFolder = useCallback(
    (noteId: string, folderId: string) => {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) return;
      const currentFolders = note.folderIds || [];
      if (!currentFolders.includes(folderId)) {
        updateNote(noteId, { folderIds: [...currentFolders, folderId] });
        showToast("笔记已移动", "success");
      }
    },
    [allNotes, updateNote, showToast]
  );

  const handleMoveNoteToRoot = useCallback(
    (noteId: string) => {
      updateNote(noteId, { folderIds: [] });
      showToast("笔记已移出文件夹", "success");
    },
    [updateNote, showToast]
  );

  const handleBatchMoveToFolder = useCallback(
    (ids: string[], folderId: string) => {
      let count = 0;
      for (const id of ids) {
        const note = allNotes.find(n => n.id === id);
        if (!note) continue;
        const currentFolders = note.folderIds || [];
        if (!currentFolders.includes(folderId)) {
          updateNote(id, { folderIds: [...currentFolders, folderId] });
          count++;
        }
      }
      if (count > 0) showToast(`已移动 ${count} 条笔记`, "success");
    },
    [allNotes, updateNote, showToast]
  );

  const handleCopyNote = useCallback(
    (noteId: string) => {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) return;
      createNote({
        title: `${note.title} (副本)`,
        content: note.content,
        folderIds: note.folderIds || [],
      });
      showToast("笔记已复制", "success");
    },
    [allNotes, createNote, showToast]
  );

  const handleReorderFolder = useCallback(
    (folderId: string, newParentId: string | null) => {
      updateFolder(folderId, { parentId: newParentId });
    },
    [updateFolder]
  );

  useWelcomeNote(loaded, notes, createNote, handleStorageError, showToast);

  useKeyboardShortcuts([
    {
      key: "s",
      ctrlKey: true,
      handler: () => {
        if (currentNote) {
          void saveNow()
            .then(saved => {
              if (saved) showToast("笔记已保存", "success");
            })
            .catch(() => {});
        }
      },
      preventDefault: true,
    },
    {
      key: "n",
      ctrlKey: true,
      handler: () => handleNewNote(),
      preventDefault: true,
    },
    {
      key: "k",
      ctrlKey: true,
      handler: () => setShowCommandPalette(prev => !prev),
      preventDefault: true,
      allowInEditable: true,
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

  if (!loaded) {
    return <LoadingScreen />;
  }

  return (
    <>
      <div className="app-shell h-screen w-screen flex bg-background text-foreground relative overflow-hidden">
        <ParticleBackground
          hidden={settings.focusMode || settings.typewriterMode || !settings.particleEffects}
          isMobile={isMobile}
        />
        {isMobile && sidebarOpen && viewMode !== "home" && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
        {viewMode !== "home" && (
          <div
            className={`workspace-sidebar-frame ${sidebarDragWidth !== null ? "sidebar-resizing" : ""}`}
          >
            <NoteList
              notes={notes}
              activeNoteId={currentNoteId}
              onNoteSelect={handleOpenInEditor}
              onNewNote={handleStartNewNote}
              onNoteDelete={handleNoteDelete}
              onRemoveFolderFromNotes={handleRemoveFolderFromNotes}
              onReorderNotes={reorderNotes}
              onReorderNotesInFolder={reorderNotesInFolder}
              expandedFolders={settings.expandedFolders}
              onExpandedFoldersChange={handleExpandedFoldersChange}
              onBatchMoveToFolder={handleBatchMoveToFolder}
              searchInputRef={searchInputRef}
              getFormattedDate={getFormattedDate}
              sidebarWidth={sidebarDragWidth ?? settings.sidebarWidth}
              collapsed={!sidebarOpen}
              currentNoteContent={currentNote?.content}
              onJumpToLine={handleJumpToLine}
              isMobile={isMobile}
              onBatchDelete={handleBatchDelete}
              onMoveNoteToFolder={handleMoveNoteToFolder}
              onMoveNoteToRoot={handleMoveNoteToRoot}
              onCopyNote={handleCopyNote}
              onReorderFolder={handleReorderFolder}
              trashCount={trashedNotes.length}
              onOpenTrash={handleOpenTrash}
              selectedFolderId={selectedFolderId}
              onClearFolderSelection={handleClearFolderSelection}
            />
            {!isMobile && sidebarOpen && (
              <div
                className="sidebar-resize-handle"
                onPointerDown={handleSidebarResize}
                title="拖拽调整侧栏宽度"
              />
            )}
          </div>
        )}

        <div className="content-area flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Toolbar
            currentNote={currentNote}
            onNewNote={handleStartNewNote}
            showExportMenu={showExportMenu}
            onToggleExportMenu={handleExportMenuToggle}
            onToggleSidebar={handleToggleSidebar}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onToggleSettings={handleToggleSettings}
            onGoHome={handleGoHome}
            focusMode={settings.focusMode}
            typewriterMode={settings.typewriterMode}
            onToggleFocusMode={handleToggleFocusMode}
            onToggleTypewriterMode={handleToggleTypewriterMode}
            isMobile={isMobile}
          />

          <div className="flex-1 flex overflow-hidden relative">
            {viewMode === "home" ? (
              <HomeView
                onNewNote={handleStartNewNote}
                notes={allNotes}
                onNoteSelect={handleOpenInEditor}
                layout={settings.homeLayout}
              />
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
                      onSave={handleEditorSave}
                      fontSize={settings.fontSize}
                      lineHeight={settings.lineHeight}
                      fontFamily={settings.fontFamily}
                      focusMode={settings.focusMode}
                      typewriterMode={settings.typewriterMode}
                      autoPair={settings.autoPair}
                      isMobile={isMobile}
                      typingSound={settings.typingSound}
                      onAttachmentAdd={handleAttachmentAdd}
                    />
                  </div>
                )}
                {viewMode === "split" && (
                  <div className="split-handle" onPointerDown={handleSplitDrag} />
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
              <HomeView
                onNewNote={handleStartNewNote}
                notes={allNotes}
                onNoteSelect={handleOpenInEditor}
                layout={settings.homeLayout}
              />
            )}

            {settings.doodleLayer && currentNote && (
              <DoodleCanvas visible={settings.doodleLayer} onClear={handleDoodleClear} />
            )}
          </div>

          <StatusBar
            allNotes={allNotes}
            currentNote={currentNote}
            saveStatus={saveStatus}
            onRetrySave={retrySave}
          />
        </div>

        <UsageTimeWidget hidden={isMobile} />

        {eyeCare.isActive && (
          <div className="eyecare-indicator" title={eyeCare.phaseLabel}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span>{eyeCare.phaseLabel}</span>
          </div>
        )}
      </div>
      <HealthReminderPopup
        visible={healthReminder.visible}
        message={healthReminder.message}
        onDismiss={healthReminder.dismiss}
        onSnooze={healthReminder.snooze}
      />
      <SettingsPanel
        isOpen={showSettings}
        onClose={handleCloseSettings}
        settings={settings}
        onUpdate={updateSettings}
        onInsertTemplate={handleInsertTemplate}
      />
      <CommandPalette
        open={showCommandPalette}
        onClose={handleCloseCommandPalette}
        notes={allNotes}
        folders={folders}
        templates={templates}
        onSelectNote={handlePaletteSelectNote}
        onSelectFolder={handlePaletteSelectFolder}
        onNewNote={handlePaletteNewNote}
        onToggleTheme={toggleTheme}
        onToggleSettings={handleToggleSettings}
        onToggleFocusMode={handleToggleFocusMode}
        onToggleTypewriterMode={handleToggleTypewriterMode}
        onGoHome={handleGoHome}
        focusMode={settings.focusMode}
        typewriterMode={settings.typewriterMode}
      />
      <TemplatePicker
        open={showTemplatePicker}
        onClose={handleCloseTemplatePicker}
        templates={templates}
        onSelect={handleNewNoteFromPicker}
      />
      <TrashView
        open={showTrash}
        onClose={handleCloseTrash}
        notes={trashedNotes}
        onRestore={handleRestoreFromTrash}
        onPurge={handlePurgeFromTrash}
        onEmptyTrash={handleEmptyTrash}
      />
    </>
  );
}
