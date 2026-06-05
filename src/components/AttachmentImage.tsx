import { useState, useEffect } from "react";
import { idbGetFile } from "@utils/indexedDBStorage";

interface AttachmentImageProps {
  src: string;
  alt?: string;
}

export function AttachmentImage({ src, alt }: AttachmentImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src.startsWith("attachment://")) return;
    const fileId = src.replace("attachment://", "");
    let cancelled = false;

    idbGetFile(fileId)
      .then(file => {
        if (cancelled || !file) {
          if (!file) setError(true);
          return;
        }
        const blob = new Blob([file.data], { type: file.fileType });
        setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src, blobUrl]);

  if (error) {
    return <span className="text-destructive text-xs">[Image not found]</span>;
  }

  if (!blobUrl) {
    return <span className="text-muted-foreground text-xs animate-pulse">Loading image...</span>;
  }

  return <img src={blobUrl} alt={alt || ""} className="max-w-full h-auto rounded-lg" />;
}
