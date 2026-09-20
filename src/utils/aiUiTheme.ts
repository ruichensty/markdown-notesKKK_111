import type { CSSProperties } from "react";
import {
  AI_UI_THEME_FORMAT,
  AI_UI_THEME_VERSION,
  type AiUiStyle,
  type AiUiThemePackage,
  type AiUiThemeTokens,
  type BuiltInAiUiStyle,
} from "@types";

export const AI_UI_THEME_MAX_BYTES = 64 * 1024;

const BUILT_IN_STYLES = new Set<BuiltInAiUiStyle>(["companion", "pet", "minimal"]);
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const NUMBER_RANGES = {
  botRadius: [10, 30],
  panelRadius: [8, 30],
  blur: [0, 32],
  shadow: [0, 48],
  density: [0.85, 1.15],
  motion: [0, 1],
} as const satisfies Record<
  keyof Pick<
    AiUiThemeTokens,
    "botRadius" | "panelRadius" | "blur" | "shadow" | "density" | "motion"
  >,
  readonly [number, number]
>;

const COLOR_KEYS = [
  "accent",
  "accentSecondary",
  "surface",
  "surfaceStrong",
  "text",
  "muted",
  "border",
] as const satisfies readonly (keyof AiUiThemeTokens)[];

type AiUiCssProperties = CSSProperties & {
  "--ai-ui-accent"?: string;
  "--ai-ui-accent-2"?: string;
  "--ai-ui-surface"?: string;
  "--ai-ui-surface-strong"?: string;
  "--ai-ui-text"?: string;
  "--ai-ui-muted"?: string;
  "--ai-ui-border"?: string;
  "--ai-ui-bot-radius"?: string;
  "--ai-ui-panel-radius"?: string;
  "--ai-ui-blur"?: string;
  "--ai-ui-shadow"?: string;
  "--ai-ui-density"?: string;
  "--ai-ui-motion"?: string;
  "--ai-ui-space"?: string;
  "--ai-ui-gap"?: string;
  "--ai-ui-float-distance"?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalText(
  source: Record<string, unknown>,
  key: "author" | "description",
  maxLength: number
): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new Error(`${key === "author" ? "作者" : "描述"}必须是 1-${maxLength} 个字符`);
  }
  return value.trim();
}

function sanitizeTokens(value: unknown): AiUiThemeTokens {
  if (!isRecord(value)) throw new Error("主题 tokens 必须是对象");
  const tokens: AiUiThemeTokens = {};

  for (const key of COLOR_KEYS) {
    const token = value[key];
    if (token === undefined) continue;
    if (typeof token !== "string" || !COLOR_PATTERN.test(token)) {
      throw new Error(`${key} 必须是 #RRGGBB 格式的颜色`);
    }
    tokens[key] = token.toLowerCase();
  }

  for (const [key, [min, max]] of Object.entries(NUMBER_RANGES) as Array<
    [keyof typeof NUMBER_RANGES, readonly [number, number]]
  >) {
    const token = value[key];
    if (token === undefined) continue;
    if (typeof token !== "number" || !Number.isFinite(token) || token < min || token > max) {
      throw new Error(`${key} 必须是 ${min}-${max} 之间的数字`);
    }
    tokens[key] = token;
  }

  return tokens;
}

export function parseAiUiTheme(input: unknown): AiUiThemePackage {
  if (!isRecord(input)) throw new Error("主题文件必须是 JSON 对象");
  if (input.format !== AI_UI_THEME_FORMAT) throw new Error("不是有效的 Markdown Notes AI UI 主题");
  if (input.version !== AI_UI_THEME_VERSION) throw new Error("暂不支持这个主题版本");
  if (
    typeof input.name !== "string" ||
    input.name.trim().length === 0 ||
    input.name.trim().length > 40
  ) {
    throw new Error("主题名称必须是 1-40 个字符");
  }
  if (typeof input.base !== "string" || !BUILT_IN_STYLES.has(input.base as BuiltInAiUiStyle)) {
    throw new Error("主题 base 必须是 companion、pet 或 minimal");
  }

  return {
    format: AI_UI_THEME_FORMAT,
    version: AI_UI_THEME_VERSION,
    name: input.name.trim(),
    author: readOptionalText(input, "author", 40),
    description: readOptionalText(input, "description", 120),
    base: input.base as BuiltInAiUiStyle,
    tokens: sanitizeTokens(input.tokens),
  };
}

