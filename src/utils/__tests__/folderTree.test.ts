import { describe, it, expect } from "vitest";
import { buildFolderTree, collectFolderSubtreeIds } from "../folderTree";

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

describe("buildFolderTree", () => {
  it("空数组返回空数组", () => {
    expect(buildFolderTree([])).toEqual([]);
  });

  it("仅有根级文件夹时返回扁平树", () => {
    const folders: Folder[] = [
      { id: "a", name: "A", parentId: null },
      { id: "b", name: "B", parentId: null },
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(2);
    expect(tree.map(f => f.id)).toEqual(["a", "b"]);
    expect(tree.every(f => f.children.length === 0)).toBe(true);
  });

  it("正确构建多层嵌套树", () => {
    const folders: Folder[] = [
      { id: "root", name: "Root", parentId: null },
      { id: "child", name: "Child", parentId: "root" },
      { id: "grandchild", name: "Grandchild", parentId: "child" },
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("root");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe("child");
    expect(tree[0].children[0].children[0].id).toBe("grandchild");
  });

  it("孤儿节点（parentId 不存在）不会出现在树中", () => {
    const folders: Folder[] = [
      { id: "a", name: "A", parentId: null },
      { id: "orphan", name: "Orphan", parentId: "missing" },
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("a");
  });

  it("保持文件夹原始字段不变", () => {
    const folders: Folder[] = [{ id: "a", name: "A", parentId: null }];
    const tree = buildFolderTree(folders);
    expect(tree[0].name).toBe("A");
    expect(tree[0].parentId).toBeNull();
  });
});

describe("collectFolderSubtreeIds", () => {
  const folders = [
    { id: "root", parentId: null },
    { id: "child", parentId: "root" },
    { id: "grandchild", parentId: "child" },
    { id: "sibling", parentId: "root" },
    { id: "unrelated", parentId: null },
  ];

  it("收集自身及所有后代 id", () => {
    const ids = collectFolderSubtreeIds("root", folders);
    expect([...ids].sort()).toEqual(["child", "grandchild", "root", "sibling"]);
  });

  it("叶子节点只收集自身", () => {
    const ids = collectFolderSubtreeIds("grandchild", folders);
    expect([...ids]).toEqual(["grandchild"]);
  });

  it("不包含无关文件夹", () => {
    const ids = collectFolderSubtreeIds("child", folders);
    expect(ids.has("unrelated")).toBe(false);
    expect(ids.has("sibling")).toBe(false);
  });
});
