import { describe, expect, it } from "vitest";
import { isCrossTabSyncMessage } from "../crossTabSync";

describe("cross-tab sync messages", () => {
  it("accepts payload-free domain notifications", () => {
    expect(
      isCrossTabSyncMessage({
        type: "data-changed",
        domain: "settings",
        sourceId: "tab-a",
        timestamp: 1,
      })
    ).toBe(true);
  });

  it("rejects unknown domains and malformed sources", () => {
    expect(
      isCrossTabSyncMessage({
        type: "data-changed",
        domain: "unknown",
        sourceId: "tab-a",
        timestamp: 1,
      })
    ).toBe(false);
    expect(
      isCrossTabSyncMessage({
        type: "data-changed",
        domain: "settings",
        sourceId: 1,
        timestamp: 1,
      })
    ).toBe(false);
  });
});
