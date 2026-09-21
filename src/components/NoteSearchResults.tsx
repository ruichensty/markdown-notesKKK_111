import type { NoteSearchResult } from "@utils/noteSearch";
import { useContextMenu, type ContextMenuItem } from "@context/ContextMenuContext";
import type { Note } from "@types";

interface NoteSearchResultsProps {
  results: NoteSearchResult[];
  query: string;
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNoteDelete: (id: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onContextMenu?: (note: Note) => ContextMenuItem[];
}

const FIELD_LABEL = {
  title: "标题",
  content: "正文",
  tags: "标签",
} as const;

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query
    .trim()
    .split(/\s+/)
    .map(term => (term.startsWith("#") ? term.slice(1) : term))
    .filter(Boolean)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.join("|")})`, "giu");
  return text
    .split(pattern)
    .map((part, index) => (index % 2 === 1 ? <mark key={`${part}-${index}`}>{part}</mark> : part));
}

export function NoteSearchResults({
  results,
  query,
  activeNoteId,
  onNoteSelect,
  onNoteDelete,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onContextMenu,
}: NoteSearchResultsProps) {
  const { show } = useContextMenu();

  if (results.length === 0) {
    return (
      <div className="sidebar-empty">
        <p className="text-[10px] text-muted-foreground/60">未找到匹配的笔记</p>
      </div>
    );
  }

  return (
    <div className="note-search-results">
      {results.map(result => {
        const note = result.note;
        const selected = selectedIds?.has(note.id) ?? false;
        return (
          <article
            key={note.id}
            className={`note-search-result ${note.id === activeNoteId ? "note-search-result--active" : ""}`}
            onContextMenu={event => {
              if (!onContextMenu) return;
              event.preventDefault();
              show(event.clientX, event.clientY, onContextMenu(note));
            }}
          >
            <button
              type="button"
              className="note-search-result-main"
              onClick={() => (selectionMode ? onToggleSelect?.(note.id) : onNoteSelect(note.id))}
            >
              <span className="note-search-result-title">
                {selectionMode && (
                  <span
                    className={`note-search-checkbox ${selected ? "note-search-checkbox--checked" : ""}`}
                  />
                )}
                <strong>
                  <Highlight text={note.title || "Untitled"} query={query} />
                </strong>
              </span>
              <span className="note-search-result-fields">
                {result.matchedFields.map(field => (
                  <small key={field}>{FIELD_LABEL[field]}</small>
                ))}
              </span>
              <span className="note-search-result-snippet">
                <Highlight text={result.snippet} query={query} />
              </span>
              {result.metadata.tags.length > 0 && (
                <span className="note-search-result-tags">
                  {result.metadata.tags.slice(0, 4).map(tag => (
                    <small key={tag}>#{tag}</small>
                  ))}
                </span>
              )}
            </button>
            <button
              type="button"
              className="note-search-result-delete"
              onClick={() => onNoteDelete(note.id)}
              aria-label={`删除 ${note.title || "Untitled"}`}
            >
              ×
            </button>
          </article>
        );
      })}
    </div>
  );
}
