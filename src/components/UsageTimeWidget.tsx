import { memo, useState, useEffect } from "react";
import { useSessionTime } from "@hooks";

interface UsageTimeWidgetProps {
  hidden?: boolean;
}

function TimeRing({ progress, isRunning }: { progress: number; isRunning: boolean }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const [dashOffset, setDashOffset] = useState(offset);

  useEffect(() => {
    setDashOffset(offset);
  }, [offset]);

  return (
    <svg className="usage-time-ring" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="hsl(var(--muted-foreground) / 0.08)"
        strokeWidth="2.5"
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="hsl(var(--primary) / 0.6)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="usage-time-ring-progress"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      {isRunning && (
        <circle
          cx="20"
          cy="4"
          r="2"
          fill="hsl(var(--primary))"
          className="usage-time-pulse-dot"
          opacity="0"
        >
          <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
          <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

function UsageTimeWidgetInner({ hidden }: UsageTimeWidgetProps) {
  const { hours, displayMinutes, progress, isRunning, setIsRunning, formattedTime, todaySeconds } =
    useSessionTime();

  const [expanded, setExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);

  if (hidden) return null;

  const timeLabel =
    hours > 0 ? `${hours}:${String(displayMinutes).padStart(2, "0")}` : `${displayMinutes}m`;

  return (
    <div
      className="usage-time-widget"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        className="usage-time-trigger"
        onClick={() => setExpanded(e => !e)}
        title="今日使用时长"
      >
        <TimeRing progress={progress} isRunning={isRunning} />
        <span className="usage-time-label">{timeLabel}</span>
      </button>

      {(expanded || hovering) && (
        <div className="usage-time-tooltip">
          <div className="usage-time-tooltip-row">
            <span className="usage-time-tooltip-title">今日已投入</span>
            <span className="usage-time-tooltip-value">{formattedTime}</span>
          </div>
          <div className="usage-time-tooltip-row">
            <span className="usage-time-tooltip-title">进度</span>
            <span className="usage-time-tooltip-value">
              {Math.floor(todaySeconds / 60)} / 60 min
            </span>
          </div>
          <div className="usage-time-tooltip-bar">
            <div
              className="usage-time-tooltip-bar-fill"
              style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
            />
          </div>
          <button
            type="button"
            className="usage-time-pause-btn"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? "暂停计时" : "继续计时"}
          </button>
        </div>
      )}
    </div>
  );
}

export const UsageTimeWidget = memo(UsageTimeWidgetInner);
export default UsageTimeWidget;
