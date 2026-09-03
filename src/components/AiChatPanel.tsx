import { memo, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiChat } from "@types";

interface AiChatPanelProps {
  anchor: { x: number; y: number };
  noteTitle: string | null;
  noteContent: string | null;
  keyMissing: boolean;
  chats: AiChat[];
  activeChat: AiChat | null;
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  streaming: boolean;
  error: string | null;
  onSend: (text: string, noteContext: { title: string; content: string } | null) => void;
  onStop: () => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

const PANEL_WIDTH = 348;

const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="ai-msg-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
});

function panelStyle(anchor: { x: number; y: number }): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(PANEL_WIDTH, vw - 16);
  const height = Math.min(520, vh - 16);
  const left =
    anchor.x > vw / 2
      ? Math.max(8, anchor.x - width - 12)
      : Math.min(vw - width - 8, anchor.x + 68);
  const top = Math.min(Math.max(8, anchor.y - 40), vh - height - 8);
  return { left, top, width, height };
}

export function AiChatPanel(props: AiChatPanelProps) {
  const {
    anchor,
    noteTitle,
    noteContent,
    keyMissing,
    chats,
    activeChat,
    activeChatId,
    onSelectChat,
    streaming,
    error,
    onSend,
    onStop,
    onNewChat,
    onDeleteChat,
    onClose,
    onOpenSettings,
  } = props;

  const [input, setInput] = useState("");
  const [useNoteContext, setUseNoteContext] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const style = panelStyle(anchor);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [activeChat?.messages, streaming]);

  const messages = activeChat?.messages ?? [];
  const lastAssistantStreaming =
    streaming && messages.length > 0 && messages[messages.length - 1].role === "assistant";

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    const noteContext =
      useNoteContext && noteTitle !== null
        ? { title: noteTitle, content: noteContent ?? "" }
        : null;
    onSend(text, noteContext);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat-panel" style={style} role="dialog" aria-label="AI 助手对话">
      <div className="ai-chat-header">
        <div className="ai-chat-header-title">
          <span className="ai-chat-header-dot" />
          AI 助手
        </div>
        <div className="ai-chat-header-actions">
          {chats.length > 0 && (
            <select
              className="ai-chat-select"
              value={activeChatId ?? ""}
              onChange={e => onSelectChat(e.target.value)}
              aria-label="切换会话"
            >
              {chats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title || "新会话"}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="ai-chat-icon-btn" onClick={onNewChat} title="新会话">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 3v10M13 8H3" strokeLinecap="round" />
            </svg>
          </button>
          {activeChat && (
            <button
              type="button"
              className="ai-chat-icon-btn"
              onClick={() => onDeleteChat(activeChat.id)}
              title="删除当前会话"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.6 8h4.8l.6-8" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button type="button" className="ai-chat-icon-btn" onClick={onClose} title="关闭 (Esc)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {keyMissing && (
        <div className="ai-chat-notice">
          <p>尚未配置 AI 服务。需要在设置中填写 API Key 后才能对话，密钥仅保存在本机。</p>
          <button type="button" className="ai-chat-notice-btn" onClick={onOpenSettings}>
            去设置配置
          </button>
        </div>
      )}

      <div className="ai-chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            {keyMissing
              ? "配置 API Key 后即可开始对话"
              : "你好！我是 AI 助手，可以回答问题、总结润色笔记。开启「引用当前笔记」后还能针对正在编辑的内容工作。"}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ai-msg ai-msg--user">
              <div className="ai-msg-bubble">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="ai-msg ai-msg--assistant">
              {m.content ? (
                <MarkdownMessage content={m.content} />
              ) : lastAssistantStreaming && i === messages.length - 1 ? (
                <div className="ai-msg-bubble ai-msg-typing">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
            </div>
          )
        )}
        {lastAssistantStreaming && messages[messages.length - 1].content && (
          <button type="button" className="ai-chat-stop" onClick={onStop}>
            停止生成
          </button>
        )}
      </div>

      {error && <div className="ai-chat-error">{error}</div>}

      <div className="ai-chat-input-area">
        <div className="ai-chat-toolbar">
          <button
            type="button"
            className={`ai-chat-chip ${useNoteContext ? "ai-chat-chip--active" : ""}`}
            onClick={() => setUseNoteContext(v => !v)}
            disabled={noteTitle === null}
            title={
              noteTitle === null
                ? "当前没有打开的笔记"
                : "把当前笔记内容注入对话上下文（截断至 8000 字）"
            }
          >
            引用当前笔记{noteTitle ? `「${noteTitle.slice(0, 8)}」` : ""}
          </button>
          <span className="ai-chat-hint">Enter 发送 · Shift+Enter 换行</span>
        </div>
        <div className="ai-chat-input-row">
          <textarea
            className="ai-chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={keyMissing ? "请先在设置中配置 API Key…" : "输入消息…"}
            rows={2}
            disabled={keyMissing}
          />
          <button
            type="button"
            className="ai-chat-send"
            onClick={handleSend}
            disabled={keyMissing || !input.trim() || streaming}
            title="发送"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path
                d="M2.5 8l11-5.5L9.5 13.5 8 9l-5.5-1z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
