import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiChatPanel, type TtsPanelConfig } from "../AiChatPanel";
import type { SpeechController } from "@hooks/useSpeech";
import type { AiChat } from "@types";

const tts: TtsPanelConfig = {
  engine: "browser",
  auto: false,
  browser: { voiceName: "", rate: 1 },
  api: { baseUrl: "", apiKey: "", model: "", voice: "", speed: 1 },
};

const speech: SpeechController = {
  supported: false,
  voices: [],
  speakingKey: null,
  speechError: null,
  speakMessage: vi.fn(),
  stop: vi.fn(),
};

function renderPanel(overrides: Partial<React.ComponentProps<typeof AiChatPanel>> = {}) {
  const props: React.ComponentProps<typeof AiChatPanel> = {
    anchor: { x: 900, y: 500 },
    noteTitle: "测试笔记",
    keyMissing: false,
    tts,
    speech,
    quickPrompts: [],
    uiStyle: "companion",
    themeStyle: {},
    getNoteContext: mode => ({
      mode,
      title: "测试笔记",
      content: "需要保护的笔记内容",
      label: mode === "full" ? "全文" : "当前范围",
      sourceStart: 0,
      sourceEnd: 10,
      totalChars: 10,
      sentChars: 10,
      truncated: false,
    }),
    createNoteApplyPreview: vi.fn(() => null),
    onApplyNotePreview: vi.fn(() => ({ ok: true, message: "已应用" })),
    canUndoNoteApply: false,
    onUndoNoteApply: vi.fn(() => ({ ok: true, message: "已撤销" })),
    onToggleTtsAuto: vi.fn(),
    onToggleTtsEngine: vi.fn(),
    chats: [],
    activeChat: null,
    activeChatId: null,
    onSelectChat: vi.fn(),
    streaming: false,
    error: null,
    onSend: vi.fn(),
    onStop: vi.fn(),
    onNewChat: vi.fn(),
    onDeleteChat: vi.fn(),
    onClose: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
  render(<AiChatPanel {...props} />);
  return props;
}

describe("AiChatPanel", () => {
  it("requires explicit consent before a note prompt can send note content", () => {
    const onSend = vi.fn();
    renderPanel({
      onSend,
      quickPrompts: [
        {
          id: "summarize",
          label: "总结笔记",
          text: "请总结笔记",
          needsNote: true,
        },
      ],
    });

    const prompt = screen.getByRole("button", { name: "总结笔记" });
    expect(prompt).toBeDisabled();

    fireEvent.change(screen.getByLabelText("选择发送给 AI 的笔记范围"), {
      target: { value: "full" },
    });
    expect(prompt).toBeEnabled();
    fireEvent.click(prompt);

    expect(onSend).toHaveBeenCalledWith(
      "请总结笔记",
      expect.objectContaining({ mode: "full", title: "测试笔记", content: "需要保护的笔记内容" })
    );
  });

  it("allows generation to stop before the first response token arrives", () => {
    const onStop = vi.fn();
    const activeChat: AiChat = {
      id: "chat-1",
      title: "测试会话",
      messages: [
        { role: "user", content: "你好", ts: 1 },
        { role: "assistant", content: "", ts: 2 },
      ],
      createdAt: 1,
      updatedAt: 2,
    };

    renderPanel({
      chats: [activeChat],
      activeChat,
      activeChatId: activeChat.id,
      streaming: true,
      onStop,
    });

    fireEvent.click(screen.getByRole("button", { name: "停止生成" }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("confirms before deleting a conversation", () => {
    const onDeleteChat = vi.fn();
    const activeChat: AiChat = {
      id: "chat-1",
      title: "测试会话",
      messages: [],
      createdAt: 1,
      updatedAt: 1,
    };

    renderPanel({
      chats: [activeChat],
      activeChat,
      activeChatId: activeChat.id,
      onDeleteChat,
    });

    fireEvent.click(screen.getByRole("button", { name: "删除当前会话" }));
    expect(onDeleteChat).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "确认删除当前会话" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除", exact: true }));
    expect(onDeleteChat).toHaveBeenCalledWith(activeChat.id);
  });

  it("previews an assistant response before applying it to a note", () => {
    const activeChat: AiChat = {
      id: "chat-1",
      title: "测试会话",
      messages: [{ role: "assistant", content: "AI 生成内容", ts: 1 }],
      createdAt: 1,
      updatedAt: 1,
    };
    const preview = {
      mode: "append" as const,
      noteId: "note-1",
      noteTitle: "测试笔记",
      label: "追加到笔记末尾",
      beforeContent: "原内容",
      afterContent: "原内容\n\nAI 生成内容",
      caretStart: 5,
      caretEnd: 12,
    };
    const onApplyNotePreview = vi.fn(() => ({ ok: true, message: "已应用" }));

    renderPanel({
      chats: [activeChat],
      activeChat,
      activeChatId: activeChat.id,
      createNoteApplyPreview: vi.fn(() => preview),
      onApplyNotePreview,
    });

    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByRole("alertdialog", { name: "确认应用 AI 回复" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认应用" }));
    expect(onApplyNotePreview).toHaveBeenCalledWith(preview);
  });
});
