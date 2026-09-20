import { describe, expect, it } from "vitest";
import {
  AI_UI_THEME_TEMPLATE,
  getAiUiBaseStyle,
  getAiUiThemeVariables,
  parseAiUiTheme,
  parseAiUiThemeText,
} from "../aiUiTheme";

describe("AI UI theme packages", () => {
  it("accepts and normalizes a valid theme", () => {
    const result = parseAiUiTheme({
      ...AI_UI_THEME_TEMPLATE,
      name: "  海盐伙伴  ",
      tokens: { accent: "#AABBCC", density: 0.95, unknown: "ignored" },
      script: "alert(1)",
    });

    expect(result.name).toBe("海盐伙伴");
    expect(result.tokens).toEqual({ accent: "#aabbcc", density: 0.95 });
    expect(result).not.toHaveProperty("script");
    expect(result.tokens).not.toHaveProperty("unknown");
  });

  it("rejects colors that could inject CSS or remote resources", () => {
    expect(() =>
      parseAiUiTheme({
        ...AI_UI_THEME_TEMPLATE,
        tokens: { surface: "url(https://example.com/track)" },
      })
    ).toThrow("#RRGGBB");
  });

  it("rejects numeric tokens outside their safe range", () => {
    expect(() => parseAiUiTheme({ ...AI_UI_THEME_TEMPLATE, tokens: { density: 2 } })).toThrow(
      "0.85-1.15"
    );
  });

  it("reports malformed JSON", () => {
    expect(() => parseAiUiThemeText("{not-json}")).toThrow("主题文件不是有效的 JSON");
  });

  it("resolves a custom theme to its built-in base style", () => {
    expect(getAiUiBaseStyle("custom", AI_UI_THEME_TEMPLATE)).toBe("companion");
    expect(getAiUiBaseStyle("custom", null)).toBe("companion");
    expect(getAiUiBaseStyle("pet", null)).toBe("pet");
  });

  it("maps validated tokens to scoped CSS variables", () => {
    const variables = getAiUiThemeVariables({
      ...AI_UI_THEME_TEMPLATE,
      tokens: { accent: "#112233", panelRadius: 24, motion: 0.5 },
    });

    expect(variables).toMatchObject({
      "--ai-ui-accent": "#112233",
      "--ai-ui-panel-radius": "24px",
      "--ai-ui-motion": "0.5",
    });
  });
});
