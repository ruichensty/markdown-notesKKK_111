import { useState, useEffect, useRef, memo } from "react";
import type { Settings } from "@hooks/useSettings";
import type { AiProviderId } from "@types";
import { AI_PROVIDER_PRESETS, getPreset } from "@utils/aiClient";
import { TTS_API_PRESETS, getTtsPreset } from "@utils/ttsApi";
import { getVoicesAsync, isSpeechSupported } from "@utils/speech";
import {
  BackupPasswordRequiredError,
  createBackup,
  inspectBackup,
  restoreBackup,
  type BackupInspection,
  type BackupResult,
} from "@utils/backup";
import { validateAvatarImage } from "@utils/avatarImage";
import { createAiUiThemeTemplateBlob, readAiUiThemeFile } from "@utils/aiUiTheme";
import { idbUpdateSettingsAndAvatarFile } from "@utils/indexedDBStorage";
import { ConfirmDialog } from "./ConfirmDialog";
import { TemplateManagement } from "./TemplateManagement";
import { ACCENT_PRESETS } from "../constants/accents";
import { FONT_FAMILY_PRESETS } from "../constants/fonts";
import { useDialogA11y } from "@hooks";
import { AvatarRenderer } from "./avatar/AvatarRenderer";
import type { AvatarMode, AvatarSkin, BuiltInAiUiStyle } from "@types";

const HOME_LAYOUTS = [
  { id: "quotes", name: "名言", desc: "随机金句 · 沉浸起笔" },
  { id: "dashboard", name: "看板", desc: "数据概览 · 最近笔记" },
  { id: "minimal", name: "极简", desc: "纯净空白 · 专注" },
  { id: "writer", name: "纸墨", desc: "作家桌面 · 最近笔记" },
  { id: "curtain", name: "字帘", desc: "交互字帘 · 创意起笔" },
] as const;

const AI_AVATARS: { id: AvatarMode; name: string; desc: string }[] = [
  { id: "robot", name: "小方", desc: "经典机械助手" },
  { id: "cyber-girl", name: "星弥", desc: "未来数字伙伴" },
  { id: "cat", name: "灵感猫", desc: "轻松陪伴写作" },
  { id: "custom-image", name: "自定义", desc: "上传透明贴纸" },
];

const AI_SKINS: { id: AvatarSkin; name: string; colors: [string, string] }[] = [
  { id: "aurora", name: "极光", colors: ["#38d9ff", "#8b7cff"] },
  { id: "peach", name: "蜜桃", colors: ["#ff9f8f", "#ffcf70"] },
  { id: "midnight", name: "午夜", colors: ["#56d6b5", "#172b4d"] },
];

const AI_UI_STYLES: {
  id: BuiltInAiUiStyle;
  name: string;
  desc: string;
  colors: [string, string];
}[] = [
  {
    id: "companion",
    name: "数字伙伴",
    desc: "精致光感 · 丰富状态",
    colors: ["#38d9ff", "#8b7cff"],
  },
  {
    id: "pet",
    name: "桌面萌宠",
    desc: "柔软活泼 · 温暖陪伴",
    colors: ["#ff9f8f", "#ffcf70"],
  },
  {
    id: "minimal",
    name: "极简工具",
    desc: "克制清晰 · 低干扰",
    colors: ["#334155", "#94a3b8"],
  },
];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  onInsertTemplate?: (templateId: string) => void;
  onBeforeDataReplace?: () => Promise<void>;
}

