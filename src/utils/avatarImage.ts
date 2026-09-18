export const AVATAR_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_IMAGE_MAX_DIMENSION = 4096;
export const AVATAR_IMAGE_TYPES = ["image/png", "image/webp"] as const;

export interface AvatarImageInfo {
  width: number;
  height: number;
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("无法读取图片文件"));
    reader.readAsArrayBuffer(blob);
  });
}

export function validateAvatarImageFile(file: File): void {
  if (!AVATAR_IMAGE_TYPES.includes(file.type as (typeof AVATAR_IMAGE_TYPES)[number])) {
    throw new Error("仅支持 PNG 或 WebP 图片");
  }
  if (file.size > AVATAR_IMAGE_MAX_BYTES) {
    throw new Error("图片不能超过 5 MB");
  }
}

export async function validateAvatarImageSignature(file: File): Promise<void> {
  const bytes = new Uint8Array(await readBlobAsArrayBuffer(file.slice(0, 12)));
  const isPng =
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value
    );
  const isWebp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if ((file.type === "image/png" && !isPng) || (file.type === "image/webp" && !isWebp)) {
    throw new Error("图片内容与文件格式不匹配");
  }
}

export function readAvatarImageInfo(file: File): Promise<AvatarImageInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (
        image.naturalWidth > AVATAR_IMAGE_MAX_DIMENSION ||
        image.naturalHeight > AVATAR_IMAGE_MAX_DIMENSION
      ) {
        reject(new Error("图片尺寸不能超过 4096 × 4096"));
        return;
      }
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片，请更换文件后重试"));
    };
    image.src = url;
  });
}

export async function validateAvatarImage(file: File): Promise<AvatarImageInfo> {
  validateAvatarImageFile(file);
  await validateAvatarImageSignature(file);
  return readAvatarImageInfo(file);
}
