import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Note } from "@types";
import { useDebounce } from "@hooks";
import { SearchReplace } from "./SearchReplace";
import { EditorToolbar } from "./EditorToolbar";

interface EditorProps {
  note: Note;
  onUpdate: (id: string, data: { title?: string; content?: string }) => void;
  fontSize?: "sm" | "md" | "lg" | number;
  lineHeight?: number;
  focusMode?: boolean;
  typewriterMode?: boolean;
  autoPair?: boolean;
}

export interface EditorHandle {
  scrollToLine: (line: number) => void;
}

const FONT_SIZE_MAP: Record<string, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  "`": "`",
  '"': '"',
  "'": "'",
};

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  content: string,
  setContent: (v: string) => void,
  before: string,
  after: string,
  placeholder: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = content.substring(start, end) || placeholder;
  const newText = content.substring(0, start) + before + selected + after + content.substring(end);
  setContent(newText);
  const newCursorPos = start + before.length;
  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = newCursorPos;
    textarea.selectionEnd = newCursorPos + selected.length;
  }, 0);
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    note,
    onUpdate,
    fontSize = "md",
    lineHeight = 1.7,
    focusMode = false,
    typewriterMode = false,
    autoPair = true,
  },
  ref
) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [textColor, setTextColor] = useState("#000000");
  const [showSearch, setShowSearch] = useState(false);
  const [searchReplaceMode, setSearchReplaceMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteIdRef = useRef(note.id);

  useEffect(() => {
    if (noteIdRef.current !== note.id) {
      noteIdRef.current = note.id;
      /* eslint-disable react-hooks/set-state-in-effect -- sync local editor draft when switching notes */
      setTitle(note.title);
      setContent(note.content);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [note.id, note.title, note.content]);

  const debouncedTitle = useDebounce(title, 500);
  const debouncedContent = useDebounce(content, 500);

  useImperativeHandle(ref, () => ({
    scrollToLine: (line: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = line * lineH - ta.clientHeight / 3;
    },
  }));

  useEffect(() => {
    if (debouncedTitle !== note.title || debouncedContent !== note.content) {
      onUpdate(note.id, {
        title: debouncedTitle,
        content: debouncedContent,
      });
    }
  }, [debouncedTitle, debouncedContent, note.id, note.title, note.content, onUpdate]);

  const scrollToCursorCenter = useCallback(() => {
    if (!typewriterMode) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    const linesBefore = ta.value.substring(0, ta.selectionStart).split("\n").length - 1;
    ta.scrollTop = linesBefore * lineH - ta.clientHeight / 2;
  }, [typewriterMode]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const wrapSelection = useCallback(
    (before: string, after: string, placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      insertAtCursor(textarea, content, setContent, before, after, placeholder);
    },
    [content]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = content.substring(0, start) + "  " + content.substring(end);
        setContent(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        e.stopPropagation();
        setShowSearch(true);
        setSearchReplaceMode(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        e.stopPropagation();
        setShowSearch(true);
        setSearchReplaceMode(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        wrapSelection("**", "**", "粗体文字");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        wrapSelection("*", "*", "斜体文字");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        wrapSelection("`", "`", "代码");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        wrapSelection("\n```\n", "\n```\n", "代码块");
        return;
      }

      if (autoPair && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const pair = PAIRS[e.key];
        if (pair) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const hasSelection = start !== end;
          if (hasSelection) {
            e.preventDefault();
            const selected = content.substring(start, end);
            const newText =
              content.substring(0, start) + e.key + selected + pair + content.substring(end);
            setContent(newText);
            setTimeout(() => {
              textarea.selectionStart = start + 1;
              textarea.selectionEnd = start + 1 + selected.length;
            }, 0);
          } else {
            e.preventDefault();
            const newText = content.substring(0, start) + e.key + pair + content.substring(end);
            setContent(newText);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 1;
            }, 0);
          }
          return;
        }
      }
    },
    [content, autoPair, wrapSelection]
  );

  const handleBold = useCallback(() => wrapSelection("**", "**", "粗体文字"), [wrapSelection]);
  const handleItalic = useCallback(() => wrapSelection("*", "*", "斜体文字"), [wrapSelection]);
  const handleStrike = useCallback(() => wrapSelection("~~", "~~", "删除线文字"), [wrapSelection]);
  const handleCode = useCallback(() => wrapSelection("`", "`", "代码"), [wrapSelection]);
  const handleCodeBlock = useCallback(
    () => wrapSelection("\n```\n", "\n```\n", "代码块"),
    [wrapSelection]
  );
  const handleHeading = useCallback(
    (level: number) => {
      const prefix = "#".repeat(level) + " ";
      wrapSelection("\n" + prefix, "", "标题");
    },
    [wrapSelection]
  );
  const handleUnorderedList = useCallback(
    () => wrapSelection("\n- ", "\n", "列表项"),
    [wrapSelection]
  );
  const handleOrderedList = useCallback(
    () => wrapSelection("\n1. ", "\n", "列表项"),
    [wrapSelection]
  );
  const handleQuote = useCallback(() => wrapSelection("\n> ", "\n", "引用文字"), [wrapSelection]);
  const handleLink = useCallback(
    () => wrapSelection("[", "](https://)", "链接文字"),
    [wrapSelection]
  );
  const handleLineBreak = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newText = content.substring(0, start) + "  \n" + content.substring(start);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + 3;
    }, 0);
  }, [content]);

  const handleFontSize = useCallback(
    (size: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      const tag = `<span style="font-size:${size}px">`;
      const closeTag = "</span>";
      if (selected) {
        const newText =
          content.substring(0, start) + tag + selected + closeTag + content.substring(end);
        setContent(newText);
      } else {
        const newText = content.substring(0, start) + tag + closeTag + content.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + tag.length;
        }, 0);
      }
    },
    [content]
  );

  const handleColor = useCallback(
    (color: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      setTextColor(color);
      const tag = `<span style="color:${color}">`;
      const closeTag = "</span>";
      if (selected) {
        const newText =
          content.substring(0, start) + tag + selected + closeTag + content.substring(end);
        setContent(newText);
      } else {
        const newText = content.substring(0, start) + tag + closeTag + content.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + tag.length;
        }, 0);
      }
    },
    [content]
  );

  const resolvedFontSize =
    typeof fontSize === "number" ? fontSize : (FONT_SIZE_MAP[fontSize] ?? 14);

  if (!note) {
    return null;
  }

  const focusOverlayStyle = focusMode
    ? {
        position: "absolute" as const,
        inset: 0,
        pointerEvents: "none" as const,
        background: `linear-gradient(to bottom, hsl(var(--foreground) / 0.06) 0%, transparent 30%, transparent 70%, hsl(var(--foreground) / 0.06) 100%)`,
        zIndex: 1,
      }
    : undefined;

  return (
    <div className="editor-pane flex-1 flex flex-col overflow-hidden">
      <div className="editor-titlebar">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="editor-title-input w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/40 text-foreground"
        />
      </div>

      <EditorToolbar
        onHeading={handleHeading}
        onBold={handleBold}
        onItalic={handleItalic}
        onStrike={handleStrike}
        onUnorderedList={handleUnorderedList}
        onOrderedList={handleOrderedList}
        onQuote={handleQuote}
        onCode={handleCode}
        onCodeBlock={handleCodeBlock}
        onLink={handleLink}
        onSearch={() => {
          setShowSearch(true);
          setSearchReplaceMode(false);
        }}
        onFontSize={handleFontSize}
        onColor={handleColor}
        onLineBreak={handleLineBreak}
        textColor={textColor}
      />

      {showSearch && (
        <SearchReplace
          content={content}
          onContentChange={setContent}
          textareaRef={textareaRef}
          onClose={() => setShowSearch(false)}
          showReplace={searchReplaceMode}
        />
      )}

      <div className="flex-1 overflow-hidden relative">
        {focusOverlayStyle && <div style={focusOverlayStyle} />}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          onKeyUp={scrollToCursorCenter}
          onClick={scrollToCursorCenter}
          placeholder="Start writing with Markdown..."
          className="editor-textarea w-full h-full bg-transparent border-none outline-none resize-none focus:ring-0 font-mono text-sm leading-relaxed scrollbar-thin"
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: `${resolvedFontSize}px`,
            lineHeight: lineHeight,
            position: "relative",
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
});

export default React.memo(Editor);
