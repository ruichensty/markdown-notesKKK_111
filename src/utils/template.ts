import type { NoteTemplate } from "@types";

function formatNow(fmt: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const tokens: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    dddd: ["日", "一", "二", "三", "四", "五", "六"][d.getDay()],
  };
  let result = fmt;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(token, value);
  }
  return result;
}

export function applyTemplateVariables(content: string, title: string): string {
  return content
    .replace(/\{\{date\}\}/g, formatNow("YYYY-MM-DD"))
    .replace(/\{\{time\}\}/g, formatNow("HH:mm"))
    .replace(/\{\{datetime\}\}/g, formatNow("YYYY-MM-DD HH:mm"))
    .replace(/\{\{weekday\}\}/g, formatNow("dddd"))
    .replace(/\{\{title\}\}/g, title);
}

export const BUILTIN_TEMPLATES: NoteTemplate[] = [
  {
    id: "builtin-daily",
    name: "每日日记",
    description: "记录每天的心情和事件",
    content: `# {{date}} {{weekday}}

## 今日心情
> 用一句话概括今天的心情

## 今日事项
- [ ] 

## 感悟与反思



## 明日计划
- [ ] 
`,
    isBuiltin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "builtin-weekly",
    name: "每周周报",
    description: "整理本周工作与学习成果",
    content: `# 周报 - {{date}}

## 本周完成
1. 
2. 
3. 

## 遇到的问题


## 下周计划
1. 
2. 
3. 

## 备注

`,
    isBuiltin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "builtin-meeting",
    name: "会议记录",
    description: "记录会议要点和待办事项",
    content: `# 会议记录

**日期：** {{datetime}}
**参会人：** 
**记录人：** 

---

## 会议议题
1. 

## 讨论内容


## 决议事项


## 待办事项
| 事项 | 负责人 | 截止日期 |
|------|--------|----------|
|      |        |          |

`,
    isBuiltin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "builtin-reading",
    name: "读书笔记",
    description: "记录阅读心得和摘录",
    content: `# 读书笔记：{{title}}

## 书籍信息
- **书名：**
- **作者：**
- **阅读日期：** {{date}}

## 摘录
> 



## 心得



## 推荐指数
`,
    isBuiltin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "builtin-todo",
    name: "待办清单",
    description: "快速列出待办事项",
    content: `# 待办清单 - {{date}} {{weekday}}

## 紧急重要
- [ ] 

## 重要不紧急
- [ ] 

## 日常事务
- [ ] 

---

_完成后可在此记录心得_
`,
    isBuiltin: true,
    createdAt: 0,
    updatedAt: 0,
  },
];
