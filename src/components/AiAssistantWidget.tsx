import { useCallback, useEffect, useState } from "react";
import { useAiChat } from "@hooks/useAiChat";
import { AiChatPanel } from "./AiChatPanel";

const BOT_SIZE = 56;
const EDGE_MARGIN = 8;

export interface AiAssistantWidgetProps {
  hidden: boolean;
  noteTitle: string | null;
  noteContent: string | null;
  config: { baseUrl: string; apiKey: string; model: string };
  pos: { x: number; y: number } | null;
  onPosChange: (pos: { x: number; y: number }) => void;
  onOpenSettings: () => void;
}

function defaultPos(): { x: number; y: number } {
  return {
    x: Math.max(EDGE_MARGIN, window.innerWidth - BOT_SIZE - 16),
    y: Math.max(EDGE_MARGIN, window.innerHeight - BOT_SIZE - 128),
  };
}

function clampPos(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(
      Math.max(EDGE_MARGIN, x),
      Math.max(EDGE_MARGIN, window.innerWidth - BOT_SIZE - EDGE_MARGIN)
    ),
    y: Math.min(
      Math.max(EDGE_MARGIN, y),
      Math.max(EDGE_MARGIN, window.innerHeight - BOT_SIZE - EDGE_MARGIN)
    ),
  };
}

export function AiAssistantWidget({
  hidden,
  noteTitle,
  noteContent,
  config,
  pos,
  onPosChange,
  onOpenSettings,
}: AiAssistantWidgetProps) {
  const [botPos, setBotPos] = useState<{ x: number; y: number }>(() =>
    pos ? clampPos(pos.x, pos.y) : defaultPos()
  );
  const [panelOpen, setPanelOpen] = useState(false);

  const chat = useAiChat(config);
  const keyMissing = !config.apiKey.trim() || !config.baseUrl.trim();

  /* eslint-disable react-hooks/set-state-in-effect -- sync persisted widget position from settings */
  useEffect(() => {
    if (pos) {
      setBotPos(prev => (prev.x === pos.x && prev.y === pos.y ? prev : clampPos(pos.x, pos.y)));
    } else {
      setBotPos(defaultPos());
    }
  }, [pos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const onResize = () => {
      setBotPos(prev => clampPos(prev.x, prev.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const origin = botPos;
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > 5) {
          moved = true;
        }
        if (moved) {
          setBotPos(clampPos(origin.x + dx, origin.y + dy));
        }
      };
      const onUp = (ev: PointerEvent) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
        if (moved) {
          onPosChange(clampPos(origin.x + (ev.clientX - startX), origin.y + (ev.clientY - startY)));
        } else {
          setPanelOpen(o => !o);
        }
      };
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [botPos, onPosChange]
  );

  if (hidden) return null;

  return (
    <>
      <div
        className={`ai-bot ${chat.streaming ? "ai-bot--thinking" : ""}`}
        style={{ left: botPos.x, top: botPos.y, width: BOT_SIZE, height: BOT_SIZE }}
        onPointerDown={handlePointerDown}
        role="button"
        aria-label="AI 助手，点击打开对话，可拖动"
        title="AI 助手：点击对话，按住拖动"
      >
        <svg viewBox="0 0 64 64" fill="none" className="ai-bot-svg">
          <line
            x1="32"
            y1="6"
            x2="32"
            y2="12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="32" cy="5" r="3" fill="currentColor" className="ai-bot-antenna" />
          <rect x="10" y="12" width="44" height="32" rx="12" fill="currentColor" opacity="0.16" />
          <rect
            x="10"
            y="12"
            width="44"
            height="32"
            rx="12"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <g className="ai-bot-eyes">
            <circle cx="24" cy="27" r="3.4" fill="currentColor" />
            <circle cx="40" cy="27" r="3.4" fill="currentColor" />
          </g>
          <path
            d="M26 34.5q6 4 12 0"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <g className="ai-bot-arms">
            <path
              d="M10 30H4m6 6H6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M54 30h6m-6 6h4"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
          <rect x="22" y="48" width="20" height="8" rx="4" fill="currentColor" opacity="0.16" />
          <rect
            x="22"
            y="48"
            width="20"
            height="8"
            rx="4"
            stroke="currentColor"
            strokeWidth="2.2"
          />
        </svg>
        {keyMissing && <span className="ai-bot-badge" title="尚未配置 API Key" />}
      </div>

      {panelOpen && (
        <AiChatPanel
          anchor={botPos}
          noteTitle={noteTitle}
          noteContent={noteContent}
          keyMissing={keyMissing}
          chats={chat.chats}
          activeChat={chat.activeChat}
          activeChatId={chat.activeChatId}
          onSelectChat={chat.setActiveChatId}
          streaming={chat.streaming}
          error={chat.error}
          onSend={chat.send}
          onStop={chat.stop}
          onNewChat={chat.newChat}
          onDeleteChat={chat.deleteChat}
          onClose={() => setPanelOpen(false)}
          onOpenSettings={onOpenSettings}
        />
      )}
    </>
  );
}
