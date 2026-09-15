import { useState, useCallback, useMemo, useEffect } from "react";
import type { Folder } from "@types";
import { idbGetAllFolders, idbSaveAllFolders } from "@utils/indexedDBStorage";
import { getAllDataCache } from "@utils/storage";
import { buildFolderTree, collectFolderSubtreeIds, type FolderNodeData } from "@utils/folderTree";

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>(() => getAllDataCache()?.folders ?? []);
  const [loaded, setLoaded] = useState(() => !!getAllDataCache());

  useEffect(() => {
    if (loaded) return;
    idbGetAllFolders()
      .then(data => {
        setFolders(data || []);
        setLoaded(true);
      })
      .catch(error => {
        console.error("Failed to load folders:", error);
        setLoaded(true);
      });
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const timeoutId = window.setTimeout(() => {
      idbSaveAllFolders(folders).catch(error => {
        console.error("Failed to save folders:", error);
      });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [folders, loaded]);

  const createFolder = useCallback((data: Omit<Folder, "id">): string => {
    const newFolder: Folder = {
      ...data,
      id: `folder-${Date.now()}`,
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder.id;
  }, []);

  const updateFolder = useCallback((id: string, data: Partial<Folder>) => {
    setFolders(prev => prev.map(folder => (folder.id === id ? { ...folder, ...data } : folder)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => {
      const idsToDelete = collectFolderSubtreeIds(id, prev);
      return prev.filter(folder => !idsToDelete.has(folder.id));
    });
  }, []);

  const getBreadcrumbs = useCallback(
    (folderId: string): Folder[] => {
      const breadcrumbs: Folder[] = [];
      let currentFolder = folders.find(f => f.id === folderId);

      while (currentFolder) {
        breadcrumbs.unshift(currentFolder);
        currentFolder = currentFolder.parentId
          ? folders.find(f => f.id === currentFolder!.parentId)
          : undefined;
      }

      return breadcrumbs;
    },
    [folders]
  );

  const folderTree = useMemo<FolderNodeData[]>(() => buildFolderTree(folders), [folders]);

  return {
    folders,
    createFolder,
    updateFolder,
    deleteFolder,
    getBreadcrumbs,
    folderTree,
  };
}
