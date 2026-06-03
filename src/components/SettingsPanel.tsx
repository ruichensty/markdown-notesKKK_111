import { useState, useEffect } from "react";
import type { Settings } from "@hooks/useSettings";

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

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
    <div
      onTransitionEnd={handleTransitionEnd}
      className={`settings-drawer absolute top-0 right-0 bottom-0 z-[10001] max-w-full flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-foreground">设置</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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
        <div>
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

        <div>
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

        <div>
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

        <div className="flex items-center justify-between">
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

        <div className="flex items-center justify-between">
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

        <div className="pt-2 border-t border-border">
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
      </div>
    </div>
  );
}
