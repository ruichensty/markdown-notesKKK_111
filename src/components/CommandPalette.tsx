import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import type { Note, Folder, NoteTemplate } from "@types";
import { useDialogA11y } from "@hooks";

export interface PaletteItem {
  id: string;
  label: string;
  group: string;
  icon: "note" | "folder" | "action" | "template" | "setting";
  keywords?: string[];
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  templates: NoteTemplate[];
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onNewNote: (templateId?: string) => void;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
  onToggleFocusMode: () => void;
  onToggleTypewriterMode: () => void;
  onGoHome: () => void;
  focusMode: boolean;
  typewriterMode: boolean;
}

function fuzzyMatch(query: string, text: string): { matched: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (t.includes(q)) {
    const idx = t.indexOf(q);
    return { matched: true, score: idx === 0 ? 1000 - q.length : 500 - idx };
  }

  let qi = 0;
  let score = 0;
  let lastMatchIdx = -2;

  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += i === lastMatchIdx + 1 ? 10 : 1;
      lastMatchIdx = i;
      qi++;
    }
  }

  if (qi === q.length) {
    return { matched: true, score };
  }
  return { matched: false, score: 0 };
}

function CommandPaletteBase({
  open,
  onClose,
  notes,
  folders,
  templates,
  onSelectNote,
  onSelectFolder,
  onNewNote,
  onToggleTheme,
  onToggleSettings,
  onToggleFocusMode,
  onToggleTypewriterMode,
  onGoHome,
  focusMode,
  typewriterMode,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { dialogRef, titleId } = useDialogA11y({ open, onClose });

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const result: PaletteItem[] = [];

    result.push({
      id: "action-home",
      label: "返回首页",
      group: "操作",
      icon: "action",
      keywords: ["home", "首页"],
      action: () => {
        onGoHome();
        onClose();
      },
    });

    result.push({
      id: "action-new-note",
      label: "新建空白笔记",
      group: "操作",
      icon: "action",
      keywords: ["new", "create", "新建", "创建"],
      action: () => {
        onNewNote();
        onClose();
      },
    });

    result.push({
      id: "action-toggle-theme",
      label: "切换深色/浅色模式",
      group: "操作",
      icon: "action",
      keywords: ["theme", "dark", "light", "主题", "深色", "浅色"],
      action: () => {
        onToggleTheme();
        onClose();
      },
    });

    result.push({
      id: "action-focus",
      label: focusMode ? "关闭焦点模式" : "开启焦点模式",
      group: "模式",
      icon: "setting",
      keywords: ["focus", "焦点", "专注"],
      action: () => {
        onToggleFocusMode();
        onClose();
      },
    });

    result.push({
      id: "action-typewriter",
      label: typewriterMode ? "关闭打字机模式" : "开启打字机模式",
      group: "模式",
      icon: "setting",
      keywords: ["typewriter", "打字机"],
      action: () => {
        onToggleTypewriterMode();
        onClose();
      },
    });

    result.push({
      id: "action-settings",
      label: "打开设置",
      group: "操作",
      icon: "action",
      keywords: ["settings", "设置", "配置"],
      action: () => {
        onToggleSettings();
        onClose();
      },
    });

    for (const note of notes) {
      result.push({
        id: `note-${note.id}`,
        label: note.title || "Untitled",
        group: "笔记",
        icon: "note",
        keywords: [note.title, note.content?.slice(0, 100)],
        action: () => {
          onSelectNote(note.id);
          onClose();
        },
      });
    }

    for (const folder of folders) {
      result.push({
        id: `folder-${folder.id}`,
        label: folder.name,
        group: "文件夹",
        icon: "folder",
        keywords: [folder.name],
        action: () => {
          onSelectFolder(folder.id);
          onClose();
        },
      });
    }

    for (const tpl of templates) {
      result.push({
        id: `template-${tpl.id}`,
        label: tpl.name,
        group: "模板",
        icon: "template",
        keywords: [tpl.name, tpl.description],
        action: () => {
          onNewNote(tpl.id);
          onClose();
        },
      });
    }

    return result;
  }, [
    notes,
    folders,
    templates,
    focusMode,
    typewriterMode,
    onSelectNote,
    onSelectFolder,
    onNewNote,
    onToggleTheme,
    onToggleSettings,
    onToggleFocusMode,
    onToggleTypewriterMode,
    onGoHome,
    onClose,
  ]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      const order = ["操作", "模式", "模板", "笔记", "文件夹"];
      return [...items].sort((a, b) => {
        const ai = order.indexOf(a.group);
        const bi = order.indexOf(b.group);
        return ai - bi;
      });
    }

    const scored = items
      .map(item => {
        const labelMatch = fuzzyMatch(query, item.label);
        const kwMatch = item.keywords
          ? Math.max(
              ...item.keywords.map(kw => fuzzyMatch(query, kw)).map(m => (m.matched ? m.score : 0))
            )
          : 0;
        return { item, score: Math.max(labelMatch.score, kwMatch) };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(s => s.item);
  }, [items, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const active = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx(prev => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered[activeIdx]) {
        e.preventDefault();
        filtered[activeIdx].action();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, activeIdx, onClose]
  );

  const groupedItems = useMemo(() => {
    const groups: { group: string; items: PaletteItem[] }[] = [];
    let currentGroup = "";

    for (const item of filtered) {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        groups.push({ group: currentGroup, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [filtered]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[99998] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-foreground/25 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="command-palette relative w-[600px] max-w-[92vw] max-h-[56vh] bg-popover/95 border border-border/60 rounded-2xl shadow-[0_28px_80px_hsl(var(--foreground)/0.16)] flex flex-col overflow-hidden animate-scale-in backdrop-blur-xl"
      >
        <h2 id={titleId} className="sr-only">
          命令面板
        </h2>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 bg-gradient-to-b from-card/40 to-transparent">
          <svg
            className="w-4 h-4 text-muted-foreground shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索笔记、模板或执行操作..."
            aria-label="搜索笔记、模板或操作"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] text-muted-foreground/50 bg-muted/60 rounded-lg border border-border/60 font-mono">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
              <svg
                className="w-8 h-8 mb-2"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M8 11h6" />
              </svg>
              <span className="text-xs">没有匹配的结果</span>
            </div>
          ) : (
            groupedItems.map(group => (
              <div key={group.group} className="mb-1">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {group.group}
                </div>
                {group.items.map(item => {
                  const idx = flatIdx++;
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.action()}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-primary/10 text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? "text-primary" : ""}`}>
                        {item.icon === "note" && (
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.3}
                          >
                            <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" />
                            <line x1="5" y1="4.5" x2="11" y2="4.5" />
                            <line x1="5" y1="7" x2="11" y2="7" />
                            <line x1="5" y1="9.5" x2="8" y2="9.5" />
                          </svg>
                        )}
                        {item.icon === "folder" && (
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.3}
                          >
                            <path d="M1.5 3.5h4.172a1 1 0 01.707.293L7.5 5.207a1 1 0 00.707.293H14.5a1 1 0 011 1V12a1 1 0 01-1 1h-13a1 1 0 01-1-1V4.5a1 1 0 011-1z" />
                          </svg>
                        )}
                        {item.icon === "template" && (
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.3}
                          >
                            <rect x="2" y="2" width="12" height="12" rx="1.5" />
                            <line x1="2" y1="5.5" x2="14" y2="5.5" />
                            <line x1="5" y1="2" x2="5" y2="5.5" />
                            <line x1="5" y1="8" x2="11" y2="8" />
                            <line x1="5" y1="10.5" x2="9" y2="10.5" />
                          </svg>
                        )}
                        {item.icon === "action" && (
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.3}
                          >
                            <circle cx="8" cy="8" r="6.5" />
                            <path d="M8 5v3l2 2" />
                          </svg>
                        )}
                        {item.icon === "setting" && (
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs font-medium truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border/50 bg-muted/20 text-[10px] text-muted-foreground/50">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted/70 rounded-md border border-border/60 font-mono">
              ↑↓
            </kbd>
            <span>选择</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted/70 rounded-md border border-border/60 font-mono">
              ↵
            </kbd>
            <span>确认</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted/70 rounded-md border border-border/60 font-mono">
              Esc
            </kbd>
            <span>关闭</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export const CommandPalette = memo(CommandPaletteBase);
