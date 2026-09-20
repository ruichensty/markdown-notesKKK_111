import { useState, useCallback, useEffect, useRef } from "react";
import { idbGetSetting, idbSetSetting } from "@utils/indexedDBStorage";
import { parseAiUiTheme } from "@utils/aiUiTheme";
import type { AiProviderId, AiUiStyle, AiUiThemePackage } from "@types";
import type { AvatarAnimation, AvatarMode, AvatarSkin } from "@types";
import type { AiQuickPrompt } from "../constants/aiPrompts";
import { useDebouncedPersistence } from "./useDebouncedPersistence";
import { publishCrossTabChange, subscribeCrossTabChange } from "@utils/crossTabSync";

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
  aiUiStyle: AiUiStyle;
  aiCustomUiTheme: AiUiThemePackage | null;
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
  aiUiStyle: "companion",
  aiCustomUiTheme: null,
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

function normalizeSettings(stored?: Partial<Settings>, pending: Partial<Settings> = {}): Settings {
  const next = { ...DEFAULT_SETTINGS, ...stored, ...pending };
  if (next.aiCustomUiTheme) {
    try {
      next.aiCustomUiTheme = parseAiUiTheme(next.aiCustomUiTheme);
    } catch {
      next.aiCustomUiTheme = null;
      if (next.aiUiStyle === "custom") next.aiUiStyle = "companion";
    }
  } else if (next.aiUiStyle === "custom") {
    next.aiUiStyle = "companion";
  }
  return next;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const pendingUpdatesRef = useRef<Partial<Settings>>({});

  useEffect(() => {
    idbGetSetting<Settings>(SETTINGS_KEY)
      .then(stored => {
        setSettings(normalizeSettings(stored, pendingUpdatesRef.current));
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

  const persistence = useDebouncedPersistence(
    settings,
    async value => {
      await idbSetSetting(SETTINGS_KEY, value);
      publishCrossTabChange("settings");
    },
    hydrated,
    300
  );
  const skipNextSettingsPersist = persistence.skipNextPersist;

  useEffect(
    () =>
      subscribeCrossTabChange("settings", () => {
        void idbGetSetting<Settings>(SETTINGS_KEY).then(stored => {
          if (!stored) return;
          skipNextSettingsPersist();
          setSettings(normalizeSettings(stored));
        });
      }),
    [skipNextSettingsPersist]
  );

  return {
    settings,
    updateSettings,
    saveStatus: persistence.status,
    saveError: persistence.error,
    retrySave: persistence.retry,
    clearSaveError: persistence.clearError,
    flush: persistence.flush,
  };
}
