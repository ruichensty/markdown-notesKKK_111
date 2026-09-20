import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiChat } from "@types";
import type { SpeechController } from "@hooks/useSpeech";
import type { AiQuickPrompt } from "../constants/aiPrompts";

export interface TtsPanelConfig {
  engine: "browser" | "api";
  auto: boolean;
  browser: { voiceName: string; rate: number };
  api: { baseUrl: string; apiKey: string; model: string; voice: string; speed: number };
}

interface AiChatPanelProps {
  anchor: { x: number; y: number };
  noteTitle: string | null;
  noteContent: string | null;
  keyMissing: boolean;
  tts: TtsPanelConfig;
  speech: SpeechController;
  quickPrompts: AiQuickPrompt[];
  onToggleTtsAuto: () => void;
  onToggleTtsEngine: () => void;
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
const PANEL_MAX_HEIGHT = 520;
const VIEWPORT_MARGIN = 8;
const BOTTOM_THRESHOLD = 56;

interface ViewportBounds {
  width: number;
  height: number;
  left: number;
  top: number;
}

const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="ai-msg-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
});

function getViewportBounds(): ViewportBounds {
  const viewport = window.visualViewport;
  return viewport
    ? {
        width: viewport.width,
        height: viewport.height,
        left: viewport.offsetLeft,
        top: viewport.offsetTop,
      }
    : { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
}

function panelStyle(
  anchor: { x: number; y: number },
  viewport: ViewportBounds
): React.CSSProperties {
  const right = viewport.left + viewport.width;
  const bottom = viewport.top + viewport.height;
  const width = Math.max(0, Math.min(PANEL_WIDTH, viewport.width - VIEWPORT_MARGIN * 2));
  const height = Math.max(0, Math.min(PANEL_MAX_HEIGHT, viewport.height - VIEWPORT_MARGIN * 2));
  const left =
    anchor.x > viewport.left + viewport.width / 2
      ? Math.max(viewport.left + VIEWPORT_MARGIN, anchor.x - width - 12)
      : Math.min(right - width - VIEWPORT_MARGIN, anchor.x + 68);
  const top = Math.min(
    Math.max(viewport.top + VIEWPORT_MARGIN, anchor.y - 40),
    bottom - height - VIEWPORT_MARGIN
  );
  return { left, top, width, height };
}

export function AiChatPanel(props: AiChatPanelProps) {
  const {
    anchor,
    noteTitle,
    noteContent,
    keyMissing,
    tts,
    speech,
    quickPrompts,
    onToggleTtsAuto,
    onToggleTtsEngine,
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
  const [quickOpen, setQuickOpen] = useState(false);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [viewport, setViewport] = useState<ViewportBounds>(getViewportBounds);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const followOutputRef = useRef(true);
  const { supported: ttsSupported, speakMessage, stop: stopSpeech, speechError } = speech;
  const autoReadKeysRef = useRef<Set<string>>(new Set());
  const style = panelStyle(anchor, viewport);

  const messages = useMemo(() => activeChat?.messages ?? [], [activeChat]);
  const ttsAvailable = ttsSupported || tts.engine === "api";
  const apiReady = tts.api.apiKey.trim() !== "" && tts.api.baseUrl.trim() !== "";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (keyMissing) settingsButtonRef.current?.focus();
      else inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [keyMissing]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const handleViewportChange = () => setViewport(getViewportBounds());
    window.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("scroll", handleViewportChange);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    return () => stopSpeech();
  }, [stopSpeech]);

  useEffect(() => {
    if (!tts.auto || streaming || !ttsAvailable || keyMissing) return;
    if (tts.engine === "api" && !apiReady) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    const key = `${activeChatId}:${messages.length - 1}`;
    if (autoReadKeysRef.current.has(key)) return;
    autoReadKeysRef.current.add(key);
    speakMessage(key, last.content, {
      engine: tts.engine,
      browser: tts.browser,
      api: tts.api,
    });
  }, [
    messages,
    streaming,
    tts.auto,
    tts.engine,
    tts.browser,
    tts.api,
    ttsAvailable,
    apiReady,
    activeChatId,
    keyMissing,
    speakMessage,
  ]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && followOutputRef.current) list.scrollTop = list.scrollHeight;
  }, [activeChat?.messages, streaming]);

  const lastAssistantStreaming =
    streaming && messages.length > 0 && messages[messages.length - 1].role === "assistant";

  useEffect(() => {
    if (!quickOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setQuickOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [quickOpen]);

  useEffect(() => {
    if (!pendingDeleteChatId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setPendingDeleteChatId(null);
      window.requestAnimationFrame(() => deleteButtonRef.current?.focus());
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pendingDeleteChatId]);

  const sendPrompt = (prompt: AiQuickPrompt) => {
    if (streaming || keyMissing) return;
    if (prompt.needsNote && (!useNoteContext || noteTitle === null)) return;
    setQuickOpen(false);
    followOutputRef.current = true;
    setShowJumpToLatest(false);
    const noteContext =
      useNoteContext && noteTitle !== null
        ? { title: noteTitle, content: noteContent ?? "" }
        : null;
    onSend(prompt.text, noteContext);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    const noteContext =
      useNoteContext && noteTitle !== null
        ? { title: noteTitle, content: noteContent ?? "" }
        : null;
    followOutputRef.current = true;
    setShowJumpToLatest(false);
    onSend(text, noteContext);
    setInput("");
  };

  const handleListScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const awayFromBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight > BOTTOM_THRESHOLD;
    followOutputRef.current = !awayFromBottom;
    setShowJumpToLatest(awayFromBottom);
  };

  const scrollToLatest = () => {
    followOutputRef.current = true;
    setShowJumpToLatest(false);
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  };

  const confirmDeleteChat = () => {
    if (!pendingDeleteChatId) return;
    followOutputRef.current = true;
    setShowJumpToLatest(false);
    onDeleteChat(pendingDeleteChatId);
    setPendingDeleteChatId(null);
  };

  const requestDeleteChat = (id: string) => {
    setPendingDeleteChatId(id);
    window.requestAnimationFrame(() => cancelDeleteButtonRef.current?.focus());
  };

  const cancelDeleteChat = () => {
    setPendingDeleteChatId(null);
    window.requestAnimationFrame(() => deleteButtonRef.current?.focus());
  };

  const handleSelectChat = (id: string) => {
    followOutputRef.current = true;
    setShowJumpToLatest(false);
    setPendingDeleteChatId(null);
    onSelectChat(id);
  };

  const handleNewChat = () => {
    followOutputRef.current = true;
    setShowJumpToLatest(false);
    setPendingDeleteChatId(null);
    onNewChat();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      id="ai-assistant-dialog"
      className="ai-chat-panel"
      style={style}
      role="dialog"
      aria-labelledby="ai-chat-title"
    >
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {streaming
          ? "AI 正在生成回复"
          : speech.speakingKey
            ? "正在朗读 AI 回复"
            : error || speechError || "AI 助手已就绪"}
      </div>
      <div className="ai-chat-header">
        <div id="ai-chat-title" className="ai-chat-header-title">
          <span className="ai-chat-header-dot" />
          AI 助手
        </div>
        <div className="ai-chat-header-actions">
          {chats.length > 0 && (
            <select
              className="ai-chat-select"
              value={activeChatId ?? ""}
              onChange={e => handleSelectChat(e.target.value)}
              aria-label="切换会话"
            >
              {activeChatId === null && (
                <option value="" disabled>
                  新会话
                </option>
              )}
              {chats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title || "新会话"}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="ai-chat-icon-btn"
            onClick={handleNewChat}
            title="新会话"
            aria-label="新建会话"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 3v10M13 8H3" strokeLinecap="round" />
            </svg>
          </button>
          {activeChat && (
            <button
              ref={deleteButtonRef}
              type="button"
              className="ai-chat-icon-btn"
              onClick={() => requestDeleteChat(activeChat.id)}
              title="删除当前会话"
              aria-label="删除当前会话"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.6 8h4.8l.6-8" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="ai-chat-icon-btn"
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            title="关闭 (Esc)"
            aria-label="关闭 AI 助手"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {pendingDeleteChatId && (
        <div className="ai-chat-confirm" role="alertdialog" aria-label="确认删除当前会话">
          <span>删除当前会话？此操作无法撤销。</span>
          <div className="ai-chat-confirm-actions">
            <button ref={cancelDeleteButtonRef} type="button" onClick={cancelDeleteChat}>
              取消
            </button>
            <button type="button" className="ai-chat-confirm-delete" onClick={confirmDeleteChat}>
              删除
            </button>
          </div>
        </div>
      )}

      {keyMissing && (
        <div className="ai-chat-notice">
          <p>尚未配置 AI 服务。需要在设置中填写 API Key 后才能对话，密钥仅保存在本机。</p>
          <button
            ref={settingsButtonRef}
            type="button"
            className="ai-chat-notice-btn"
            onClick={onOpenSettings}
          >
            去设置配置
          </button>
        </div>
      )}

      <div className="ai-chat-list" ref={listRef} onScroll={handleListScroll}>
        {messages.length === 0 && (
          <>
            <div className="ai-chat-empty">
              {keyMissing
                ? "配置 API Key 后即可开始对话"
                : "你好！我是 AI 助手，可以回答问题、总结润色笔记。开启「引用当前笔记」后还能针对正在编辑的内容工作。"}
            </div>
            {!keyMissing && quickPrompts.length > 0 && (
              <div className="ai-quick-grid">
                {quickPrompts.slice(0, 8).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="ai-quick-chip"
                    onClick={() => sendPrompt(p)}
                    disabled={
                      streaming || (p.needsNote === true && (!useNoteContext || noteTitle === null))
                    }
                    title={
                      p.needsNote && noteTitle === null
                        ? `${p.text}（当前未打开笔记）`
                        : p.needsNote && !useNoteContext
                          ? "请先开启“引用当前笔记”"
                          : p.text
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            {!keyMissing &&
              quickPrompts.some(prompt => prompt.needsNote) &&
              noteTitle !== null &&
              !useNoteContext && (
                <div className="ai-chat-context-note">
                  开启“引用当前笔记”后，可使用总结、润色等笔记操作
                </div>
              )}
          </>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ai-msg ai-msg--user">
              <div className="ai-msg-bubble">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="ai-msg ai-msg--assistant">
              {m.content ? (
                <>
                  <MarkdownMessage content={m.content} />
                  {ttsAvailable && (ttsSupported || apiReady) && (
                    <button
                      type="button"
                      className={`ai-msg-speak ${
                        speech.speakingKey === `${activeChatId}:${i}` ? "ai-msg-speak--active" : ""
                      }`}
                      onClick={() =>
                        speakMessage(`${activeChatId}:${i}`, m.content, {
                          engine: tts.engine,
                          browser: tts.browser,
                          api: tts.api,
                        })
                      }
                      title={
                        speech.speakingKey === `${activeChatId}:${i}`
                          ? "停止朗读"
                          : `朗读此消息（${tts.engine === "api" ? "云端语音" : "浏览器语音"}）`
                      }
                      aria-label={
                        speech.speakingKey === `${activeChatId}:${i}`
                          ? "停止朗读此回复"
                          : "朗读此 AI 回复"
                      }
                    >
                      {speech.speakingKey === `${activeChatId}:${i}` ? (
                        <svg viewBox="0 0 16 16" fill="currentColor">
                          <rect x="4" y="4" width="8" height="8" rx="1.5" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        >
                          <path
                            d="M3 6.5v3h2.2L9 12.5v-9L5.2 6.5H3z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M11 6q1.4 2 0 4M12.8 4.5q2.2 3.5 0 7" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </>
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
      </div>

      {streaming && (
        <button type="button" className="ai-chat-stop" onClick={onStop}>
          停止生成
        </button>
      )}

      {showJumpToLatest && (
        <button type="button" className="ai-chat-jump-latest" onClick={scrollToLatest}>
          ↓ 回到最新
        </button>
      )}

      {error && (
        <div className="ai-chat-error" role="alert">
          {error}
        </div>
      )}
      {speechError && (
        <div className="ai-chat-error" role="alert">
          {speechError}
        </div>
      )}

      <div className="ai-chat-input-area">
        <div className="ai-chat-toolbar">
          <button
            type="button"
            className={`ai-chat-chip ${useNoteContext ? "ai-chat-chip--active" : ""}`}
            onClick={() => setUseNoteContext(v => !v)}
            disabled={noteTitle === null}
            aria-pressed={useNoteContext}
            title={
              noteTitle === null
                ? "当前没有打开的笔记"
                : "把当前笔记内容注入对话上下文（截断至 8000 字）"
            }
          >
            引用当前笔记{noteTitle ? `「${noteTitle.slice(0, 8)}」` : ""}
          </button>
          {messages.length > 0 && quickPrompts.length > 0 && !keyMissing && (
            <div className="ai-quick-anchor">
              <button
                type="button"
                className={`ai-chat-chip ${quickOpen ? "ai-chat-chip--active" : ""}`}
                onClick={() => setQuickOpen(o => !o)}
                disabled={streaming}
                aria-expanded={quickOpen}
                aria-controls="ai-quick-prompt-menu"
                title="快捷提问：点击选择预设问题直接发送"
              >
                ⚡ 快捷
              </button>
              {quickOpen && (
                <>
                  <div className="ai-quick-backdrop" onClick={() => setQuickOpen(false)} />
                  <div
                    id="ai-quick-prompt-menu"
                    className="ai-quick-popover"
                    role="menu"
                    aria-label="快捷提问"
                  >
                    {quickPrompts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="ai-quick-item"
                        onClick={() => sendPrompt(p)}
                        disabled={
                          streaming ||
                          (p.needsNote === true && (!useNoteContext || noteTitle === null))
                        }
                        role="menuitem"
                        title={
                          p.needsNote && noteTitle === null
                            ? "当前没有打开的笔记"
                            : p.needsNote && !useNoteContext
                              ? "请先开启“引用当前笔记”"
                              : p.text
                        }
                      >
                        <span className="ai-quick-item-label">{p.label}</span>
                        <span className="ai-quick-item-text">{p.text}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {ttsAvailable && (
            <button
              type="button"
              className={`ai-chat-chip ${tts.engine === "api" ? "ai-chat-chip--active" : ""}`}
              onClick={() => {
                if (tts.engine === "browser" && !apiReady) {
                  stopSpeech();
                  onOpenSettings();
                  return;
                }
                stopSpeech();
                onToggleTtsEngine();
              }}
              title={
                tts.engine === "browser"
                  ? `当前：浏览器语音，点击切换到云端语音${apiReady ? "" : "（未配置，将打开设置）"}`
                  : "当前：云端语音，点击切回浏览器语音"
              }
              aria-label={`切换语音引擎，当前为${tts.engine === "api" ? "云端语音" : "浏览器语音"}`}
            >
              {tts.engine === "browser" ? "🔊 浏览器语音" : "☁️ 云端语音"}
            </button>
          )}
          {ttsAvailable && (
            <button
              type="button"
              className={`ai-chat-chip ${tts.auto ? "ai-chat-chip--active" : ""}`}
              onClick={onToggleTtsAuto}
              title="AI 回复完成后自动朗读（引擎、音色与语速在设置中调整）"
              aria-pressed={tts.auto}
            >
              自动朗读
            </button>
          )}
          <span className="ai-chat-hint">Enter 发送 · Shift+Enter 换行</span>
        </div>
        <div className="ai-chat-input-row">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={keyMissing ? "请先在设置中配置 API Key…" : "输入消息…"}
            rows={2}
            disabled={keyMissing}
            aria-label="发送给 AI 助手的消息"
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