export function parseAiUiThemeText(text: string): AiUiThemePackage {
  if (new Blob([text]).size > AI_UI_THEME_MAX_BYTES) throw new Error("主题文件不能超过 64 KB");
  try {
    return parseAiUiTheme(JSON.parse(text) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("主题文件不是有效的 JSON");
    throw error;
  }
}

export async function readAiUiThemeFile(file: File): Promise<AiUiThemePackage> {
  if (file.size > AI_UI_THEME_MAX_BYTES) throw new Error("主题文件不能超过 64 KB");
  return parseAiUiThemeText(await file.text());
}

export function getAiUiBaseStyle(
  style: AiUiStyle,
  customTheme: AiUiThemePackage | null
): BuiltInAiUiStyle {
  if (style !== "custom") return style;
  if (!customTheme) return "companion";
  try {
    return parseAiUiTheme(customTheme).base;
  } catch {
    return "companion";
  }
}

export function getAiUiThemeVariables(theme: AiUiThemePackage | null): AiUiCssProperties {
  if (!theme) return {};
  let tokens: AiUiThemeTokens;
  try {
    tokens = parseAiUiTheme(theme).tokens;
  } catch {
    return {};
  }
  return {
    "--ai-ui-accent": tokens.accent,
    "--ai-ui-accent-2": tokens.accentSecondary,
    "--ai-ui-surface": tokens.surface,
    "--ai-ui-surface-strong": tokens.surfaceStrong,
    "--ai-ui-text": tokens.text,
    "--ai-ui-muted": tokens.muted,
    "--ai-ui-border": tokens.border,
    "--ai-ui-bot-radius": tokens.botRadius === undefined ? undefined : `${tokens.botRadius}px`,
    "--ai-ui-panel-radius":
      tokens.panelRadius === undefined ? undefined : `${tokens.panelRadius}px`,
    "--ai-ui-blur": tokens.blur === undefined ? undefined : `${tokens.blur}px`,
    "--ai-ui-shadow": tokens.shadow === undefined ? undefined : `${tokens.shadow}px`,
    "--ai-ui-density": tokens.density === undefined ? undefined : String(tokens.density),
    "--ai-ui-motion": tokens.motion === undefined ? undefined : String(tokens.motion),
    "--ai-ui-space": tokens.density === undefined ? undefined : `${12 * tokens.density}px`,
    "--ai-ui-gap": tokens.density === undefined ? undefined : `${10 * tokens.density}px`,
    "--ai-ui-float-distance": tokens.motion === undefined ? undefined : `${-4 * tokens.motion}px`,
  };
}

export const AI_UI_THEME_TEMPLATE: AiUiThemePackage = {
  format: AI_UI_THEME_FORMAT,
  version: AI_UI_THEME_VERSION,
  name: "我的 AI 伙伴",
  author: "你的名字",
  description: "从数字伙伴风格扩展的自定义主题",
  base: "companion",
  tokens: {
    accent: "#38d9ff",
    accentSecondary: "#8b7cff",
    surface: "#f5f8ff",
    surfaceStrong: "#ffffff",
    text: "#182033",
    muted: "#667085",
    border: "#cbd5e1",
    botRadius: 22,
    panelRadius: 18,
    blur: 20,
    shadow: 28,
    density: 1,
    motion: 1,
  },
};

export function createAiUiThemeTemplateBlob(): Blob {
  return new Blob([JSON.stringify(AI_UI_THEME_TEMPLATE, null, 2)], {
    type: "application/json;charset=utf-8",
  });
}
