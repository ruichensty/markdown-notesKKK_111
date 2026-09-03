import { marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";
import type { Tokens, TokenizerAndRendererExtension } from "marked";
import type { Note } from "@types";
import { idbGetFile } from "./indexedDBStorage";

marked.use({ async: false });

const blockMathExtension: TokenizerAndRendererExtension = {
  name: "blockMath",
  level: "block",
  start(src: string) {
    return src.indexOf("$$");
  },
  tokenizer(src: string) {
    const match = /^\$\$([\s\S]+?)\$\$/.exec(src);
    if (match) {
      return { type: "blockMath", raw: match[0], expr: match[1] };
    }
    return undefined;
  },
  renderer(token: Tokens.Generic) {
    return `<div class="math-block">${katex.renderToString(String(token.expr ?? ""), {
      displayMode: true,
      throwOnError: false,
    })}</div>`;
  },
};

const inlineMathExtension: TokenizerAndRendererExtension = {
  name: "inlineMath",
  level: "inline",
  start(src: string) {
    return src.indexOf("$");
  },
  tokenizer(src: string) {
    const match = /^\$(?!\s)([^$\n]*[^\s$])\$(?!\d)/.exec(src);
    if (match) {
      return { type: "inlineMath", raw: match[0], expr: match[1] };
    }
    return undefined;
  },
  renderer(token: Tokens.Generic) {
    return katex.renderToString(String(token.expr ?? ""), {
      displayMode: false,
      throwOnError: false,
    });
  },
};

marked.use({ extensions: [blockMathExtension, inlineMathExtension] });

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFilename(name: string): string {
  return (
    (name || "untitled")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || "untitled"
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

const ATTACHMENT_PATTERN = /attachment:\/\/([\w-]+)/g;

async function inlineAttachments(content: string): Promise<string> {
  const ids = new Set<string>();
  for (const m of content.matchAll(ATTACHMENT_PATTERN)) {
    ids.add(m[1]);
  }
  if (ids.size === 0) return content;

  const urlMap = new Map<string, string>();
  await Promise.all(
    [...ids].map(async id => {
      try {
        const file = await idbGetFile(id);
        if (file) {
          const blob = new Blob([file.data], { type: file.fileType });
          urlMap.set(id, await blobToDataUrl(blob));
        }
      } catch {
        // missing attachment keeps original reference
      }
    })
  );

  return content.replace(ATTACHMENT_PATTERN, (full, id: string) => urlMap.get(id) ?? full);
}

export async function exportAsMarkdown(note: Note): Promise<void> {
  try {
    const filename = sanitizeFilename(note.title);
    const content = `# ${note.title}\n\n${await inlineAttachments(note.content)}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, `${filename}.md`);
  } catch (error) {
    console.error("Failed to export markdown:", error);
    throw new Error("Failed to export markdown file");
  }
}

const MERMAID_BLOCK_PATTERN = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;

export async function exportAsHTML(note: Note): Promise<void> {
  try {
    const filename = sanitizeFilename(note.title);
    const inlinedContent = await inlineAttachments(note.content);
    let htmlBody = String(marked.parse(inlinedContent));

    let hasMermaid = false;
    htmlBody = htmlBody.replace(MERMAID_BLOCK_PATTERN, (_, diagram: string) => {
      hasMermaid = true;
      return `<pre class="mermaid">${diagram}</pre>`;
    });

    const hasMath = htmlBody.includes("katex");

    htmlBody = DOMPurify.sanitize(htmlBody, {
      ADD_TAGS: ["annotation"],
      ADD_ATTR: ["encoding"],
    });

    const extraHead = [
      hasMath
        ? `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css">`
        : "",
      hasMath
        ? `  <style>.math-block { text-align: center; margin: 16px 0; overflow-x: auto; }</style>`
        : "",
      hasMermaid
        ? `  <style>.mermaid { display: flex; justify-content: center; margin: 16px 0; }</style>`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const mermaidScript = hasMermaid
      ? `\n<script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({ startOnLoad: true, securityLevel: "strict" });
  </script>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.title)}</title>
${extraHead}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin: 16px 0; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${escapeHtml(note.title)}</h1>
  <div>${htmlBody}</div>${mermaidScript}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `${filename}.html`);
  } catch (error) {
    console.error("Failed to export HTML:", error);
    throw new Error("Failed to export HTML file");
  }
}

export function exportAsText(note: Note): void {
  try {
    const filename = sanitizeFilename(note.title);
    const content = `${note.title}\n${"=".repeat(note.title.length)}\n\n${note.content}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${filename}.txt`);
  } catch (error) {
    console.error("Failed to export text:", error);
    throw new Error("Failed to export text file");
  }
}

export function exportAsPDF(): void {
  window.print();
}

export function sortNotes<T extends { order?: number | null; updatedAt?: number }>(
  notes: T[]
): T[] {
  const hasOrder = notes.some(n => n.order !== undefined && n.order !== null);
  if (hasOrder) {
    return [...notes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  if (seconds < 60) return `刚刚 ${timeStr}`;
  if (minutes < 60) return `${minutes}分钟前 ${timeStr}`;
  if (hours < 24 && isSameDay(date, now)) return `${hours}小时前 ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return `昨天 ${timeStr}`;

  const dateTimeStr = `${dateStr} ${timeStr}`;
  if (days < 7) return `${days}天前 ${dateTimeStr}`;

  return dateTimeStr;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
