import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "mdnotes-session-time";
const DAY_KEY = () => new Date().toISOString().slice(0, 10);

interface UsageData {
  date: string;
  seconds: number;
}

function loadUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: UsageData = JSON.parse(raw);
      if (data.date === DAY_KEY()) return data;
    }
  } catch {
    /* ignore */
  }
  return { date: DAY_KEY(), seconds: 0 };
}

function saveUsage(data: UsageData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function useSessionTime() {
  const [todaySeconds, setTodaySeconds] = useState(() => {
    const data = loadUsage();
    if (data.date !== DAY_KEY()) {
      saveUsage({ date: DAY_KEY(), seconds: 0 });
      return 0;
    }
    return data.seconds;
  });
  const [isRunning, setIsRunning] = useState(true);
  const prevDayRef = useRef(DAY_KEY());

  const tick = useCallback(() => {
    setTodaySeconds(prev => {
      const next = prev + 1;
      saveUsage({ date: DAY_KEY(), seconds: loadUsage().seconds + 1 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRunning, tick]);

  useEffect(() => {
    const id = setInterval(() => {
      if (DAY_KEY() !== prevDayRef.current) {
        prevDayRef.current = DAY_KEY();
        setTodaySeconds(0);
        saveUsage({ date: DAY_KEY(), seconds: 0 });
      }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

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
  };
}
