import { describe, expect, it } from "vitest";
import {
  AVATAR_IMAGE_MAX_BYTES,
  validateAvatarImageFile,
  validateAvatarImageSignature,
} from "../avatarImage";

describe("validateAvatarImageFile", () => {
  it("accepts PNG and WebP images within the size limit", () => {
    expect(() => validateAvatarImageFile(new File(["png"], "avatar.png", { type: "image/png" }))).not.toThrow();
    expect(() =>
      validateAvatarImageFile(new File(["webp"], "avatar.webp", { type: "image/webp" }))
    ).not.toThrow();
  });

  it("rejects unsupported image formats", () => {
    expect(() =>
      validateAvatarImageFile(new File(["svg"], "avatar.svg", { type: "image/svg+xml" }))
    ).toThrow("仅支持 PNG 或 WebP 图片");
  });

  it("rejects files larger than 5 MB", () => {
    const file = new File([new Uint8Array(AVATAR_IMAGE_MAX_BYTES + 1)], "avatar.png", {
      type: "image/png",
    });
    expect(() => validateAvatarImageFile(file)).toThrow("图片不能超过 5 MB");
  });

  it("accepts matching PNG and WebP signatures", async () => {
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "avatar.png",
      { type: "image/png" }
    );
    const webp = new File([new TextEncoder().encode("RIFF0000WEBP")], "avatar.webp", {
      type: "image/webp",
    });

    await expect(validateAvatarImageSignature(png)).resolves.toBeUndefined();
    await expect(validateAvatarImageSignature(webp)).resolves.toBeUndefined();
  });

  it("rejects a mismatched file signature", async () => {
    const disguisedJpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], "avatar.png", {
      type: "image/png",
    });
    await expect(validateAvatarImageSignature(disguisedJpeg)).rejects.toThrow(
      "图片内容与文件格式不匹配"
    );
  });
});
