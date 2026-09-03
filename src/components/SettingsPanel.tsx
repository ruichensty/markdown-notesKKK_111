import { useState, useEffect, memo } from "react";
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

function SettingsPanelBase({
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
            {onInsertTemplate && <TemplateManagement onInsertTemplate={onInsertTemplate} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SettingsPanel = memo(SettingsPanelBase);
