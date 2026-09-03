import { useState, useEffect, memo } from "react";
import type { Note } from "@types";
import { useDialogA11y } from "@hooks";

interface TrashViewProps {
  open: boolean;
  onClose: () => void;
  notes: Note[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onEmptyTrash: () => void;
}

function relDeleteTime(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d < 1) {
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    return `${h} 小时前`;
  }
  return `${d} 天前`;
}

function TrashView({ open, onClose, notes, onRestore, onPurge, onEmptyTrash }: TrashViewProps) {
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<string | null>(null);
  const { dialogRef, titleId } = useDialogA11y({ open: rendered, onClose });

  useEffect(() => {
    if (open) {
      setRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      setConfirmEmpty(false);
      setPurgeTarget(null);
    }
  }, [open]);

  const handleTransitionEnd = () => {
    if (!visible) setRendered(false);
  };

  if (!rendered) return null;

  return (
    <div
      className="fixed inset-0 z-[40000] flex items-center justify-center p-4"
      style={{
        background: visible ? "hsl(var(--foreground) / 0.32)" : "transparent",
        backdropFilter: visible ? "blur(4px)" : "none",
        transition: "background-color 0.2s ease, backdrop-filter 0.2s ease",
      }}
      onClick={onClose}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        onClick={e => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex flex-col w-full max-w-lg max-h-[80vh] rounded-2xl border border-border/60 bg-popover/95 shadow-[0_24px_64px_hsl(var(--foreground)/0.14)] overflow-hidden backdrop-blur-xl"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(8px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-gradient-to-b from-card/40 to-transparent">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.7}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                />
              </svg>
            </span>
            <div>
              <h2 id={titleId} className="text-sm font-semibold text-foreground">
                回收站
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {notes.length > 0 ? `${notes.length} 篇已删除笔记` : "空的"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            aria-label="关闭"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <svg
                className="w-10 h-10 text-muted-foreground/30 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                />
              </svg>
              <p className="text-sm text-muted-foreground/70">回收站是空的</p>
              <p className="text-xs text-muted-foreground/40 mt-1">删除的笔记会暂存在这里</p>
            </div>
          ) : (
            <ul className="p-2.5 space-y-1.5">
              {notes.map(note => (
                <li
                  key={note.id}
                  className="group flex items-center gap-3 rounded-xl border border-border/35 bg-card/35 px-3 py-3 hover:bg-muted/55 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {note.title || "Untitled"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        删除于 {note.deletedAt ? relDeleteTime(note.deletedAt) : "未知时间"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                      {(note.content || "").replace(/[#*`>-]/g, "").trim() || "空白笔记"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onRestore(note.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      title="恢复"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                        />
                      </svg>
                      恢复
                    </button>
                    <button
                      onClick={() => setPurgeTarget(note.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="永久删除"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {notes.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border/50 bg-muted/25">
            <span className="text-[10px] text-muted-foreground/70">恢复的笔记会回到原来的位置</span>
            {confirmEmpty ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-destructive font-medium">确认清空？不可恢复</span>
                <button
                  onClick={() => {
                    onEmptyTrash();
                    setConfirmEmpty(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                >
                  清空
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                清空回收站
              </button>
            )}
          </div>
        )}
      </div>

      {purgeTarget && (
        <div
          className="fixed inset-0 z-[40001] flex items-center justify-center p-4"
          style={{ background: "hsl(var(--foreground) / 0.4)" }}
          onClick={() => setPurgeTarget(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-2xl border border-border/60 bg-popover/95 p-5 max-w-xs shadow-[0_24px_64px_hsl(var(--foreground)/0.16)] backdrop-blur-xl"
          >
            <h3 className="text-sm font-semibold text-foreground mb-1.5">永久删除</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              这篇笔记将被彻底删除，无法恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPurgeTarget(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onPurge(purgeTarget);
                  setPurgeTarget(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
              >
                永久删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TrashView);
