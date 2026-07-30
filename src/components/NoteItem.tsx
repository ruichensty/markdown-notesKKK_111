import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import type { Note } from "@types";
import { useContextMenu } from "./ContextMenu";
import type { ContextMenuItem } from "./ContextMenu";

const RECENCY_NOW = Date.now();

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onContextMenu?: (note: Note, e: React.MouseEvent) => ContextMenuItem[];
}

function NoteItem({
  note,
  isActive,
  onClick,
  onDelete,
  selectionMode,
  selected,
  onToggleSelect,
  onContextMenu,
}: NoteItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const { show } = useContextMenu();

  function recencyClass(timestamp?: number): string {
    if (!timestamp) return "sidebar-note--old";
    const days = (RECENCY_NOW - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 1) return "sidebar-note--today";
    if (days <= 7) return "sidebar-note--week";
    if (days <= 30) return "sidebar-note--month";
    return "sidebar-note--old";
  }

  useEffect(() => {
    if (!showConfirm) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setShowConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConfirm]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  }, []);

  const handleConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete();
      setShowConfirm(false);
    },
    [onDelete]
  );

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (onContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        const items = onContextMenu(note, e);
        show(e.clientX, e.clientY, items);
      }
    },
    [note, onContextMenu, show]
  );

  const title = note.title || "Untitled";
  const time = note.createdAt ? formatTime(note.createdAt) : "";
  const recency = recencyClass(note.updatedAt);
  const preview = (note.content || "")
    .replace(/[#*`>\-[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <div
      className={`sidebar-item group relative ${isActive ? "sidebar-item--active" : ""} ${recency}`}
      onContextMenu={handleContextMenu}
    >
      {selectionMode && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className={`sidebar-item-checkbox ${selected ? "sidebar-item-checkbox--checked" : ""}`}
          aria-label={`${selected ? "取消选择" : "选择"}「${title}」`}
          aria-pressed={selected}
        >
          {selected && (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3.5 8.5l3 3 6-6" />
            </svg>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={selectionMode && onToggleSelect ? onToggleSelect : onClick}
        className="sidebar-item-main"
        aria-current={isActive ? "page" : undefined}
        aria-label={
          selectionMode ? `${selected ? "取消选择" : "选择"}「${title}」` : `打开笔记「${title}」`
        }
        aria-pressed={selectionMode ? selected : undefined}
      >
        <span className="sidebar-item-indicator" />
        <svg
          className={`sidebar-item-icon ${isActive ? "text-primary" : "text-muted-foreground/60"}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.5 1.5h4.672a1 1 0 01.707.293l3.328 3.328a1 1 0 01.293.707V13a1.5 1.5 0 01-1.5 1.5h-7.5A1.5 1.5 0 013 13V3a1.5 1.5 0 011.5-1.5z" />
          <polyline points="9,1.5 9,6 13.5,6" />
          <line x1="6" y1="9" x2="10" y2="9" />
          <line x1="6" y1="11" x2="9" y2="11" />
        </svg>
        <span className="sidebar-item-copy">
          <span className={`sidebar-item-text ${isActive ? "text-primary" : "text-foreground/85"}`}>
            {title}
          </span>
          <span className="sidebar-item-preview">{preview || "Blank note"}</span>
        </span>
        {time && <span className="sidebar-item-time">{time}</span>}
      </button>

      <button
        type="button"
        onClick={handleDeleteClick}
        className="sidebar-item-action opacity-0 group-hover:opacity-100"
        title="Delete Note"
        aria-label={`删除笔记「${title}」`}
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>

      {showConfirm && (
        <div
          ref={confirmRef}
          className="absolute left-1 top-full z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[140px] animate-scale-in"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] text-muted-foreground mb-1.5 px-0.5">删除这条笔记？</p>
          <div className="flex gap-1">
            <button
              onClick={handleCancel}
              className="flex-1 px-2 py-1 text-[10px] rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-2 py-1 text-[10px] rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors font-medium"
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(NoteItem, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.selected === nextProps.selected
  );
});

export { NoteItem };

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return hm;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hm}`;

  return `${d.getMonth() + 1}/${d.getDate()}`;
}
