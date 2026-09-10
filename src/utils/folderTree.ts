export type FolderTreeNode<T> = T & { children: FolderTreeNode<T>[] };

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
