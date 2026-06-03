# 文件上传功能实施计划

## 当前存储方案

- **localStorage**，单 key `markdown-notes-app`，序列化为 JSON
- 容量上限 5-10MB，只能存字符串
- 上传文件后二进制数据量远超容量，必须迁移

## 第一阶段：存储迁移（localStorage → IndexedDB）

### 改动文件

- `src/utils/storage.ts` — 重写为 IndexedDB，封装通用 CRUD
- `src/types/note.ts` — `Note` 增加 `attachments`，新增 `Attachment` 类型
- `src/utils/storageMigration.ts` — 新建，自动从 localStorage 迁移旧数据

### 新增类型

```ts
interface Attachment {
  id: string;
  fileName: string;
  fileType: string;       // mime type
  fileSize: number;
  data: ArrayBuffer;      // 原始文件二进制
  uploadedAt: number;
}

interface Note {
  // 现有字段不变
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  folderIds?: string[];
  attachments: Attachment[];  // 新增
}
```

### 兼容策略

首次启动时自动从 localStorage 读取旧数据迁移到 IndexedDB，迁移完成后清除 localStorage。

## 第二阶段：文件解析

### 新建文件

- `src/utils/fileParser.ts`

### 新增依赖

| 库 | 用途 | 大小 |
|----|------|------|
| `mammoth` | .docx → Markdown | ~30KB |
| `xlsx` (SheetJS) | .xlsx → Markdown 表格 | ~300KB |
| `pdfjs-dist` | .pdf → 纯文本 | ~200KB |

### 解析流程

1. 用户上传文件
2. 根据扩展名选择解析器
3. 解析后 Markdown 文本追加到笔记 content
4. 原始文件 ArrayBuffer 存入 attachments

## 第三阶段：UI 组件

### 新建文件

- `src/components/FileUploader.tsx` — 上传区域（拖拽 + 点击）
- `src/components/AttachmentList.tsx` — 附件列表

### 改动文件

- `src/components/Editor.tsx` — 集成拖拽上传
- `src/components/NoteItem.tsx` — 附件数量提示

## 第四阶段：附件管理

- 预览：Blob URL 新窗口打开
- 下载：Blob URL 触发浏览器下载
- 删除：从 attachments 数组移除

## 实施顺序

1. IndexedDB 存储迁移（基础）
2. Note 类型扩展 + 旧数据迁移
3. 文件解析器
4. 上传 UI
5. 附件管理
