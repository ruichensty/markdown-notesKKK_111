import { useEffect, useState } from "react";
import { idbGetFile } from "@utils/indexedDBStorage";

export function useStoredImageUrl(fileId: string | null): {
  url: string | null;
  loading: boolean;
} {
  const [result, setResult] = useState<{
    fileId: string | null;
    url: string | null;
  }>({ fileId: null, url: null });

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    if (!fileId) return;

    idbGetFile(fileId)
      .then(file => {
        if (!active) return;
        if (!file) {
          setResult({ fileId, url: null });
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([file.data], { type: file.fileType }));
        setResult({ fileId, url: objectUrl });
      })
      .catch(() => {
        if (active) setResult({ fileId, url: null });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  const current = result.fileId === fileId ? result.url : null;
  return { url: current, loading: Boolean(fileId) && result.fileId !== fileId };
}
