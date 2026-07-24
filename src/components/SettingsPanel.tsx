import { useState, useEffect } from "react";
import type { Settings } from "@hooks/useSettings";
import { TemplateManagement } from "./TemplateManagement";
import { ACCENT_PRESETS } from "../constants/accents";
import { FONT_FAMILY_PRESETS } from "../constants/fonts";
import { useDialogA11y } from "@hooks";

const HOME_LAYOUTS = [
  { id: "quotes", name: "名言", desc: "随机金句 · 沉浸起笔" },
  { id: "dashboard", name: "看板", desc: "数据概览 · 最近笔记" },
  { id: "minimal", name: "极简", desc: "纯净空白 · 专注" },
  { id: "writer", name: "纸墨", desc: "作家桌面 · 最近笔记" },
  { id: "curtain", name: "字帘", desc: "交互字帘 · 创意起笔" },
] as const;

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  onInsertTemplate?: (templateId: string) => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onInsertTemplate,
}: SettingsPanelProps) {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { dialogRef, titleId } = useDialogA11y({ open: rendered, onClose });

  const handleChange = (key: string, value: string | number | boolean) => {
    onUpdate({ [key]: value });
  };

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- render panel before the next frame to run slide-in transition
      setRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!visible) {
      setRendered(false);
    }
  };

  if (!rendered) return null;

  return (
    <div className="absolute inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onTransitionEnd={handleTransitionEnd}
        className={`settings-drawer absolute top-0 right-0 bottom-0 z-[10001] max-w-full flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0 settings-drawer--visible" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 id={titleId} className="text-sm font-semibold text-foreground">
            设置
          </h2>
          <button
            onClick={onClose}
            aria-label="关闭设置"
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-6 scrollbar-thin">
          <div className="settings-section">
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
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
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              首页布局
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {HOME_LAYOUTS.map(opt => {
                const active = settings.homeLayout === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleChange("homeLayout", opt.id)}
                    title={opt.desc}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-md text-[11px] font-medium transition-all border ${
                      active
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="settings-section">
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              编辑器字体大小
            </label>
            <div className="flex gap-1.5">
              {[
                { value: "sm", label: "小" },
                { value: "md", label: "中" },
                { value: "lg", label: "大" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChange("fontSize", opt.value)}
                  className={`flex-1 py-2 rounded-md text-[11px] font-medium transition-all border ${
                    settings.fontSize === opt.value
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              编辑器字体
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {FONT_FAMILY_PRESETS.map(opt => {
                const active = settings.fontFamily === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleChange("fontFamily", opt.id)}
                    title={opt.desc}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-md text-[11px] font-medium transition-all border ${
                      active
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
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
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
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
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
              <span>紧凑</span>
              <span>宽松</span>
            </div>
          </div>

          <div className="settings-section">
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
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
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
              <span>窄</span>
              <span>宽</span>
            </div>
          </div>

          <div className="settings-section flex items-center justify-between">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              自动保存
            </label>
            <button
              onClick={() => handleChange("autoSave", !settings.autoSave)}
              className={`relative w-9 h-5 rounded-full transition-colors ${settings.autoSave ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.autoSave ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          </div>

          <div className="settings-section flex items-center justify-between">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              显示行号
            </label>
            <button
              onClick={() => handleChange("showLineNumbers", !settings.showLineNumbers)}
              className={`relative w-9 h-5 rounded-full transition-colors ${settings.showLineNumbers ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.showLineNumbers ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          </div>

          <div className="settings-section pt-2 border-t border-border">
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              编辑器模式
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-foreground">焦点模式</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">F8</span>
                </div>
                <button
                  onClick={() => handleChange("focusMode", !settings.focusMode)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${settings.focusMode ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.focusMode ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-foreground">打字机模式</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">F9</span>
                </div>
                <button
                  onClick={() => handleChange("typewriterMode", !settings.typewriterMode)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${settings.typewriterMode ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.typewriterMode ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">自动配对</span>
                <button
                  onClick={() => handleChange("autoPair", !settings.autoPair)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${settings.autoPair ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.autoPair ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section pt-2 border-t border-border">
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              体验增强
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-foreground">打字音效</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">键盘声反馈</span>
                </div>
                <button
                  onClick={() => handleChange("typingSound", !settings.typingSound)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${settings.typingSound ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.typingSound ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-foreground">涂鸦层</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">笔记上手写标注</span>
                </div>
                <button
                  onClick={() => handleChange("doodleLayer", !settings.doodleLayer)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${settings.doodleLayer ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.doodleLayer ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-foreground">夜间护眼</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">自动暖色渐变</span>
                </div>
                <button
                  onClick={() => handleChange("eyeCare", !settings.eyeCare)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${settings.eyeCare ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.eyeCare ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-foreground">健康提醒</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">定时喝水休息</span>
                </div>
                <button
                  onClick={() => handleChange("healthReminder", !settings.healthReminder)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${settings.healthReminder ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.healthReminder ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
              {settings.healthReminder && (
                <div className="ml-auto">
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
          </div>

          <div className="settings-section pt-2 border-t border-border">
            {onInsertTemplate && <TemplateManagement onInsertTemplate={onInsertTemplate} />}
          </div>
        </div>
      </div>
    </div>
  );
}
