import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface SearchReplaceProps {
  content: string;
  onContentChange: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  showReplace?: boolean;
}

function findMatches(content: string, query: string, caseSensitive: boolean): number[] {
  if (!query) return [];
  const flags = caseSensitive ? "g" : "gi";
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedQuery, flags);
  const positions: number[] = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    positions.push(m.index);
    if (m[0].length === 0) regex.lastIndex++;
  }
  return positions;
}

export function SearchReplace({
  content,
  onContentChange,
  textareaRef,
  onClose,
  showReplace: initialReplace = false,
}: SearchReplaceProps) {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showReplace, setShowReplace] = useState(initialReplace);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(
    () => findMatches(content, query, caseSensitive),
    [content, query, caseSensitive]
  );
  const matchCount = matches.length;
  const activeIndex = matchCount > 0 ? Math.min(Math.max(currentIndex, 0), matchCount - 1) : -1;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const jumpTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= matches.length) return;
      setCurrentIndex(idx);
      const pos = matches[idx];
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(pos, pos + query.length);
      const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      const linesBefore = content.substring(0, pos).split("\n").length - 1;
      ta.scrollTop = linesBefore * lineH - ta.clientHeight / 2;
    },
    [matches, textareaRef, query.length, content]
  );

  const handleNext = useCallback(() => {
    if (matchCount === 0) return;
    jumpTo((activeIndex + 1) % matchCount);
  }, [activeIndex, matchCount, jumpTo]);

  const handlePrev = useCallback(() => {
    if (matchCount === 0) return;
    jumpTo(activeIndex <= 0 ? matchCount - 1 : activeIndex - 1);
  }, [activeIndex, matchCount, jumpTo]);

  const handleReplace = useCallback(() => {
    if (activeIndex < 0 || !query) return;
    const pos = matches[activeIndex];
    const newContent =
      content.substring(0, pos) + replaceText + content.substring(pos + query.length);
    onContentChange(newContent);
  }, [activeIndex, query, content, replaceText, matches, onContentChange]);

  const handleReplaceAll = useCallback(() => {
    if (!query || matchCount === 0) return;
    const flags = caseSensitive ? "g" : "gi";
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, flags);
    const newContent = content.replace(regex, replaceText);
    onContentChange(newContent);
  }, [query, content, replaceText, caseSensitive, matchCount, onContentChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          handleReplace();
        } else {
          handleNext();
        }
      }
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, handleNext, handlePrev, handleReplace]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50 bg-muted/20 text-[11px]">
      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setCurrentIndex(0);
          }}
          placeholder="搜索..."
          className="w-full px-2 py-1 text-[11px] bg-background border border-border/50 rounded focus:outline-none focus:border-primary/50"
        />
      </div>

      <span className="text-muted-foreground/60 whitespace-nowrap min-w-[40px] text-center">
        {query ? `${activeIndex + 1}/${matchCount}` : ""}
      </span>

      <button
        onClick={() => {
          setCaseSensitive(!caseSensitive);
          setCurrentIndex(0);
        }}
        className={`p-1 rounded text-[10px] font-bold transition-colors ${caseSensitive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
        title="大小写敏感"
      >
        Aa
      </button>

      <button
        onClick={handlePrev}
        className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground"
        title="上一个"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      <button
        onClick={handleNext}
        className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground"
        title="下一个"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <button
        onClick={() => setShowReplace(!showReplace)}
        className={`p-0.5 rounded transition-colors ${showReplace ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
        title="替换"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h12m-12 6h12m-12 6h12M4 7h.01M4 13h.01M4 19h.01"
          />
        </svg>
      </button>

      {showReplace && (
        <>
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              placeholder="替换为..."
              className="w-full px-2 py-1 text-[11px] bg-background border border-border/50 rounded focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={handleReplace}
            className="px-1.5 py-0.5 rounded text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="替换"
          >
            替换
          </button>
          <button
            onClick={handleReplaceAll}
            className="px-1.5 py-0.5 rounded text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="全部替换"
          >
            全部
          </button>
        </>
      )}
    </div>
  );
}
