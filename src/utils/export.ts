import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Note } from "@types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export function exportAsMarkdown(note: Note): void {
  try {
    const content = `# ${note.title}\n\n${note.content}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, `${note.title || "untitled"}.md`);
  } catch (error) {
    console.error("Failed to export markdown:", error);
    throw new Error("Failed to export markdown file");
  }
}

export function exportAsHTML(note: Note): void {
  try {
    const htmlBody = DOMPurify.sanitize(marked.parse(note.content) as string);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.title)}</title>
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
  <div>${htmlBody}</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `${note.title || "untitled"}.html`);
  } catch (error) {
    console.error("Failed to export HTML:", error);
    throw new Error("Failed to export HTML file");
  }
}

export function exportAsText(note: Note): void {
  try {
    const content = `${note.title}\n${"=".repeat(note.title.length)}\n\n${note.content}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${note.title || "untitled"}.txt`);
  } catch (error) {
    console.error("Failed to export text:", error);
    throw new Error("Failed to export text file");
  }
}

export function exportAsPDF(): void {
  window.print();
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
