import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const STORAGE_KEY = "mdnotes-session-time";
const HISTORY_DAYS = 30;
const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_KEY = () => formatLocalDate(new Date());

interface UsageDataV2 {
  version: 2;
  days: Record<string, number>;
}

function loadUsage(): UsageDataV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UsageDataV2> & {
        date?: string;
        seconds?: number;
      };
      if (parsed.version === 2 && parsed.days && typeof parsed.days === "object") {
        return { version: 2, days: parsed.days };
      }
      if (typeof parsed.date === "string" && typeof parsed.seconds === "number") {
        return { version: 2, days: { [parsed.date]: parsed.seconds } };
      }
    }
  } catch {
    /* ignore */
  }
  return { version: 2, days: {} };
}

function pruneDays(days: Record<string, number>): Record<string, number> {
  const keys = Object.keys(days).sort();
  if (keys.length <= HISTORY_DAYS) return days;
  const next: Record<string, number> = {};
  for (const key of keys.slice(keys.length - HISTORY_DAYS)) {
    next[key] = days[key];
  }
  return next;
}

function saveUsage(data: UsageDataV2) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export interface UsageDay {
  date: string;
  seconds: number;
  label: string;
  isToday: boolean;
}

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEK_LABELS[new Date(y, m - 1, d).getDay()];
}

export function useSessionTime() {
  const [initialDays] = useState<Record<string, number>>(() => loadUsage().days);
  const [historyDays, setHistoryDays] = useState<Record<string, number>>(initialDays);
  const [todaySeconds, setTodaySeconds] = useState(() => initialDays[DAY_KEY()] ?? 0);
  const [isRunning, setIsRunning] = useState(true);
  const prevDayRef = useRef(DAY_KEY());
  const daysRef = useRef<Record<string, number>>(initialDays);

  const dirtyRef = useRef(false);

  const tick = useCallback(() => {
    setTodaySeconds(prev => prev + 1);
    dirtyRef.current = true;
  }, []);

  const persist = useCallback((dayKey: string, seconds: number) => {
    daysRef.current[dayKey] = seconds;
    const pruned = pruneDays(daysRef.current);
    daysRef.current = pruned;
    saveUsage({ version: 2, days: pruned });
    setHistoryDays(pruned);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRunning, tick]);

  useEffect(() => {
    const id = setInterval(() => {
      const currentDay = DAY_KEY();
      if (currentDay !== prevDayRef.current) {
        prevDayRef.current = currentDay;
        setTodaySeconds(0);
        persist(currentDay, 0);
      }
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setTodaySeconds(prev => {
          persist(prevDayRef.current, prev);
          return prev;
        });
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [persist]);

  const weekHistory = useMemo<UsageDay[]>(() => {
    const todayKey = DAY_KEY();
    const result: UsageDay[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatLocalDate(d);
      const isToday = key === todayKey;
      result.push({
        date: key,
        seconds: isToday ? todaySeconds : (historyDays[key] ?? 0),
        label: weekdayLabel(key),
        isToday,
      });
    }
    return result;
  }, [historyDays, todaySeconds]);

  const minutes = Math.floor(todaySeconds / 60);
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;
  const progress = Math.min(1, (todaySeconds % 3600) / 3600);

  return {
    todaySeconds,
    minutes,
    hours,
    displayMinutes,
    progress,
    isRunning,
    setIsRunning,
    formattedTime:
      hours > 0 ? `${hours}h ${String(displayMinutes).padStart(2, "0")}m` : `${displayMinutes}m`,
    progressPercent: Math.round(progress * 100),
    weekHistory,
  };
}
