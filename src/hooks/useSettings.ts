import { useState, useCallback, useEffect } from "react";
import { idbGetSetting, idbSetSetting } from "@utils/indexedDBStorage";
import type { AiProviderId } from "@types";

export interface Settings {
  fontSize: "sm" | "md" | "lg" | number;
  autoSave: boolean;
  showLineNumbers: boolean;
  lineHeight: number;
  sidebarWidth: number;
  focusMode: boolean;
  typewriterMode: boolean;
  autoPair: boolean;
  typingSound: boolean;
  doodleLayer: boolean;
  eyeCare: boolean;
  healthReminder: boolean;
  reminderInterval: number;
  accentColor: string;
  fontFamily: "sans" | "serif" | "mono";
  homeLayout: "quotes" | "dashboard" | "minimal" | "curtain" | "writer";
  expandedFolders: string[];
  particleEffects: boolean;
  aiAssistant: boolean;
  aiWidgetPos: { x: number; y: number } | null;
  aiProvider: AiProviderId;
  aiApiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiTtsAuto: boolean;
  aiTtsRate: number;
  aiTtsVoiceName: string;
  ttsEngine: "browser" | "api";
  ttsApiBaseUrl: string;
  ttsApiKey: string;
  ttsApiModel: string;
  ttsApiVoice: string;
  ttsApiSpeed: number;
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
  typingSound: false,
  doodleLayer: false,
  eyeCare: false,
  healthReminder: true,
  reminderInterval: 60,
  accentColor: "indigo",
  fontFamily: "mono",
  homeLayout: "dashboard",
  expandedFolders: [],
  particleEffects: true,
  aiAssistant: true,
  aiWidgetPos: null,
  aiProvider: "zhipu",
  aiApiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
  aiApiKey: "",
  aiModel: "glm-4-flash",
  aiTtsAuto: false,
  aiTtsRate: 1,
  aiTtsVoiceName: "",
  ttsEngine: "browser",
  ttsApiBaseUrl: "https://api.siliconflow.cn/v1",
  ttsApiKey: "",
  ttsApiModel: "FunAudioLLM/CosyVoice2-0.5B",
  ttsApiVoice: "",
  ttsApiSpeed: 1,
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
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    idbSetSetting(SETTINGS_KEY, settings).catch(err => {
      console.error("Failed to save settings:", err);
    });
  }, [settings]);

  return {
    settings,
    updateSettings,
  };
}
