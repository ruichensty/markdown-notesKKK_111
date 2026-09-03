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

export function useHealthReminder(enabled: boolean, intervalMinutes: number, focusMode: boolean) {
  const [state, setState] = useState<HealthReminderState>({
    visible: false,
    message: { emoji: "💧", text: "喝杯水吧" },
    isSnoozed: false,
  });
  const autoCloseTimerRef = useRef<number>(0);
  const recordRef = useRef<ReminderRecord>(loadRecord());
  const sessionSecondsRef = useRef(0);
  const lastTriggeredBucketRef = useRef(-1);
  const intervalMinutesRef = useRef(intervalMinutes);
  const focusModeRef = useRef(focusMode);

  useEffect(() => {
    intervalMinutesRef.current = intervalMinutes;
  }, [intervalMinutes]);

  useEffect(() => {
    focusModeRef.current = focusMode;
  }, [focusMode]);

  const showReminder = useCallback(() => {
    const now = Date.now();
    const msg = pickMessage();
    saveRecord({
      ...recordRef.current,
      lastReminderAt: now,
      sessionSecondsAtLastReminder: sessionSecondsRef.current,
    });
    recordRef.current.lastReminderAt = now;
    recordRef.current.sessionSecondsAtLastReminder = sessionSecondsRef.current;
    setState({ visible: true, message: msg, isSnoozed: false });

    clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = window.setTimeout(() => {
      setState(prev => ({ ...prev, visible: false }));
      saveRecord({ ...recordRef.current, lastDismissedAt: Date.now() });
    }, 30_000);
  }, []);

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

    const now = Date.now();
    const initialIntervalSec = Math.max(1, intervalMinutesRef.current) * 60;
    const record = recordRef.current;

    if (lastTriggeredBucketRef.current === -1) {
      const elapsedSinceLastReminder = (now - record.lastReminderAt) / 1000;
      if (record.lastReminderAt > 0 && elapsedSinceLastReminder >= initialIntervalSec) {
        lastTriggeredBucketRef.current = 0;
        window.setTimeout(showReminder, 0);
      } else {
        lastTriggeredBucketRef.current = 0;
      }
    }

    const id = window.setInterval(() => {
      if (focusModeRef.current) return;
      sessionSecondsRef.current += 1;
      if (recordRef.current.snoozeUntil > Date.now()) return;
      const intervalSec = Math.max(1, intervalMinutesRef.current) * 60;
      const currentBucket = Math.floor(sessionSecondsRef.current / intervalSec);
      if (currentBucket > lastTriggeredBucketRef.current) {
        lastTriggeredBucketRef.current = currentBucket;
        showReminder();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [enabled, showReminder]);

  useEffect(() => {
    return () => clearTimeout(autoCloseTimerRef.current);
  }, []);

  return { ...state, dismiss, snooze };
}