function SettingsPanelBase({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onInsertTemplate,
  onBeforeDataReplace,
}: SettingsPanelProps) {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [quickPromptLabel, setQuickPromptLabel] = useState("");
  const [quickPromptText, setQuickPromptText] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [pendingBackupFile, setPendingBackupFile] = useState<File | null>(null);
  const [pendingBackupInspection, setPendingBackupInspection] = useState<BackupInspection | null>(
    null
  );
  const [backupPassword, setBackupPassword] = useState("");
  const [inspectedBackupPassword, setInspectedBackupPassword] = useState("");
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [showBackupConfirm, setShowBackupConfirm] = useState(false);
  const [avatarImageBusy, setAvatarImageBusy] = useState(false);
  const [avatarImageMessage, setAvatarImageMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [aiUiThemeMessage, setAiUiThemeMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const avatarImageInputRef = useRef<HTMLInputElement>(null);
  const aiUiThemeInputRef = useRef<HTMLInputElement>(null);
  const { dialogRef, titleId } = useDialogA11y({ open: rendered, onClose });

  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setRendered(true);
    } else {
      setVisible(false);
      setBackupPassword("");
      setInspectedBackupPassword("");
      setShowBackupPassword(false);
      setPendingBackupFile(null);
      setPendingBackupInspection(null);
      setShowBackupConfirm(false);
    }
  }

  useEffect(() => {
    if (!isSpeechSupported()) return;
    let cancelled = false;
    getVoicesAsync()
      .then(list => {
        if (!cancelled && list.length > 0) {
          const zh = list.filter(v => /^zh([-_]|$)/i.test(v.lang) || /普通话|中文/i.test(v.name));
          const rest = list.filter(v => !zh.includes(v));
          setTtsVoices([...zh, ...rest]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (key: string, value: string | number | boolean) => {
    onUpdate({ [key]: value });
  };

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!visible) {
      setRendered(false);
    }
  };

  const downloadBackup = (result: BackupResult) => {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const result = await createBackup(backupPassword || undefined);
      const sizeLabel =
        result.byteSize > 1024 * 1024
          ? `${(result.byteSize / 1024 / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(result.byteSize / 1024))} KB`;
      downloadBackup(result);
      setBackupMessage({
        kind: "ok",
        text: `已导出${result.encrypted ? "加密" : ""}备份：${result.noteCount} 篇笔记、${result.fileCount} 个附件（${sizeLabel}）`,
      });
    } catch (error) {
      setBackupMessage({
        kind: "error",
        text: `导出失败：${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const inspectPendingBackup = async (file = pendingBackupFile) => {
    if (!file || backupBusy) return;
    setBackupBusy(true);
    setBackupMessage(null);
    setPendingBackupInspection(null);
    try {
      const inspection = await inspectBackup(file, backupPassword || undefined);
      setPendingBackupInspection(inspection);
      setInspectedBackupPassword(inspection.encrypted ? backupPassword : "");
      setShowBackupConfirm(true);
    } catch (error) {
      if (error instanceof BackupPasswordRequiredError) {
        setBackupMessage({ kind: "error", text: "此备份已加密，请输入密码后点击“检查备份”" });
      } else {
        setBackupMessage({
          kind: "error",
          text: `无法读取备份：${error instanceof Error ? error.message : String(error)}`,
        });
      }
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackup = async () => {
    if (!pendingBackupFile || !pendingBackupInspection || backupBusy) return;
    setBackupBusy(true);
    try {
      await onBeforeDataReplace?.();
      const recovery = await createBackup(inspectedBackupPassword || backupPassword || undefined);
      downloadBackup(recovery);
      await restoreBackup(pendingBackupFile, inspectedBackupPassword || undefined);
      window.location.reload();
    } catch (error) {
      setBackupMessage({
        kind: "error",
        text: `导入失败：${error instanceof Error ? error.message : String(error)}`,
      });
      setShowBackupConfirm(false);
      setPendingBackupInspection(null);
      setInspectedBackupPassword("");
      setBackupBusy(false);
    }
  };

  const handleAvatarImageUpload = async (file: File) => {
    if (avatarImageBusy || backupBusy) return;
    setAvatarImageBusy(true);
    setAvatarImageMessage(null);
    try {
      const info = await validateAvatarImage(file);
      const imageId = `ai-avatar-${crypto.randomUUID()}`;
      const previousImageId = settings.aiAvatarCustomImageId;
      const data = await file.arrayBuffer();
      const nextSettings: Settings = {
        ...settings,
        aiAvatarCustomImageId: imageId,
        aiAvatarMode: "custom-image",
      };
      await idbUpdateSettingsAndAvatarFile(
        nextSettings,
        {
          id: imageId,
          noteId: "__ai_avatar__",
          data,
          fileName: file.name,
          fileType: file.type,
          size: data.byteLength,
          createdAt: Date.now(),
        },
        previousImageId
      );
      onUpdate(nextSettings);
      setAvatarImageMessage({
        kind: "ok",
        text: `已应用 ${info.width} × ${info.height} 图片`,
      });
    } catch (error) {
      setAvatarImageMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "上传失败，请重试",
      });
    } finally {
      setAvatarImageBusy(false);
    }
  };

  const handleAvatarImageDelete = async () => {
    const imageId = settings.aiAvatarCustomImageId;
    if (!imageId || avatarImageBusy || backupBusy) return;
    setAvatarImageBusy(true);
    setAvatarImageMessage(null);
    try {
      const nextSettings: Settings = {
        ...settings,
        aiAvatarCustomImageId: null,
        aiAvatarMode: "robot",
      };
      await idbUpdateSettingsAndAvatarFile(nextSettings, null, imageId);
      onUpdate(nextSettings);
      setAvatarImageMessage({ kind: "ok", text: "已删除自定义形象，并切换回小方" });
    } catch {
      setAvatarImageMessage({ kind: "error", text: "删除失败，请重试" });
    } finally {
      setAvatarImageBusy(false);
    }
  };

  const handleAiUiThemeImport = async (file: File) => {
    setAiUiThemeMessage(null);
    try {
      const theme = await readAiUiThemeFile(file);
      onUpdate({ aiCustomUiTheme: theme, aiUiStyle: "custom" });
      setAiUiThemeMessage({ kind: "ok", text: `已应用主题「${theme.name}」` });
    } catch (error) {
      setAiUiThemeMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "主题导入失败",
      });
    }
  };

  const handleAiUiThemeTemplateExport = () => {
    const url = URL.createObjectURL(createAiUiThemeTemplateBlob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "markdown-notes-ai-ui-template.aiui.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setAiUiThemeMessage({ kind: "ok", text: "示例主题已导出，可编辑后重新导入" });
  };

  const handleAiUiThemeRemove = () => {
    onUpdate({
      aiCustomUiTheme: null,
      aiUiStyle: settings.aiUiStyle === "custom" ? "companion" : settings.aiUiStyle,
    });
    setAiUiThemeMessage({ kind: "ok", text: "已移除自定义主题" });
  };

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-[11000]">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onTransitionEnd={handleTransitionEnd}
        className={`settings-drawer fixed top-0 right-0 bottom-0 z-[10001] max-w-full flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0 settings-drawer--visible" : "translate-x-full"}`}
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--surface-toolbar) / 0.92), hsl(var(--background) / 0.96))",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderLeft: "1px solid hsl(var(--border) / 0.55)",
          boxShadow: "-24px 0 64px hsl(var(--foreground) / 0.08)",
          width: "clamp(320px, 28vw, 420px)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0 bg-gradient-to-b from-card/40 to-transparent">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </span>
            <h2 id={titleId} className="text-sm font-semibold text-foreground">
              设置
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭设置"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 space-y-7 scrollbar-thin">
          <div className="settings-section">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              主题强调色
            </label>
            <div className="grid grid-cols-6 gap-2">
              {ACCENT_PRESETS.map(preset => {
                const active = settings.accentColor === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleChange("accentColor", preset.id)}
                    title={`${preset.name} · ${preset.desc}`}
                    aria-label={preset.name}
                    aria-pressed={active}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg transition-all"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${active ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
                      style={{
                        background: preset.isRainbow
                          ? "conic-gradient(from 210deg, #020617, #7c3aed, #ec4899, #f59e0b, #22c55e, #06b6d4, #020617)"
                          : `hsl(${preset.light})`,
                        boxShadow: active
                          ? preset.isRainbow
                            ? "0 0 0 2px #a855f7, 0 0 14px rgb(236 72 153 / 0.5)"
                            : `0 0 0 2px hsl(${preset.light})`
                          : preset.isRainbow
                            ? "0 1px 8px rgb(168 85 247 / 0.45)"
                            : `0 1px 3px hsl(${preset.light} / 0.35)`,
                      }}
                    >
                      {active && (
                        <svg
                          className="h-3.5 w-3.5 text-white"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 8 6.5 11.5 13 4.5" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-[10px] transition-colors ${active ? "text-foreground font-medium" : "text-muted-foreground/70"}`}
                    >
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-section">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              首页布局
            </label>
            <div className="grid grid-cols-2 gap-2">
              {HOME_LAYOUTS.map(opt => {
                const active = settings.homeLayout === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleChange("homeLayout", opt.id)}
                    title={opt.desc}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[11px] font-medium transition-all border ${
                      active
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="settings-section">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              编辑器字体大小
            </label>
            <div className="flex gap-2 p-1 bg-muted/40 rounded-xl">
              {[
                { value: "sm", label: "小" },
                { value: "md", label: "中" },
                { value: "lg", label: "大" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChange("fontSize", opt.value)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                    settings.fontSize === opt.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              编辑器字体
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_FAMILY_PRESETS.map(opt => {
                const active = settings.fontFamily === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleChange("fontFamily", opt.id)}
                    title={opt.desc}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[11px] font-medium transition-all border ${
                      active
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <span className="text-base leading-none" style={{ fontFamily: opt.stack }}>
                      Aa
                    </span>
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-section">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              行高{" "}
              <span className="text-foreground normal-case">{settings.lineHeight.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="1.4"
              max="2.4"
              step="0.1"
              value={settings.lineHeight}
              onChange={e => handleChange("lineHeight", Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5">
              <span>紧凑</span>
              <span>宽松</span>
            </div>
          </div>

          <div className="settings-section">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              侧边栏宽度{" "}
              <span className="text-foreground normal-case">{settings.sidebarWidth}px</span>
            </label>
            <input
              type="range"
              min="200"
              max="400"
              step="10"
              value={settings.sidebarWidth}
              onChange={e => handleChange("sidebarWidth", Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5">
              <span>窄</span>
              <span>宽</span>
            </div>
          </div>

          <div className="settings-section space-y-3">
            {[
              { key: "autoSave", label: "自动保存" },
              { key: "showLineNumbers", label: "显示行号" },
            ].map(({ key, label }) => {
              const value = settings[key as keyof Settings] as boolean;
              return (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">{label}</label>
                  <button
                    onClick={() => handleChange(key, !value)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="settings-section pt-2 border-t border-border/50">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              编辑器模式
            </label>
            <div className="space-y-3">
              {[
                { key: "focusMode", label: "焦点模式", hint: "F8" },
                { key: "typewriterMode", label: "打字机模式", hint: "F9" },
                { key: "autoPair", label: "自动配对", hint: "" },
              ].map(({ key, label, hint }) => {
                const value = settings[key as keyof Settings] as boolean;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-foreground">{label}</span>
                      {hint && (
                        <span className="text-[10px] text-muted-foreground ml-1.5">{hint}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleChange(key, !value)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="settings-section pt-2 border-t border-border/50">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              体验增强
            </label>
            <div className="space-y-3">
              {[
                { key: "typingSound", label: "打字音效", hint: "键盘声反馈" },
                { key: "doodleLayer", label: "涂鸦层", hint: "笔记上手写标注" },
                { key: "eyeCare", label: "夜间护眼", hint: "自动暖色渐变" },
                { key: "healthReminder", label: "健康提醒", hint: "定时喝水休息" },
                { key: "particleEffects", label: "粒子背景", hint: "关闭可提升流畅度" },
              ].map(({ key, label, hint }) => {
                const value = settings[key as keyof Settings] as boolean;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-foreground">{label}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">{hint}</span>
                      </div>
                      <button
                        onClick={() => handleChange(key, !value)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-4" : "translate-x-0"}`}
                        />
                      </button>
                    </div>
                    {key === "healthReminder" && value && (
                      <div className="ml-auto mt-2">
                        <label className="block text-[10px] text-muted-foreground mb-1">
                          提醒间隔{" "}
                          <span className="text-foreground">{settings.reminderInterval} 分钟</span>
                        </label>
                        <input
                          type="range"
                          min="30"
                          max="120"
                          step="15"
                          value={settings.reminderInterval}
                          onChange={e => handleChange("reminderInterval", Number(e.target.value))}
                          className="w-32 h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground/40 mt-0.5">
                          <span>30</span>
                          <span>120</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="settings-section pt-2 border-t border-border/50">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              AI 助手
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-foreground">显示机器人</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">可拖动的对话助手</span>
                </div>
                <button
                  onClick={() => handleChange("aiAssistant", !settings.aiAssistant)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${settings.aiAssistant ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.aiAssistant ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <div>
                <div className="flex items-end justify-between gap-3 mb-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground">
                      机器人 UI 风格
                    </label>
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                      形象与界面风格可自由组合
                    </p>
                  </div>
                  <button
                    type="button"
                    className="settings-ai-ui-template-link"
                    onClick={handleAiUiThemeTemplateExport}
                  >
                    导出制作模板
                  </button>
                </div>
                <div className="settings-ai-ui-grid" role="group" aria-label="机器人 UI 风格">
                  {AI_UI_STYLES.map(style => {
                    const active = settings.aiUiStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        className={`settings-ai-ui-card settings-ai-ui-card--${style.id} ${active ? "settings-ai-ui-card--active" : ""}`}
                        onClick={() => onUpdate({ aiUiStyle: style.id })}
                        aria-pressed={active}
                      >
                        <span className="settings-ai-ui-preview" aria-hidden="true">
                          <span
                            className="settings-ai-ui-preview-orb"
                            style={{
                              background: `linear-gradient(135deg, ${style.colors[0]}, ${style.colors[1]})`,
                            }}
                          />
                          <span className="settings-ai-ui-preview-panel">
                            <span />
                            <span />
                          </span>
                        </span>
                        <span className="settings-ai-ui-name">{style.name}</span>
                        <span className="settings-ai-ui-desc">{style.desc}</span>
                      </button>
                    );
                  })}
                  {settings.aiCustomUiTheme && (
                    <button
                      type="button"
                      className={`settings-ai-ui-card settings-ai-ui-card--custom ${settings.aiUiStyle === "custom" ? "settings-ai-ui-card--active" : ""}`}
                      onClick={() => onUpdate({ aiUiStyle: "custom" })}
                      aria-pressed={settings.aiUiStyle === "custom"}
                    >
                      <span
                        className="settings-ai-ui-preview settings-ai-ui-preview--custom"
                        style={{
                          background: `linear-gradient(135deg, ${settings.aiCustomUiTheme.tokens.surface ?? "#f8fafc"}, ${settings.aiCustomUiTheme.tokens.accent ?? "#38d9ff"})`,
                        }}
                        aria-hidden="true"
                      >
                        <span className="settings-ai-ui-preview-orb" />
                        <span className="settings-ai-ui-preview-panel">
                          <span />
                          <span />
                        </span>
                      </span>
                      <span className="settings-ai-ui-name">{settings.aiCustomUiTheme.name}</span>
                      <span className="settings-ai-ui-desc">
                        {settings.aiCustomUiTheme.author
                          ? `作者 · ${settings.aiCustomUiTheme.author}`
                          : "导入的自定义主题"}
                      </span>
                    </button>
                  )}
                </div>
                <input
                  ref={aiUiThemeInputRef}
                  type="file"
                  accept="application/json,.json,.aiui.json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleAiUiThemeImport(file);
                  }}
                />
                <div className="settings-ai-ui-actions">
                  <button
                    type="button"
                    className="settings-ai-ui-import"
                    onClick={() => aiUiThemeInputRef.current?.click()}
                  >
                    {settings.aiCustomUiTheme ? "替换主题文件" : "导入 .aiui.json"}
                  </button>
                  {settings.aiCustomUiTheme && (
                    <button
                      type="button"
                      className="settings-ai-ui-remove"
                      onClick={handleAiUiThemeRemove}
                    >
                      移除
                    </button>
                  )}
                </div>
                <p className="settings-ai-ui-security">
                  安全主题只允许颜色、圆角、阴影、模糊、密度和动画参数，不执行代码
                </p>
                {aiUiThemeMessage && (
                  <p
                    className={`settings-avatar-upload-message settings-avatar-upload-message--${aiUiThemeMessage.kind}`}
                    role="status"
                  >
                    {aiUiThemeMessage.text}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1.5">
                  AI 助手形象
                </label>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="AI 助手形象">
                  {AI_AVATARS.map(opt => {
                    const active = settings.aiAvatarMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (opt.id === "custom-image" && !settings.aiAvatarCustomImageId) {
                            avatarImageInputRef.current?.click();
                            return;
                          }
                          handleChange("aiAvatarMode", opt.id);
                        }}
                        aria-pressed={active}
                        title={opt.desc}
                        className={`settings-avatar-card ai-bot--skin-${settings.aiAvatarSkin} ${
                          active ? "settings-avatar-card--active" : ""
                        }`}
                      >
                        <span
                          className={`settings-avatar-preview ai-bot--${opt.id}`}
                          data-avatar-animation={settings.aiAvatarAnimation}
                        >
                          <AvatarRenderer
                            mode={opt.id}
                            state="idle"
                            customImageId={settings.aiAvatarCustomImageId}
                          />
                        </span>
                        <span className="settings-avatar-name">{opt.name}</span>
                        <span className="settings-avatar-desc">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  ref={avatarImageInputRef}
                  type="file"
                  accept="image/png,image/webp,.png,.webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleAvatarImageUpload(file);
                  }}
                />
                <div className="settings-avatar-upload-row">
                  <button
                    type="button"
                    className="settings-avatar-upload-btn"
                    onClick={() => avatarImageInputRef.current?.click()}
                    disabled={avatarImageBusy || backupBusy}
                  >
                    {avatarImageBusy
                      ? "处理中…"
                      : settings.aiAvatarCustomImageId
                        ? "替换自定义图片"
                        : "上传 PNG / WebP"}
                  </button>
                  {settings.aiAvatarCustomImageId && (
                    <button
                      type="button"
                      className="settings-avatar-delete-btn"
                      onClick={() => void handleAvatarImageDelete()}
                      disabled={avatarImageBusy || backupBusy}
                    >
                      删除
                    </button>
                  )}
                </div>
                <p className="settings-avatar-upload-hint">
                  透明贴纸模式 · 最大 5 MB · 尺寸不超过 4096 × 4096
                </p>
                {avatarImageMessage && (
                  <p
                    className={`settings-avatar-upload-message settings-avatar-upload-message--${avatarImageMessage.kind}`}
                    role="status"
                  >
                    {avatarImageMessage.text}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1.5">外观皮肤</label>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="AI 助手外观皮肤">
                  {AI_SKINS.map(skin => {
                    const active = settings.aiAvatarSkin === skin.id;
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => handleChange("aiAvatarSkin", skin.id)}
                        aria-pressed={active}
                        className={`settings-avatar-skin ${active ? "settings-avatar-skin--active" : ""}`}
                      >
                        <span
                          className="settings-avatar-swatch"
                          style={{
                            background: `linear-gradient(135deg, ${skin.colors[0]}, ${skin.colors[1]})`,
                          }}
                        />
                        <span>{skin.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1.5">数字人动画</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "full", name: "完整" },
                    { id: "reduced", name: "轻量" },
                    { id: "off", name: "关闭" },
                  ].map(opt => {
                    const active = settings.aiAvatarAnimation === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleChange("aiAvatarAnimation", opt.id)}
                        className={`py-2 rounded-xl text-[11px] font-medium transition-all border ${
                          active
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }`}
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-foreground">主动提示气泡</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">
                    展示笔记总结等提示
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleChange("aiAvatarTips", !settings.aiAvatarTips);
                    handleChange("aiAvatarTipDismissed", false);
                  }}
                  className={`relative w-10 h-6 rounded-full transition-colors ${settings.aiAvatarTips ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.aiAvatarTips ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1.5">语音引擎</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: "browser",
                      name: "浏览器内置",
                      desc: isSpeechSupported() ? "免费 · 离线" : "当前浏览器不支持",
                    },
                    { id: "api", name: "云端 API", desc: "更自然 · 按量计费" },
                  ].map(opt => {
                    const active = settings.ttsEngine === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleChange("ttsEngine", opt.id)}
                        disabled={opt.id === "browser" && !isSpeechSupported()}
                        className={`flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[11px] font-medium transition-all border ${
                          active
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed"
                        }`}
                      >
                        <span className="text-base leading-none">
                          {opt.id === "browser" ? "🔊" : "☁️"}
                        </span>
                        {opt.name}
                        <span className="text-[9px] font-normal opacity-70">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-foreground">自动朗读回复</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">生成完自动播报</span>
                </div>
                <button
                  onClick={() => handleChange("aiTtsAuto", !settings.aiTtsAuto)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${settings.aiTtsAuto ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.aiTtsAuto ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {settings.ttsEngine === "browser" && isSpeechSupported() && (
                <>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">播报音色</label>
                    <select
                      className="settings-ai-select"
                      value={settings.aiTtsVoiceName}
                      onChange={e => handleChange("aiTtsVoiceName", e.target.value)}
                    >
                      <option value="">自动（跟随系统）</option>
                      {ttsVoices.map(v => (
                        <option key={v.name} value={v.name}>
                          {v.name}（{v.lang}）
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      播报语速{" "}
                      <span className="text-foreground">{settings.aiTtsRate.toFixed(1)}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.aiTtsRate}
                      onChange={e => handleChange("aiTtsRate", Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5">
                      <span>慢</span>
                      <span>快</span>
                    </div>
                  </div>
                </>
              )}

              {settings.ttsEngine === "api" && (
                <>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      TTS 服务商
                    </label>
                    <select
                      className="settings-ai-select"
                      value={
                        TTS_API_PRESETS.find(
                          p =>
                            p.id !== "custom" &&
                            p.baseUrl === settings.ttsApiBaseUrl &&
                            p.model === settings.ttsApiModel
                        )?.id ?? "custom"
                      }
                      onChange={e => {
                        const preset = getTtsPreset(e.target.value);
                        if (preset.id === "custom") return;
                        onUpdate({
                          ttsApiBaseUrl: preset.baseUrl,
                          ttsApiModel: preset.model,
                          ttsApiVoice: preset.voiceHint,
                        });
                      }}
                    >
                      {TTS_API_PRESETS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      API 地址（Base URL，OpenAI TTS 兼容）
                    </label>
                    <input
                      type="text"
                      className="settings-ai-input"
                      value={settings.ttsApiBaseUrl}
                      onChange={e => handleChange("ttsApiBaseUrl", e.target.value)}
                      placeholder="https://…/v1"
                      spellCheck={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      API Key（仅保存在本机）
                    </label>
                    <input
                      type="password"
                      className="settings-ai-input"
                      value={settings.ttsApiKey}
                      onChange={e => handleChange("ttsApiKey", e.target.value)}
                      placeholder="sk-…"
                      spellCheck={false}
                      autoComplete="off"
                    />
                    {(() => {
                      const preset = TTS_API_PRESETS.find(
                        p =>
                          p.id !== "custom" &&
                          p.baseUrl === settings.ttsApiBaseUrl &&
                          p.model === settings.ttsApiModel
                      );
                      return preset?.keyUrl ? (
                        <a
                          href={preset.keyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline mt-1 inline-block"
                        >
                          获取 {preset.label} API Key ↗
                        </a>
                      ) : null;
                    })()}
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      语音模型（TTS Model）
                    </label>
                    <input
                      type="text"
                      className="settings-ai-input"
                      value={settings.ttsApiModel}
                      onChange={e => handleChange("ttsApiModel", e.target.value)}
                      placeholder="FunAudioLLM/CosyVoice2-0.5B"
                      spellCheck={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      音色名称（Voice）
                    </label>
                    <input
                      type="text"
                      className="settings-ai-input"
                      value={settings.ttsApiVoice}
                      onChange={e => handleChange("ttsApiVoice", e.target.value)}
                      placeholder="FunAudioLLM/CosyVoice2-0.5B:alex"
                      spellCheck={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">
                      播报语速{" "}
                      <span className="text-foreground">{settings.ttsApiSpeed.toFixed(2)}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.25"
                      max="4"
                      step="0.05"
                      value={settings.ttsApiSpeed}
                      onChange={e => handleChange("ttsApiSpeed", Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5">
                      <span>慢</span>
                      <span>快</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/70 mt-1.5">
                      云端语音按字符计费/消耗额度，开启「自动朗读」时请注意用量。
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1.5">
                  自定义快捷提问
                  <span className="ml-1 opacity-70">（在 AI 面板中一键发送）</span>
                </label>
                <div className="space-y-1.5">
                  {settings.aiQuickPrompts.map(p => (
                    <div key={p.id} className="settings-quick-prompt-row">
                      <span className="settings-quick-prompt-label">{p.label}</span>
                      <span className="settings-quick-prompt-text">{p.text}</span>
                      <button
                        type="button"
                        className="settings-quick-prompt-delete"
                        title="删除该预设"
                        onClick={() =>
                          onUpdate({
                            aiQuickPrompts: settings.aiQuickPrompts.filter(x => x.id !== p.id),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="settings-quick-prompt-form">
                    <input
                      type="text"
                      className="settings-ai-input"
                      value={quickPromptLabel}
                      onChange={e => setQuickPromptLabel(e.target.value)}
                      placeholder="短标签，如：🔍 查错别字"
                      maxLength={20}
                    />
                    <input
                      type="text"
                      className="settings-ai-input"
                      value={quickPromptText}
                      onChange={e => setQuickPromptText(e.target.value)}
                      placeholder="问题内容，如：请检查这篇笔记中的错别字并逐条列出。"
                      maxLength={200}
                    />
                    <button
                      type="button"
                      className="settings-quick-prompt-add"
                      disabled={!quickPromptLabel.trim() || !quickPromptText.trim()}
                      onClick={() => {
                        const label = quickPromptLabel.trim();
                        const text = quickPromptText.trim();
                        if (!label || !text) return;
                        onUpdate({
                          aiQuickPrompts: [
                            ...settings.aiQuickPrompts,
                            { id: `custom-${Date.now()}`, label, text },
                          ],
                        });
                        setQuickPromptLabel("");
                        setQuickPromptText("");
                      }}
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">服务商</label>
                <select
                  className="settings-ai-select"
                  value={settings.aiProvider}
                  onChange={e => {
                    const id = e.target.value as AiProviderId;
                    if (id === "custom") {
                      handleChange("aiProvider", id);
                    } else {
                      const preset = getPreset(id);
                      onUpdate({
                        aiProvider: id,
                        aiApiBaseUrl: preset.baseUrl,
                        aiModel: preset.model,
                      });
                    }
                  }}
                >
                  {AI_PROVIDER_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">
                  API 地址（Base URL，OpenAI 兼容）
                </label>
                <input
                  type="text"
                  className="settings-ai-input"
                  value={settings.aiApiBaseUrl}
                  onChange={e => handleChange("aiApiBaseUrl", e.target.value)}
                  placeholder="https://…/v1"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">
                  API Key（仅保存在本机）
                </label>
                <input
                  type="password"
                  className="settings-ai-input"
                  value={settings.aiApiKey}
                  onChange={e => handleChange("aiApiKey", e.target.value)}
                  placeholder="sk-…"
                  spellCheck={false}
                  autoComplete="off"
                />
                {getPreset(settings.aiProvider).keyUrl && (
                  <a
                    href={getPreset(settings.aiProvider).keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline mt-1 inline-block"
                  >
                    获取 {getPreset(settings.aiProvider).label} API Key ↗
                  </a>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">模型名称</label>
                <input
                  type="text"
                  className="settings-ai-input"
                  value={settings.aiModel}
                  onChange={e => handleChange("aiModel", e.target.value)}
                  placeholder="glm-4-flash"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">机器人位置</span>
                <button
                  type="button"
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => onUpdate({ aiWidgetPos: null })}
                >
                  重置到默认位置
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section pt-2 border-t border-border/50">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              数据备份与迁移
            </label>
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                所有数据保存在当前浏览器中。切换浏览器或设备时，可导出备份文件再导入恢复（笔记、文件夹、附件、设置、模板、AI
                聊天记录全量迁移）。备份包含 API Key，建议设置密码加密。
              </p>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">
                  备份密码（可选，至少 8 个字符）
                </label>
                <div className="flex gap-2">
                  <input
                    type={showBackupPassword ? "text" : "password"}
                    className="settings-ai-input flex-1"
                    value={backupPassword}
                    onChange={event => setBackupPassword(event.target.value)}
                    placeholder="留空则导出普通 JSON"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="settings-backup-visibility"
                    onClick={() => setShowBackupPassword(value => !value)}
                    aria-label={showBackupPassword ? "隐藏备份密码" : "显示备份密码"}
                  >
                    {showBackupPassword ? "隐藏" : "显示"}
                  </button>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground/70">
                  密码不会保存；遗忘后无法恢复加密备份
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="settings-backup-btn"
                  onClick={() => void handleExportBackup()}
                  disabled={backupBusy || avatarImageBusy}
                >
                  {backupBusy ? "处理中…" : backupPassword ? "导出加密备份" : "导出普通备份"}
                </button>
                <button
                  type="button"
                  className="settings-backup-btn"
                  onClick={() => backupInputRef.current?.click()}
                  disabled={backupBusy || avatarImageBusy}
                >
                  导入数据
                </button>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setPendingBackupFile(file);
                    setPendingBackupInspection(null);
                    setInspectedBackupPassword("");
                    void inspectPendingBackup(file);
                  }}
                />
              </div>
              {pendingBackupFile && !pendingBackupInspection && (
                <button
                  type="button"
                  className="settings-backup-inspect"
                  onClick={() => void inspectPendingBackup()}
                  disabled={backupBusy}
                >
                  {backupBusy ? "正在检查…" : `检查备份「${pendingBackupFile.name}」`}
                </button>
              )}
              {pendingBackupInspection && (
                <div className="settings-backup-summary" role="status">
                  <div>
                    <strong>{pendingBackupInspection.encrypted ? "加密备份" : "普通备份"}</strong>
                    <span>
                      {new Date(pendingBackupInspection.exportedAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <div className="settings-backup-summary-grid">
                    <span>{pendingBackupInspection.noteCount} 篇笔记</span>
                    <span>{pendingBackupInspection.folderCount} 个文件夹</span>
                    <span>{pendingBackupInspection.fileCount} 个附件</span>
                    <span>{pendingBackupInspection.templateCount} 个模板</span>
                    <span>{pendingBackupInspection.aiChatCount} 个 AI 会话</span>
                    <span>{(pendingBackupInspection.byteSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              )}
              {backupMessage && (
                <p
                  className={`text-[10px] leading-relaxed ${
                    backupMessage.kind === "ok" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {backupMessage.text}
                </p>
              )}
            </div>
          </div>

          <div className="settings-section pt-2 border-t border-border/50">
            {onInsertTemplate && <TemplateManagement onInsertTemplate={onInsertTemplate} />}
          </div>
        </div>
      </div>
      {showBackupConfirm && pendingBackupFile && (
        <ConfirmDialog
          message={`将用「${pendingBackupFile.name}」中的 ${pendingBackupInspection?.noteCount ?? 0} 篇笔记、${pendingBackupInspection?.fileCount ?? 0} 个附件覆盖当前数据。导入前会自动下载当前数据的回滚备份，确定继续吗？`}
          confirmLabel="覆盖导入"
          cancelLabel="取消"
          onConfirm={() => void handleImportBackup()}
          onCancel={() => {
            setShowBackupConfirm(false);
            setPendingBackupFile(null);
            setPendingBackupInspection(null);
            setInspectedBackupPassword("");
          }}
        />
      )}
    </div>
  );
}

export const SettingsPanel = memo(SettingsPanelBase);
