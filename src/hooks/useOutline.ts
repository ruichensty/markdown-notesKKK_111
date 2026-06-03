export interface Heading {
  level: number;
  text: string;
  line: number;
}

export function useOutline(content: string): Heading[] {
  const headings: Heading[] = [];
  if (!content) return headings;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].replace(/[*_~`>#[\]()!]/g, "").trim(),
        line: i,
      });
    }
  }

  return headings;
}
