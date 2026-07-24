export type EditorFontFamily = "sans" | "serif" | "mono";

export interface FontFamilyPreset {
  id: EditorFontFamily;
  name: string;
  desc: string;
  stack: string;
}

export const FONT_FAMILY_PRESETS: FontFamilyPreset[] = [
  {
    id: "mono",
    name: "等宽",
    desc: "技术笔记 · 对齐整齐",
    stack: "var(--font-mono)",
  },
  {
    id: "sans",
    name: "无衬线",
    desc: "流畅写作 · 现代",
    stack: "var(--font-sans)",
  },
  {
    id: "serif",
    name: "衬线",
    desc: "长文阅读 · 优雅",
    stack: "var(--font-serif)",
  },
];

export const DEFAULT_FONT_FAMILY: EditorFontFamily = "mono";

export function getFontStack(id: string): string {
  return FONT_FAMILY_PRESETS.find(f => f.id === id)?.stack ?? "var(--font-mono)";
}
