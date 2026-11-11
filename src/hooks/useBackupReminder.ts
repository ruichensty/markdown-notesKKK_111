import { useEffect, useState } from "react";

const KEY = "markdown-notes-backup-lifecycle";
const EVENT = "markdown-notes-backup-lifecycle-change";
const DAY = 86400000;
interface BackupLifecycle {
  since: number;
  confirmedAt: number | null;
  interval: number;
  snoozedUntil: number;
}
function read(): BackupLifecycle {
  const fallback = { since: Date.now(), confirmedAt: null, interval: 7, snoozedUntil: 0 };
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      !data ||
      !Number.isFinite(data.since) ||
      data.since < 0 ||
      ![0, 1, 7, 30].includes(data.interval)
    )
      return fallback;
    return {
      since: data.since,
      interval: data.interval,
      confirmedAt:
        Number.isFinite(data.confirmedAt) && data.confirmedAt > 0 ? data.confirmedAt : null,
      snoozedUntil: Number.isFinite(data.snoozedUntil) ? data.snoozedUntil : 0,
    };
  } catch {
    return fallback;
  }
}

export function useBackupReminder() {
  const [record, setRecord] = useState(read);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(read()));
    } catch {
      return;
    }
  }, []);
  useEffect(() => {
    const refresh = () => {
      setRecord(read());
      setNow(Date.now());
    };
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);
  const update = (patch: Partial<BackupLifecycle>) => {
    const next = { ...read(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    setRecord(next);
    setNow(Date.now());
    window.dispatchEvent(new Event(EVENT));
  };
  return {
    ...record,
    due:
      record.interval > 0 &&
      now >= record.snoozedUntil &&
      now - (record.confirmedAt ?? record.since) >= record.interval * DAY,
    setIntervalDays: (interval: number) => update({ interval }),
    confirmExport: () => update({ confirmedAt: Date.now(), snoozedUntil: 0 }),
    snooze: () => update({ snoozedUntil: Date.now() + DAY }),
  };
}
