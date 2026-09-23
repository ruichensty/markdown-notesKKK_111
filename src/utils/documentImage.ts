export const DOCUMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_IMAGE_MAX_DIMENSION = 4096;
export const DOCUMENT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export interface DocumentImageInfo {
  width: number;
  height: number;
}

function isAllowedType(type: string): type is (typeof DOCUMENT_IMAGE_TYPES)[number] {
  return DOCUMENT_IMAGE_TYPES.includes(type as (typeof DOCUMENT_IMAGE_TYPES)[number]);
}

export function validateDocumentImageFile(file: File): void {
  if (!isAllowedType(file.type)) throw new Error("仅支持 PNG、JPEG、WebP 或 GIF 图片");
  if (file.size === 0) throw new Error("图片文件为空");
  if (file.size > DOCUMENT_IMAGE_MAX_BYTES) throw new Error("单张图片不能超过 10 MB");
}

export async function validateDocumentImageSignature(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng =
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value
    );
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const gifHeader = bytes.length >= 6 ? String.fromCharCode(...bytes.slice(0, 6)) : "";
  const isGif = gifHeader === "GIF87a" || gifHeader === "GIF89a";
  const matches =
    (file.type === "image/png" && isPng) ||
    (file.type === "image/jpeg" && isJpeg) ||
    (file.type === "image/webp" && isWebp) ||
    (file.type === "image/gif" && isGif);
  if (!matches) throw new Error("图片内容与文件格式不匹配");
}

export function readDocumentImageInfo(file: File): Promise<DocumentImageInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (
        image.naturalWidth > DOCUMENT_IMAGE_MAX_DIMENSION ||
        image.naturalHeight > DOCUMENT_IMAGE_MAX_DIMENSION
      ) {
        reject(new Error("图片尺寸不能超过 4096 × 4096"));
        return;
      }
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法解码图片，请更换文件后重试"));
    };
    image.src = url;
  });
}

export async function validateDocumentImage(file: File): Promise<DocumentImageInfo> {
  validateDocumentImageFile(file);
  await validateDocumentImageSignature(file);
  return readDocumentImageInfo(file);
}
