import { describe, expect, it } from "vitest";
import { buildMobileOpenUrl, getMobileViewMode, getSharedViewMode } from "../mobileOpenUrl";

describe("mobileOpenUrl", () => {
  it("builds a home URL without stale note params", () => {
    const url = buildMobileOpenUrl("http://192.168.1.8:3000/?note=old&foo=bar", null, "home");

    expect(url).toBe("http://192.168.1.8:3000/?foo=bar&view=home");
  });

  it("builds a note URL with current note and view", () => {
    const url = buildMobileOpenUrl("http://192.168.1.8:3000/?foo=bar", "note-1", "preview");

    expect(url).toBe("http://192.168.1.8:3000/?foo=bar&note=note-1&view=preview");
  });

  it("uses split when a note is shared from home view", () => {
    const url = buildMobileOpenUrl("http://192.168.1.8:3000/", "note-1", "home");

    expect(url).toBe("http://192.168.1.8:3000/?note=note-1&view=split");
  });

  it("parses only supported view modes", () => {
    expect(getSharedViewMode("home")).toBe("home");
    expect(getSharedViewMode("editor")).toBe("editor");
    expect(getSharedViewMode("preview")).toBe("preview");
    expect(getSharedViewMode("split")).toBe("split");
    expect(getSharedViewMode("invalid")).toBeNull();
    expect(getSharedViewMode(null)).toBeNull();
  });

  it("maps mobile view modes to a single pane", () => {
    expect(getMobileViewMode("preview")).toBe("preview");
    expect(getMobileViewMode("split")).toBe("editor");
    expect(getMobileViewMode("editor")).toBe("editor");
    expect(getMobileViewMode(null)).toBe("editor");
  });
});
