import { describe, expect, it } from "vitest";
import {
  DOCUMENT_IMAGE_MAX_BYTES,
  validateDocumentImageFile,
  validateDocumentImageSignature,
} from "../documentImage";

describe("document image validation", () => {
  it("rejects unsupported formats and oversized images", () => {
    expect(() =>
      validateDocumentImageFile(new File(["svg"], "x.svg", { type: "image/svg+xml" }))
    ).toThrow(/仅支持/);
    const oversized = new File([new Uint8Array(DOCUMENT_IMAGE_MAX_BYTES + 1)], "x.png", {
      type: "image/png",
    });
    expect(() => validateDocumentImageFile(oversized)).toThrow(/10 MB/);
  });

  it("accepts matching PNG, JPEG, WebP and GIF signatures", async () => {
    const cases: Array<[string, string, number[]]> = [
      ["image/png", "x.png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
      ["image/jpeg", "x.jpg", [0xff, 0xd8, 0xff, 0xe0]],
      ["image/webp", "x.webp", [..."RIFFxxxxWEBP"].map(char => char.charCodeAt(0))],
      ["image/gif", "x.gif", [..."GIF89a"].map(char => char.charCodeAt(0))],
    ];
    for (const [type, name, bytes] of cases) {
      await expect(
        validateDocumentImageSignature(new File([new Uint8Array(bytes)], name, { type }))
      ).resolves.toBeUndefined();
    }
  });

  it("rejects mismatched signatures", async () => {
    await expect(
      validateDocumentImageSignature(
        new File([new Uint8Array([0xff, 0xd8, 0xff])], "fake.png", { type: "image/png" })
      )
    ).rejects.toThrow(/不匹配/);
  });
});
