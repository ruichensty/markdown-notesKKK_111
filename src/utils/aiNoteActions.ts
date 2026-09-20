import type {
  AiEditorSnapshot,
  AiNoteApplyMode,
  AiNoteApplyPreview,
  AiNoteContext,
  AiNoteContextMode,
} from "@types";

export const AI_NOTE_CONTEXT_MAX_CHARS = 8000;

interface MarkdownHeading {
  index: number;
  level: number;
  text: string;
}

function collectHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const pattern = /^(#{1,6})[ \t]+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    headings.push({ index: match.index, level: match[1].length, text: match[2].trim() });
  }
  return headings;
}

export function getMarkdownSectionRange(
  content: string,
  cursor: number
): { start: number; end: number; label: string } {
  const position = Math.min(Math.max(0, cursor), content.length);
  const headings = collectHeadings(content);
  let activeIndex = -1;

  for (let index = 0; index < headings.length; index++) {
    if (headings[index].index > position) break;
    activeIndex = index;
  }

  if (activeIndex === -1) {
    return {
      start: 0,
      end: headings[0]?.index ?? content.length,
      label: headings.length > 0 ? "文档开头" : "全文",
    };
  }

  const active = headings[activeIndex];
  let end = content.length;
  for (let index = activeIndex + 1; index < headings.length; index++) {
    if (headings[index].level <= active.level) {
      end = headings[index].index;
      break;
    }
  }

  return { start: active.index, end, label: `章节「${active.text || "未命名"}」` };
}

export function buildAiNoteContext(
  snapshot: AiEditorSnapshot,
  mode: AiNoteContextMode,
  maxChars = AI_NOTE_CONTEXT_MAX_CHARS
): AiNoteContext | null {
  let start = 0;
  let end = snapshot.content.length;
  let label = "全文";

  if (mode === "selection") {
    start = Math.min(snapshot.selectionStart, snapshot.selectionEnd);
    end = Math.max(snapshot.selectionStart, snapshot.selectionEnd);
    if (start === end) return null;
    label = "当前选区";
  } else if (mode === "section") {
    const section = getMarkdownSectionRange(snapshot.content, snapshot.selectionStart);
    start = section.start;
    end = section.end;
    label = section.label;
  }

  const source = snapshot.content.slice(start, end);
  const truncated = source.length > maxChars;
  const content = truncated ? `${source.slice(0, maxChars)}\n…（内容过长已截断）` : source;

  return {
    mode,
    title: snapshot.title,
    content,
    label,
    sourceStart: start,
    sourceEnd: end,
    totalChars: source.length,
    sentChars: Math.min(source.length, maxChars),
    truncated,
  };
}

export function buildAiNoteApplyPreview(
  snapshot: AiEditorSnapshot | null,
  mode: AiNoteApplyMode,
  assistantContent: string
): AiNoteApplyPreview | null {
  const generated = assistantContent.trim();
  if (!generated) return null;

  if (mode === "new-note") {
    return {
      mode,
      noteId: null,
      noteTitle: "AI 生成内容",
      label: "创建新笔记",
      beforeContent: "",
      afterContent: generated,
      caretStart: generated.length,
      caretEnd: generated.length,
    };
  }

  if (!snapshot) return null;

  if (mode === "replace-selection") {
    const start = Math.min(snapshot.selectionStart, snapshot.selectionEnd);
    const end = Math.max(snapshot.selectionStart, snapshot.selectionEnd);
    if (start === end) return null;
    return {
      mode,
      noteId: snapshot.noteId,
      noteTitle: snapshot.title,
      label: `替换选区（${end - start} 字）`,
      beforeContent: snapshot.content,
      afterContent: snapshot.content.slice(0, start) + generated + snapshot.content.slice(end),
      caretStart: start,
      caretEnd: start + generated.length,
    };
  }

  const separator =
    snapshot.content.length === 0
      ? ""
      : snapshot.content.endsWith("\n\n")
        ? ""
        : snapshot.content.endsWith("\n")
          ? "\n"
          : "\n\n";
  const start = snapshot.content.length + separator.length;
  return {
    mode,
    noteId: snapshot.noteId,
    noteTitle: snapshot.title,
    label: "追加到笔记末尾",
    beforeContent: snapshot.content,
    afterContent: snapshot.content + separator + generated,
    caretStart: start,
    caretEnd: start + generated.length,
  };
}

export function deriveAiNoteTitle(content: string): string {
  const heading = content.match(/^#{1,6}[ \t]+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 60);
  const firstLine = content
    .split("\n")
    .map(line => line.trim())
    .find(Boolean);
  return (firstLine || "AI 生成内容").replace(/^[-*>`#\s]+/, "").slice(0, 60) || "AI 生成内容";
}
