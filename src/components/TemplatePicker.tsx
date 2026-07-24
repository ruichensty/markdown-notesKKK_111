import type { NoteTemplate } from "@types";
import { useDialogA11y } from "@hooks";

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  templates: NoteTemplate[];
  onSelect: (templateId: string | undefined) => void;
}

export function TemplatePicker({ open, onClose, templates, onSelect }: TemplatePickerProps) {
  const { dialogRef, titleId } = useDialogA11y({ open, onClose });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-popover border border-border rounded-xl shadow-2xl p-5 max-w-md w-full mx-4 animate-scale-in"
      >
        <h3 id={titleId} className="text-sm font-semibold text-foreground mb-3">
          选择模板
        </h3>
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto scrollbar-thin">
          <button
            onClick={() => {
              onSelect(undefined);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
          >
            <span className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                viewBox="0 0 16 16"
              >
                <path d="M11.5 1.5h-7a1 1 0 00-1 1v11a1 1 0 001 1h7a1 1 0 001-1v-11a1 1 0 00-1-1z" />
                <path d="M11.5 1.5v4h4" />
              </svg>
            </span>
            <div>
              <div className="text-xs font-medium text-foreground">空白笔记</div>
              <div className="text-[10px] text-muted-foreground">从零开始</div>
            </div>
          </button>

          {templates.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => {
                onSelect(tpl.id);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
            >
              <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/60 group-hover:text-primary transition-colors">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.3}
                >
                  <rect x="2" y="2" width="12" height="12" rx="1.5" />
                  <line x1="2" y1="5.5" x2="14" y2="5.5" />
                  <line x1="5" y1="2" x2="5" y2="5.5" />
                  <line x1="5" y1="8" x2="11" y2="8" />
                  <line x1="5" y1="10.5" x2="9" y2="10.5" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground truncate">{tpl.name}</span>
                  {tpl.isBuiltin && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      内置
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{tpl.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
