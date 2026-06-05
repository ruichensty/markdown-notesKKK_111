import { useState, useCallback, useMemo, useEffect } from "react";
import type { Folder as FolderBase } from "@types";
import { idbGetAllFolders, idbSaveAllFolders } from "@utils/indexedDBStorage";

export interface Folder extends FolderBase {
  children?: Folder[];
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    idbGetAllFolders()
      .then(data => {
        setFolders(data || []);
        setLoaded(true);
      })
      .catch(error => {
        console.error("Failed to load folders:", error);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    idbSaveAllFolders(folders).catch(error => {
      console.error("Failed to save folders:", error);
    });
  }, [folders, loaded]);

  const createFolder = useCallback((data: Omit<Folder, "id" | "children">) => {
    const newFolder: Folder = {
      ...data,
      id: `folder-${Date.now()}`,
    };
    setFolders(prev => [...prev, newFolder]);
  }, []);

  const updateFolder = useCallback((id: string, data: Partial<Folder>) => {
    setFolders(prev => prev.map(folder => (folder.id === id ? { ...folder, ...data } : folder)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => {
      const idsToDelete = new Set<string>();
      const collectIds = (folderId: string) => {
        idsToDelete.add(folderId);
        for (const f of prev) {
          if (f.parentId === folderId) {
            collectIds(f.id);
          }
        }
      };
      collectIds(id);
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

  const folderTree = useMemo(() => {
    const byParent = new Map<string | null, Folder[]>();
    for (const folder of folders) {
      const key = folder.parentId ?? null;
      const list = byParent.get(key) ?? [];
      list.push(folder);
      byParent.set(key, list);
    }

    const buildTree = (parentId: string | null = null): Folder[] => {
      const children = byParent.get(parentId) ?? [];
      return children.map(folder => ({
        ...folder,
        children: buildTree(folder.id),
      }));
    };

    return buildTree();
  }, [folders]);

  return {
    folders,
    createFolder,
    updateFolder,
    deleteFolder,
    getBreadcrumbs,
    folderTree,
  };
}
