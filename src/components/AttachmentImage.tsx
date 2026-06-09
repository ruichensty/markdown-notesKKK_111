import { useState, useEffect } from "react";
import { idbGetFile } from "@utils/indexedDBStorage";

interface AttachmentImageProps {
  src: string;
  alt?: string;
}

export function AttachmentImage({ src, alt }: AttachmentImageProps) {
  const [imageState, setImageState] = useState<{
    src: string;
    blobUrl: string | null;
    error: boolean;
  }>({ src, blobUrl: null, error: false });

  useEffect(() => {
    if (!src.startsWith("attachment://")) return;

    const fileId = src.replace("attachment://", "");
    let cancelled = false;
    let objectUrl: string | null = null;

    idbGetFile(fileId)
      .then(file => {
        if (!file) {
          if (!cancelled) setImageState({ src, blobUrl: null, error: true });
          return;
        }

        objectUrl = URL.createObjectURL(new Blob([file.data], { type: file.fileType }));

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }

        setImageState({ src, blobUrl: objectUrl, error: false });
      })
      .catch(() => {
        if (!cancelled) setImageState({ src, blobUrl: null, error: true });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src.startsWith("attachment://")) {
    return <img src={src} alt={alt || ""} className="max-w-full h-auto rounded-lg" />;
  }

  if (imageState.src === src && imageState.error) {
    return <span className="text-destructive text-xs">[Image not found]</span>;
  }

  if (imageState.src !== src || !imageState.blobUrl) {
    return <span className="text-muted-foreground text-xs animate-pulse">Loading image...</span>;
  }

  return <img src={imageState.blobUrl} alt={alt || ""} className="max-w-full h-auto rounded-lg" />;
}
