import { describe, it, expect, vi, afterEach } from "vitest";
import {
  escapeHtml,
  sanitizeFilename,
  sortNotes,
  generateId,
  formatDate,
} from "../export";

describe("escapeHtml", () => {
  it("转义 & < > \" 四种危险字符", () => {
    expect(escapeHtml(`<script>&"`)).toBe("&lt;script&gt;&amp;&quot;");
  });

  it("不改变普通文本", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("处理空字符串", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("sanitizeFilename", () => {
  it("替换非法字符为下划线", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
  });

  it("空标题回退为 untitled", () => {
    expect(sanitizeFilename("")).toBe("untitled");
    expect(sanitizeFilename(undefined as unknown as string)).toBe("untitled");
  });

  it("压缩连续空白并去除首尾空白", () => {
    expect(sanitizeFilename("  我的   笔记  ")).toBe("我的 笔记");
  });

  it("截断超过 200 字符的名称", () => {
    const long = "a".repeat(300);
    expect(sanitizeFilename(long)).toHaveLength(200);
  });
});

describe("sortNotes", () => {
  it("有 order 字段时按 order 升序", () => {
    const notes = [
      { id: "a", order: 3 },
      { id: "b", order: 1 },
      { id: "c", order: 2 },
    ];
    expect(sortNotes(notes).map(n => n.id)).toEqual(["b", "c", "a"]);
  });

  it("无 order 时按 updatedAt 降序", () => {
    const notes = [
      { id: "a", updatedAt: 100 },
      { id: "b", updatedAt: 300 },
      { id: "c", updatedAt: 200 },
    ];
    expect(sortNotes(notes).map(n => n.id)).toEqual(["b", "c", "a"]);
  });

  it("不修改原数组", () => {
    const notes = [
      { id: "a", order: 2 },
      { id: "b", order: 1 },
    ];
    const sorted = sortNotes(notes);
    expect(notes.map(n => n.id)).toEqual(["a", "b"]);
    expect(sorted).not.toBe(notes);
  });
});

describe("generateId", () => {
  it("返回非空字符串", () => {
    expect(generateId()).toBeTruthy();
  });

  it("连续生成的 ID 不同", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("formatDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("60 秒内显示刚刚", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    const ts = new Date(2026, 0, 1, 11, 59, 30).getTime();
    expect(formatDate(ts)).toMatch(/^刚刚 /);
  });

  it("数分钟前", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    const ts = new Date(2026, 0, 1, 11, 55, 0).getTime();
    expect(formatDate(ts)).toMatch(/^5分钟前 /);
  });

  it("超过 7 天返回完整日期时间", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    const ts = new Date(2026, 0, 1, 8, 30, 0).getTime();
    expect(formatDate(ts)).toBe("2026-01-01 08:30:00");
  });
});
