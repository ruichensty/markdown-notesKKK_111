import { memo } from "react";

interface HealthReminderPopupProps {
  visible: boolean;
  message: { emoji: string; text: string };
  onDismiss: () => void;
  onSnooze: () => void;
}

function HealthReminderPopupInner({
  visible,
  message,
  onDismiss,
  onSnooze,
}: HealthReminderPopupProps) {
  if (!visible) return null;

  return (
    <div className="health-reminder-overlay">
      <div className="health-reminder-card">
        <div className="health-reminder-icon">{message.emoji}</div>
        <div className="health-reminder-body">
          <div className="health-reminder-title">健康提醒</div>
          <div className="health-reminder-text">{message.text}</div>
        </div>
        <div className="health-reminder-actions">
          <button
            type="button"
            className="health-reminder-btn health-reminder-btn-primary"
            onClick={onDismiss}
          >
            知道了
          </button>
          <button
            type="button"
            className="health-reminder-btn health-reminder-btn-secondary"
            onClick={() => onSnooze()}
          >
            5 分钟后再说
          </button>
        </div>
      </div>
    </div>
  );
}

export const HealthReminderPopup = memo(HealthReminderPopupInner);
export default HealthReminderPopup;
