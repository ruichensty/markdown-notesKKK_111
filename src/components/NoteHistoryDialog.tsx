import { useEffect, useMemo, useState } from "react";
import type { Note, NoteVersion } from "@types";
import { idbGetNoteVersions } from "@utils/indexedDBStorage";
import { subscribeCrossTabChange } from "@utils/crossTabSync";
import { useDialogA11y } from "@hooks";
import { ConfirmDialog } from "./ConfirmDialog";

interface NoteHistoryDialogProps {
  open: boolean;
  note: Note | null;
  onClose: () => void;
  onRestore: (version: NoteVersion) => Promise<void>;
  onDeleteVersion: (noteId: string, versionId: string) => Promise<void>;
}

const SOURCE_LABEL: Record<NoteVersion["source"], string> = {
  auto: "自动快照",
  manual: "手动快照",
  restore: "恢复前快照",
};

function excerpt(content: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 160)}…` : compact || "空内容";
}

export function NoteHistoryDialog({
  open,
  note,
  onClose,
  onRestore,
  onDeleteVersion,
}: NoteHistoryDialogProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { dialogRef, titleId } = useDialogA11y({ open, onClose });

  useEffect(() => {
    if (!open || !note) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      idbGetNoteVersions(note.id)
        .then(list => {
          if (!active) return;
          setVersions(list);
          setSelectedId(list[0]?.id ?? null);
        })
        .catch(reason => {
          if (active) setError(reason instanceof Error ? reason.message : String(reason));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [note, open]);

  useEffect(() => {
    if (!open || !note) return;
    return subscribeCrossTabChange("note-versions", () => {
      void idbGetNoteVersions(note.id).then(list => {
        setVersions(list);
        setConfirmDelete(false);
        setSelectedId(current =>
          current && list.some(version => version.id === current) ? current : (list[0]?.id ?? null)
        );
      });
    });
  }, [note, open]);

  const selected = useMemo(
    () => versions.find(version => version.id === selectedId) ?? null,
    [selectedId, versions]
  );

  if (!open || !note) return null;

  const deleteVersion = async (id: string) => {
    setError(null);
    try {
      await onDeleteVersion(note.id, id);
      const next = versions.filter(version => version.id !== id);
      setVersions(next);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      setConfirmDelete(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const restoreSelected = async () => {
    if (!selected || restoring) return;
    setRestoring(true);
    setError(null);
    try {
      await onRestore(selected);
      setConfirmRestore(false);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setConfirmRestore(false);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="note-history-overlay">
      <button
        type="button"
        className="note-history-backdrop"
        onClick={onClose}
        aria-label="关闭版本历史"
      />
      <section
        ref={dialogRef}
        className="note-history-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="note-history-header">
          <div>
            <span className="note-history-kicker">Version history</span>
            <h2 id={titleId}>版本历史 · {note.title || "Untitled"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭版本历史">
            ×
          </button>
        </header>

        <div className="note-history-body">
          <aside className="note-history-list">
            {loading && <p className="note-history-empty">正在加载历史版本…</p>}
            {!loading && versions.length === 0 && (
              <p className="note-history-empty">继续编辑后，应用会每隔一段时间自动保存版本。</p>
            )}
            {versions.map(version => (
              <button
                key={version.id}
                type="button"
                className={`note-history-item ${selectedId === version.id ? "note-history-item--active" : ""}`}
                onClick={() => setSelectedId(version.id)}
              >
                <strong>{new Date(version.createdAt).toLocaleString("zh-CN")}</strong>
                <span>{SOURCE_LABEL[version.source]}</span>
                <small>{version.content.length.toLocaleString()} 字符</small>
              </button>
            ))}
          </aside>

          <main className="note-history-preview">
            {selected ? (
              <>
                <div className="note-history-preview-meta">
                  <div>
                    <span>历史标题</span>
                    <strong>{selected.title || "Untitled"}</strong>
                  </div>
                  <div>
                    <span>与当前版本</span>
                    <strong>
                      {selected.content === note.content && selected.title === note.title
                        ? "内容一致"
                        : `${selected.content.length - note.content.length >= 0 ? "+" : ""}${selected.content.length - note.content.length} 字符`}
                    </strong>
                  </div>
                </div>
                <p className="note-history-excerpt">{excerpt(selected.content)}</p>
                <pre>{selected.content || "（空内容）"}</pre>
                <div className="note-history-actions">
                  <button
                    type="button"
                    className="note-history-delete"
                    onClick={() => setConfirmDelete(true)}
                  >
                    删除此版本
                  </button>
                  <button
                    type="button"
                    className="note-history-restore"
                    onClick={() => setConfirmRestore(true)}
                    disabled={restoring}
                  >
                    恢复此版本
                  </button>
                </div>
              </>
            ) : (
              <p className="note-history-empty">选择一个历史版本查看内容</p>
            )}
            {error && <p className="note-history-error">{error}</p>}
          </main>
        </div>
      </section>

      {confirmRestore && selected && (
        <ConfirmDialog
          message="恢复前会先保存当前内容为一个历史版本，然后用所选版本替换当前笔记。确定继续吗？"
          confirmLabel={restoring ? "恢复中…" : "确认恢复"}
          cancelLabel="取消"
          onConfirm={() => void restoreSelected()}
          onCancel={() => setConfirmRestore(false)}
        />
      )}
      {confirmDelete && selected && (
        <ConfirmDialog
          message="这个历史版本将被永久删除，且无法撤销。确定继续吗？"
          confirmLabel="永久删除"
          cancelLabel="取消"
          onConfirm={() => void deleteVersion(selected.id)}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
