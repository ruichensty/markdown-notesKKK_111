export const AI_UI_THEME_FORMAT = "markdown-notes-ai-ui-theme";
export const AI_UI_THEME_VERSION = 1;

export type BuiltInAiUiStyle = "companion" | "pet" | "minimal";
export type AiUiStyle = BuiltInAiUiStyle | "custom";

export interface AiUiThemeTokens {
  accent?: string;
  accentSecondary?: string;
  surface?: string;
  surfaceStrong?: string;
  text?: string;
  muted?: string;
  border?: string;
  botRadius?: number;
  panelRadius?: number;
  blur?: number;
  shadow?: number;
  density?: number;
  motion?: number;
}

export interface AiUiThemePackage {
  format: typeof AI_UI_THEME_FORMAT;
  version: typeof AI_UI_THEME_VERSION;
  name: string;
  author?: string;
  description?: string;
  base: BuiltInAiUiStyle;
  tokens: AiUiThemeTokens;
}
