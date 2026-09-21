import type { Note } from "@types";

export type NoteSearchScope = "all" | "title" | "content" | "tags";
export type NoteSearchDateRange = "all" | "7d" | "30d";
export type NoteSearchField = "title" | "content" | "tags";

export interface NoteMetadata {
  tags: string[];
  wikiLinks: string[];
}

export interface NoteSearchResult {
  note: Note;
  score: number;
  matchedFields: NoteSearchField[];
  snippet: string;
  metadata: NoteMetadata;
}

export interface NoteSearchOptions {
  scope: NoteSearchScope;
  dateRange: NoteSearchDateRange;
  now?: number;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function extractNoteMetadata(content: string): NoteMetadata {
  const tags: string[] = [];
  const tagPattern = /(^|\s)#([\p{L}\p{N}_-]{1,40})/gu;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagPattern.exec(content)) !== null) tags.push(tagMatch[2]);

  const wikiLinks: string[] = [];
  const linkPattern = /\[\[([^\]\n]{1,80})\]\]/g;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkPattern.exec(content)) !== null) wikiLinks.push(linkMatch[1].trim());

  return { tags: unique(tags), wikiLinks: unique(wikiLinks.filter(Boolean)) };
}

function createSnippet(content: string, terms: string[]): string {
  const normalized = content.toLocaleLowerCase();
  const matchIndex = terms.reduce((best, term) => {
    const index = normalized.indexOf(term);
    if (index === -1) return best;
    return best === -1 ? index : Math.min(best, index);
  }, -1);
  const center = matchIndex === -1 ? 0 : matchIndex;
  const start = Math.max(0, center - 55);
  const end = Math.min(content.length, center + 125);
  return `${start > 0 ? "…" : ""}${content.slice(start, end).replace(/\s+/g, " ").trim()}${end < content.length ? "…" : ""}`;
}

export function searchNotes(
  notes: Note[],
  query: string,
  options: NoteSearchOptions
): NoteSearchResult[] {
  const terms = unique(
    query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .map(term => (term.startsWith("#") ? term.slice(1) : term))
      .filter(Boolean)
  );
  if (terms.length === 0) return [];

  const now = options.now ?? Date.now();
  const cutoff =
    options.dateRange === "7d"
      ? now - 7 * 24 * 60 * 60 * 1000
      : options.dateRange === "30d"
        ? now - 30 * 24 * 60 * 60 * 1000
        : null;

  const results: NoteSearchResult[] = [];
  for (const note of notes) {
    if (cutoff !== null && note.updatedAt < cutoff) continue;
    const metadata = extractNoteMetadata(note.content);
    const fields = {
      title: note.title.toLocaleLowerCase(),
      content: note.content.toLocaleLowerCase(),
      tags: metadata.tags.join(" ").toLocaleLowerCase(),
    };
    const searchable =
      options.scope === "all"
        ? `${fields.title}\n${fields.tags}\n${fields.content}`
        : fields[options.scope];
    if (!terms.every(term => searchable.includes(term))) continue;

    const matchedFields: NoteSearchField[] = [];
    let score = 0;
    for (const term of terms) {
      if (fields.title.includes(term)) {
        score += 8;
        if (!matchedFields.includes("title")) matchedFields.push("title");
      }
      if (fields.tags.includes(term)) {
        score += 5;
        if (!matchedFields.includes("tags")) matchedFields.push("tags");
      }
      if (fields.content.includes(term)) {
        score += 2;
        if (!matchedFields.includes("content")) matchedFields.push("content");
      }
    }

    results.push({
      note,
      score,
      matchedFields,
      snippet: createSnippet(note.content, terms),
      metadata,
    });
  }

  return results.sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt);
}
