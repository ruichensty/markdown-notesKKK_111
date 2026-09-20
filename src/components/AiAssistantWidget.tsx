import { useCallback, useEffect, useRef, useState } from "react";
import { useAiChat } from "@hooks/useAiChat";
import { useSpeech } from "@hooks/useSpeech";
import { AiChatPanel, type TtsPanelConfig } from "./AiChatPanel";
import { AvatarRenderer } from "./avatar/AvatarRenderer";
import type { AvatarAnimation, AvatarMode, AvatarSkin, AvatarState } from "@types";
import type { AiQuickPrompt } from "../constants/aiPrompts";

const BOT_SIZE = 56;
const EDGE_MARGIN = 8;
const TIP_WIDTH = 220;
const TIP_GAP = 12;

export interface AiAssistantWidgetProps {
  hidden: boolean;
  noteTitle: string | null;
  noteContent: string | null;
  avatarMode: AvatarMode;
  avatarSkin: AvatarSkin;
  avatarCustomImageId: string | null;
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
  avatarSkin,
  avatarCustomImageId,
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
  const [hovered, setHovered] = useState(false);
  const [hoverGrace, setHoverGrace] = useState(false);
  const [tipVisible, setTipVisible] = useState(true);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [celebrating, setCelebrating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const botRef = useRef<HTMLDivElement>(null);
  const lastStreamingRef = useRef(false);
  const hoverGraceTimerRef = useRef(0);
  const dragCleanupRef = useRef<(() => void) | null>(null);

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
  const tipEligible = avatarTips && !avatarTipDismissed && !panelOpen;
  const showTip = tipEligible && (tipVisible || hovered || hoverGrace);
  const tipOnLeft = botPos.x > viewport.width / 2;
  const tipLeft = tipOnLeft
    ? Math.max(8, botPos.x - TIP_WIDTH - TIP_GAP)
    : Math.min(viewport.width - TIP_WIDTH - 8, botPos.x + BOT_SIZE + TIP_GAP);
  const tipTop = Math.min(Math.max(8, botPos.y - 8), Math.max(8, viewport.height - 92));

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
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setBotPos(prev => clampPos(prev.x, prev.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(hoverGraceTimerRef.current);
      dragCleanupRef.current?.();
      document.body.style.userSelect = "";
    };
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  useEffect(() => {
    if (!tipEligible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets a transient timed bubble when the contextual tip changes
    setTipVisible(true);
    const timer = window.setTimeout(() => setTipVisible(false), 8000);
    return () => window.clearTimeout(timer);
  }, [tipEligible, tipText]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      dragCleanupRef.current?.();
      const startX = e.clientX;
      const startY = e.clientY;
      const origin = botPos;
      const previousUserSelect = document.body.style.userSelect;
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > 5) {
          moved = true;
          setDragging(true);
        }
        if (moved) {
          setBotPos(clampPos(origin.x + dx, origin.y + dy));
        }
      };

      const cleanup = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onCancel);
        document.body.style.userSelect = previousUserSelect;
        dragCleanupRef.current = null;
      };

      const finish = (ev: PointerEvent, cancelled: boolean) => {
        cleanup();
        setDragging(false);
        if (cancelled) return;
        if (moved) {
          onPosChange(clampPos(origin.x + (ev.clientX - startX), origin.y + (ev.clientY - startY)));
        } else {
          setPanelOpen(o => !o);
        }
      };

      const onUp = (ev: PointerEvent) => finish(ev, false);
      const onCancel = (ev: PointerEvent) => finish(ev, true);

      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onCancel);
      dragCleanupRef.current = cleanup;
    },
    [botPos, onPosChange]
  );

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    window.requestAnimationFrame(() => botRef.current?.focus());
  }, []);

  const handleTipHoverEnter = useCallback(() => {
    window.clearTimeout(hoverGraceTimerRef.current);
    setHoverGrace(false);
    setHovered(true);
  }, []);

  const handleTipHoverLeave = useCallback(() => {
    setHovered(false);
    setHoverGrace(true);
    window.clearTimeout(hoverGraceTimerRef.current);
    hoverGraceTimerRef.current = window.setTimeout(() => setHoverGrace(false), 220);
  }, []);

  if (hidden) return null;

  return (
    <>
      <div
        ref={botRef}
        className={`ai-bot ai-bot--${avatarMode} ai-bot--skin-${avatarSkin} ai-bot--${avatarState} ${chat.streaming ? "ai-bot--thinking" : ""} ${dragging ? "ai-bot--dragging" : ""}`}
        data-animation={avatarAnimation}
        style={{ left: botPos.x, top: botPos.y, width: BOT_SIZE, height: BOT_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerEnter={handleTipHoverEnter}
        onPointerLeave={handleTipHoverLeave}
        onKeyDown={e => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          setPanelOpen(open => !open);
        }}
        role="button"
        tabIndex={0}
        aria-expanded={panelOpen}
        aria-controls="ai-assistant-dialog"
        aria-label="AI 助手，点击打开对话，可拖动"
        title={`${avatarMode === "cyber-girl" ? "赛博少女" : avatarMode === "cat" ? "灵感猫" : avatarMode === "custom-image" ? "自定义伙伴" : "机器人"}：点击对话，按住拖动`}
      >
        <AvatarRenderer mode={avatarMode} state={avatarState} customImageId={avatarCustomImageId} />
        {keyMissing && <span className="ai-bot-badge" title="尚未配置 API Key" />}
      </div>

      {showTip && (
        <div
          className={`ai-avatar-tip ${tipOnLeft ? "ai-avatar-tip--left" : "ai-avatar-tip--right"}`}
          style={{ left: tipLeft, top: tipTop }}
          onPointerEnter={handleTipHoverEnter}
          onPointerLeave={handleTipHoverLeave}
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
          onClose={handleClosePanel}
          onOpenSettings={onOpenSettings}
        />
      )}
    </>
  );
}
