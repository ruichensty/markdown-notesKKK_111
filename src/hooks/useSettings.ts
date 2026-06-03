import { useState, useCallback, useEffect } from "react";
import { idbGetSetting, idbSetSetting } from "@utils/indexedDBStorage";

export interface Settings {
  fontSize: "sm" | "md" | "lg" | number;
  autoSave: boolean;
  showLineNumbers: boolean;
  lineHeight: number;
  sidebarWidth: number;
  focusMode: boolean;
  typewriterMode: boolean;
  autoPair: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  fontSize: "md",
  autoSave: true,
  showLineNumbers: false,
  lineHeight: 1.7,
  sidebarWidth: 280,
  focusMode: false,
  typewriterMode: false,
  autoPair: true,
};

const SETTINGS_KEY = "settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    idbGetSetting<Settings>(SETTINGS_KEY)
      .then(stored => {
        if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored });
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      idbSetSetting(SETTINGS_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return {
    settings,
    updateSettings,
  };
}
