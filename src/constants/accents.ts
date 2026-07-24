import type { Theme } from "@types";

const RAINBOW_LIGHT = "270 100% 56%";
const RAINBOW_DARK = "280 100% 65%";

export interface AccentPreset {
  id: string;
  name: string;
  desc: string;
  light: string;
  dark: string;
  isRainbow?: boolean;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "indigo",
    name: "靛蓝",
    desc: "默认 · 沉静专注",
    light: "222 88% 57%",
    dark: "217 92% 64%",
  },
  { id: "violet", name: "紫罗兰", desc: "创意 · 优雅", light: "262 83% 58%", dark: "265 85% 68%" },
  { id: "emerald", name: "翡翠", desc: "清新 · 护眼", light: "152 58% 40%", dark: "152 65% 50%" },
  { id: "rose", name: "玫瑰", desc: "温暖 · 日记", light: "346 77% 55%", dark: "347 80% 65%" },
  { id: "amber", name: "琥珀", desc: "明亮 · 活力", light: "32 90% 48%", dark: "35 92% 58%" },
  { id: "cyan", name: "青蓝", desc: "科技 · 冷静", light: "188 78% 38%", dark: "188 82% 52%" },
  {
    id: "rainbow-black",
    name: "五彩黑",
    desc: "五彩斑斓的黑 · 绚丽",
    light: RAINBOW_LIGHT,
    dark: RAINBOW_DARK,
    isRainbow: true,
  },
];

export const DEFAULT_ACCENT = "indigo";

export type AccentId = (typeof ACCENT_PRESETS)[number]["id"];

export function getAccentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find(a => a.id === id) ?? ACCENT_PRESETS[0];
}

export function getAccentValue(id: string, theme: Theme): string {
  const preset = getAccentPreset(id);
  return theme === "light" ? preset.light : preset.dark;
}

export function applyAccent(id: string, theme: Theme): void {
  const value = getAccentValue(id, theme);
  const root = document.documentElement;
  root.style.setProperty("--primary", value);
  root.style.setProperty("--ring", value);
}
