import { useCallback, useEffect, useRef, useState } from "react";
import { useAiChat } from "@hooks/useAiChat";
import { useSpeech } from "@hooks/useSpeech";
import { AiChatPanel, type TtsPanelConfig } from "./AiChatPanel";
import { AvatarRenderer } from "./avatar/AvatarRenderer";
import type { AvatarAnimation, AvatarMode, AvatarState } from "./avatar/types";
import type { AiQuickPrompt } from "../constants/aiPrompts";

const BOT_SIZE = 56;
const EDGE_MARGIN = 8;

export interface AiAssistantWidgetProps {
  hidden: boolean;
  noteTitle: string | null;
  noteContent: string | null;
  avatarMode: AvatarMode;
  avatarTips: boolean;
  avatarTipDismissed: boolean;
  avatarAnimation: AvatarAnimation;
  config: { baseUrl: string; apiKey: string; model: string };
  tts: TtsPanelConfig;
  quickPrompts: AiQuickPrompt[];
  onToggleTtsAuto: () => void;
  onToggleTtsEngine: () => void;
  pos: { x: number; y: number } | null;
  onPosChange: (pos: { x: number; y: number }) => void;
  onDismissAvatarTip: () => void;
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
  avatarMode,
  avatarTips,
  avatarTipDismissed,
  avatarAnimation,
  config,
  tts,
  quickPrompts,
  onToggleTtsAuto,
  onToggleTtsEngine,
  pos,
  onPosChange,
  onDismissAvatarTip,
  onOpenSettings,
}: AiAssistantWidgetProps) {
  const [botPos, setBotPos] = useState<{ x: number; y: number }>(() =>
    pos ? clampPos(pos.x, pos.y) : defaultPos()
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const lastStreamingRef = useRef(false);

  const chat = useAiChat(config);
  const speech = useSpeech();
  const keyMissing = !config.apiKey.trim() || !config.baseUrl.trim();
  const avatarState: AvatarState = keyMissing
    ? "disabled"
    : chat.error
      ? "error"
      : speech.speakingKey
        ? "speaking"
        : chat.streaming
          ? "thinking"
          : celebrating
            ? "happy"
            : panelOpen && !noteTitle
              ? "confused"
              : "idle";

  const tipText = keyMissing
    ? "先配置 API Key，我就能开始帮你写作啦"
    : noteContent && noteContent.length > 1600
      ? "这篇笔记有点长，要我帮你提炼大纲吗？"
      : !noteTitle
        ? "打开一篇笔记后，我可以帮你总结、润色和提取待办"
        : "需要我帮你总结或润色当前笔记吗？";
  const showTip = avatarTips && !avatarTipDismissed && !panelOpen;

  useEffect(() => {
    if (lastStreamingRef.current && !chat.streaming && !chat.error && !keyMissing) {
      setCelebrating(true);
    }
    lastStreamingRef.current = chat.streaming;
  }, [chat.streaming, chat.error, keyMissing]);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 1800);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

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
        className={`ai-bot ai-bot--${avatarMode} ai-bot--${avatarState} ${chat.streaming ? "ai-bot--thinking" : ""}`}
        data-animation={avatarAnimation}
        style={{ left: botPos.x, top: botPos.y, width: BOT_SIZE, height: BOT_SIZE }}
        onPointerDown={handlePointerDown}
        role="button"
        aria-label="AI 助手，点击打开对话，可拖动"
        title={`${avatarMode === "cyber-girl" ? "赛博少女" : "AI 助手"}：点击对话，按住拖动`}
      >
        <AvatarRenderer mode={avatarMode} state={avatarState} />
        {keyMissing && <span className="ai-bot-badge" title="尚未配置 API Key" />}
      </div>

      {showTip && (
        <div
          className="ai-avatar-tip"
          style={{ left: Math.max(8, botPos.x - 232), top: Math.max(8, botPos.y - 8) }}
        >
          <button
            type="button"
            className="ai-avatar-tip-close"
            onClick={onDismissAvatarTip}
            title="不再显示提示"
          >
            ×
          </button>
          <span>{tipText}</span>
        </div>
      )}

      {panelOpen && (
        <AiChatPanel
          anchor={botPos}
          noteTitle={noteTitle}
          noteContent={noteContent}
          keyMissing={keyMissing}
          tts={tts}
          speech={speech}
          quickPrompts={quickPrompts}
          onToggleTtsAuto={onToggleTtsAuto}
          onToggleTtsEngine={onToggleTtsEngine}
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
