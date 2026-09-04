export interface AiQuickPrompt {
  id: string;
  label: string;
  text: string;
  needsNote?: boolean;
}

export const BUILT_IN_QUICK_PROMPTS: AiQuickPrompt[] = [
  {
    id: "builtin-summarize",
    label: "📝 总结笔记",
    text: "请总结这篇笔记的核心内容，分条列出要点。",
    needsNote: true,
  },
  {
    id: "builtin-polish",
    label: "✨ 润色全文",
    text: "请润色这篇笔记的表达，保持原意不变，使语言更流畅自然。",
    needsNote: true,
  },
  {
    id: "builtin-continue",
    label: "✍️ 续写",
    text: "请顺着笔记内容自然续写一段。",
    needsNote: true,
  },
  {
    id: "builtin-outline",
    label: "📋 提取大纲",
    text: "请为这篇笔记提取一份结构化大纲。",
    needsNote: true,
  },
  {
    id: "builtin-title",
    label: "💡 起标题",
    text: "请为这篇笔记提供 5 个候选标题，简短有吸引力。",
    needsNote: true,
  },
  {
    id: "builtin-translate",
    label: "🌐 译为英文",
    text: "请把这篇笔记翻译成地道的英文，保留 markdown 格式。",
    needsNote: true,
  },
  {
    id: "builtin-brainstorm",
    label: "🧠 头脑风暴",
    text: "我想为我的笔记主题做一次头脑风暴，请给出 10 个不同角度的想法。",
  },
  {
    id: "builtin-explain",
    label: "❓ 解释概念",
    text: "请用通俗易懂的方式解释一个概念，我会随后告诉你是什么概念。",
  },
];
