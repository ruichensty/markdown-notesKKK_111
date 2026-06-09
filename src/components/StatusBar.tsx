import { useMemo } from "react";
import type { Note, SaveStatus } from "@types";
import { useStorageEstimate } from "@hooks";

function countWords(text: string): number {
  if (!text) return 0;
  const cjk = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjk ? cjk.length : 0;
  const withoutCjk = text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ");
  const enWords = withoutCjk.match(/\b[a-zA-Z]+\b/g);
  const enCount = enWords ? enWords.length : 0;
  return cjkCount + enCount;
}

function countParagraphs(text: string): number {
  if (!text) return 0;
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || 1;
}

function readingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.ceil(wordCount / 300));
  return `${minutes} 分钟`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}

interface StatusBarProps {
  allNotes: Note[];
  currentNote?: Note | null;
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;
}

const saveStatusLabel: Record<SaveStatus, string> = {
  saved: "已保存",
  saving: "保存中...",
  retrying: "重试保存...",
  error: "保存失败",
};

export function StatusBar({
  allNotes,
  currentNote,
  saveStatus = "saved",
  onRetrySave,
}: StatusBarProps) {
  const totalCount = allNotes.length;
  const storage = useStorageEstimate(currentNote?.updatedAt ?? totalCount);

  const stats = useMemo(() => {
    if (!currentNote) return null;
    const content = currentNote.content || "";
    const words = countWords(content);
    const chars = content.length;
    const paragraphs = countParagraphs(content);
    return { words, chars, paragraphs, readTime: readingTime(words) };
  }, [currentNote]);

  const storageLabel = useMemo(() => {
    if (!storage.supported || storage.usage === null || storage.quota === null)
      return "存储容量不可用";
    const percentage = storage.quota > 0 ? (storage.usage / storage.quota) * 100 : 0;
    return `存储 ${formatBytes(storage.usage)} / ${formatBytes(storage.quota)} (${percentage.toFixed(1)}%)`;
  }, [storage.quota, storage.supported, storage.usage]);

  return (
    <div className="status-bar flex items-center justify-between text-[10px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="font-medium">
          {totalCount} note{totalCount !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground/50 status-bar-hide-mobile">•</span>
        {saveStatus === "error" && onRetrySave ? (
          <button
            type="button"
            className="text-destructive hover:underline"
            onClick={onRetrySave}
            title="点击重试保存"
          >
            {saveStatusLabel[saveStatus]}
          </button>
        ) : (
          <span
            className={saveStatus === "error" ? "text-destructive" : "text-muted-foreground/70"}
            title="自动保存状态"
          >
            {saveStatusLabel[saveStatus]}
          </span>
        )}
        {stats && (
          <>
            <span className="text-muted-foreground/50 status-bar-hide-mobile">•</span>
            <span className="status-bar-hide-mobile">{stats.words.toLocaleString()} 字</span>
            <span className="text-muted-foreground/50 status-bar-hide-mobile">•</span>
            <span className="status-bar-hide-mobile">{stats.paragraphs} 段落</span>
            <span className="text-muted-foreground/50 status-bar-hide-mobile">•</span>
            <span className="status-bar-hide-mobile">约 {stats.readTime}阅读</span>
          </>
        )}
        {stats && <span className="md:hidden">{stats.words.toLocaleString()} 字</span>}
      </div>
      <div className="flex items-center gap-2 status-bar-hide-mobile">
        <span title={storageLabel}>{storageLabel}</span>
        <span className="text-muted-foreground/50">•</span>
        <span className="text-muted-foreground/50">v1.0.0</span>
      </div>
    </div>
  );
}
