import { useState, useCallback, useEffect, useRef } from "react";
import { idbGetSetting, idbSetSetting } from "@utils/indexedDBStorage";
import type { AiProviderId } from "@types";
import type { AvatarAnimation, AvatarMode, AvatarSkin } from "@types";
import type { AiQuickPrompt } from "../constants/aiPrompts";

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
  aiAvatarMode: AvatarMode;
  aiAvatarSkin: AvatarSkin;
  aiAvatarCustomImageId: string | null;
  aiAvatarTips: boolean;
  aiAvatarTipDismissed: boolean;
  aiAvatarAnimation: AvatarAnimation;
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
  aiQuickPrompts: AiQuickPrompt[];
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
  aiAvatarMode: "cyber-girl",
  aiAvatarSkin: "aurora",
  aiAvatarCustomImageId: null,
  aiAvatarTips: true,
  aiAvatarTipDismissed: false,
  aiAvatarAnimation: "full",
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
  aiQuickPrompts: [],
};

const SETTINGS_KEY = "settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const pendingUpdatesRef = useRef<Partial<Settings>>({});

  useEffect(() => {
    idbGetSetting<Settings>(SETTINGS_KEY)
      .then(stored => {
        setSettings({ ...DEFAULT_SETTINGS, ...stored, ...pendingUpdatesRef.current });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      if (!hydrated) pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
      setSettings(prev => ({ ...prev, ...updates }));
    },
    [hydrated]
  );

  useEffect(() => {
    if (!hydrated) return;
    idbSetSetting(SETTINGS_KEY, settings).catch(err => {
      console.error("Failed to save settings:", err);
    });
  }, [hydrated, settings]);

  return {
    settings,
    updateSettings,
  };
}
