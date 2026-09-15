import type { Folder as FolderBase } from "@types";

export type FolderTreeNode<T> = T & { children: FolderTreeNode<T>[] };
export type FolderNodeData = FolderTreeNode<FolderBase>;

export function buildFolderTree<T extends { id: string; parentId: string | null }>(
  folders: T[]
): FolderTreeNode<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const folder of folders) {
    const key = folder.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(folder);
    byParent.set(key, list);
  }

  const build = (parentId: string | null = null): FolderTreeNode<T>[] => {
    const children = byParent.get(parentId) ?? [];
    return children.map(folder => ({ ...folder, children: build(folder.id) }));
  };

  return build();
}

export function flattenFolderTree<T extends { children?: T[] }>(
  tree: T[],
  depth = 0,
  acc: { folder: T; depth: number }[] = []
): { folder: T; depth: number }[] {
  for (const f of tree) {
    acc.push({ folder: f, depth });
    if (f.children?.length) flattenFolderTree(f.children, depth + 1, acc);
  }
  return acc;
}

export function collectSubtreeIds<T extends { id: string; children?: T[] }>(
  folder: T
): Set<string> {
  const ids = new Set<string>();
  const walk = (f: T) => {
    ids.add(f.id);
    (f.children || []).forEach(walk);
  };
  walk(folder);
  return ids;
}

export function isFolderInSubtree<T extends { id: string; children?: T[] }>(
  folderId: string,
  subtree: T
): boolean {
  const check = (f: T): boolean => {
    for (const child of f.children || []) {
      if (child.id === folderId) return true;
      if (check(child)) return true;
    }
    return false;
  };
  return check(subtree);
}

export function collectFolderSubtreeIds(
  folderId: string,
  folders: { id: string; parentId: string | null }[]
): Set<string> {
  const ids = new Set<string>();
  const collect = (id: string) => {
    ids.add(id);
    for (const f of folders) {
      if (f.parentId === id) collect(f.id);
    }
  };
  collect(folderId);
  return ids;
}
