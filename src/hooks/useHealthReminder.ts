import { useState, useEffect, useRef, useCallback } from "react";

const REMINDER_KEY = "mdnotes-health-reminder";

interface ReminderRecord {
  lastReminderAt: number;
  lastDismissedAt: number;
  snoozeUntil: number;
  sessionSecondsAtLastReminder: number;
}

function loadRecord(): ReminderRecord {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { lastReminderAt: 0, lastDismissedAt: 0, snoozeUntil: 0, sessionSecondsAtLastReminder: 0 };
}

function saveRecord(data: ReminderRecord) {
  try {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const MESSAGES = [
  { emoji: "💧", text: "已经专注 1 小时了，起来喝杯水吧" },
  { emoji: "🧠", text: "该补充水分了，你的大脑需要它" },
  { emoji: "🌿", text: "休息 2 分钟，倒杯水，活动活动肩颈" },
  { emoji: "✋", text: "连续输入很久了，该让手指也休息一下" },
  { emoji: "👀", text: "去窗边看看远处，眼睛会感谢你" },
  { emoji: "🚶", text: "站起来走几步，血液循环需要动一动" },
  { emoji: "☀️", text: "伸个懒腰，呼吸一下新鲜空气" },
  { emoji: "🎯", text: "休息是为了更好地专注，放松一下" },
];

function pickMessage(): { emoji: string; text: string } {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

interface HealthReminderState {
  visible: boolean;
  message: { emoji: string; text: string };
  isSnoozed: boolean;
}

export function useHealthReminder(
  enabled: boolean,
  intervalMinutes: number,
  sessionSeconds: number,
  focusMode: boolean
) {
  const [state, setState] = useState<HealthReminderState>({
    visible: false,
    message: { emoji: "💧", text: "喝杯水吧" },
    isSnoozed: false,
  });
  const autoCloseTimerRef = useRef<number>(0);
  const recordRef = useRef<ReminderRecord>(loadRecord());
  const lastTriggeredSessionMinRef = useRef(-1);

  const showReminder = useCallback(() => {
    const now = Date.now();
    const msg = pickMessage();
    saveRecord({
      ...recordRef.current,
      lastReminderAt: now,
      sessionSecondsAtLastReminder: sessionSeconds,
    });
    recordRef.current.lastReminderAt = now;
    recordRef.current.sessionSecondsAtLastReminder = sessionSeconds;
    setState({ visible: true, message: msg, isSnoozed: false });

    clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = window.setTimeout(() => {
      setState(prev => ({ ...prev, visible: false }));
      saveRecord({ ...recordRef.current, lastDismissedAt: Date.now() });
    }, 30_000);
  }, [sessionSeconds]);

  const dismiss = useCallback(() => {
    clearTimeout(autoCloseTimerRef.current);
    setState(prev => ({ ...prev, visible: false }));
    saveRecord({ ...recordRef.current, lastDismissedAt: Date.now() });
  }, []);

  const snooze = useCallback((minutes = 5) => {
    clearTimeout(autoCloseTimerRef.current);
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    saveRecord({ ...recordRef.current, snoozeUntil, lastDismissedAt: Date.now() });
    recordRef.current.snoozeUntil = snoozeUntil;
    setState(prev => ({ ...prev, visible: false, isSnoozed: true }));
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimeout(autoCloseTimerRef.current);
      queueMicrotask(() => {
        setState({ visible: false, message: { emoji: "", text: "" }, isSnoozed: false });
      });
      return;
    }

    if (focusMode) return;

    const now = Date.now();
    const record = recordRef.current;
    const intervalSec = intervalMinutes * 60;

    if (record.snoozeUntil > now) return;

    if (lastTriggeredSessionMinRef.current === -1) {
      const elapsedSinceLastReminder = (now - record.lastReminderAt) / 1000;
      if (elapsedSinceLastReminder >= intervalSec && record.lastReminderAt > 0) {
        lastTriggeredSessionMinRef.current = Math.floor(sessionSeconds / intervalSec);
        window.setTimeout(showReminder, 0);
        return;
      }
      lastTriggeredSessionMinRef.current = Math.floor(sessionSeconds / intervalSec);
    }

    const currentBucket = Math.floor(sessionSeconds / intervalSec);
    if (currentBucket > lastTriggeredSessionMinRef.current) {
      lastTriggeredSessionMinRef.current = currentBucket;
      window.setTimeout(showReminder, 0);
    }
  }, [enabled, focusMode, intervalMinutes, sessionSeconds, showReminder]);

  useEffect(() => {
    return () => clearTimeout(autoCloseTimerRef.current);
  }, []);

  return { ...state, dismiss, snooze };
}
