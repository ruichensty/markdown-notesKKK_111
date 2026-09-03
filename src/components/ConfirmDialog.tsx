import { useEffect, useRef } from "react";
import { useDialogA11y } from "@hooks";

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  message,
  confirmLabel = "删除",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const { dialogRef, titleId } = useDialogA11y({ open: true, onClose: onCancel });

  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/25 backdrop-blur-sm" onClick={onCancel} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-sm mx-4 rounded-2xl border border-border/60 bg-popover/95 p-5 shadow-[0_24px_64px_hsl(var(--foreground)/0.16)] animate-scale-in backdrop-blur-xl"
      >
        <p id={titleId} className="text-sm text-foreground mb-5 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            ref={cancelBtnRef}
            className="px-4 py-2 text-xs rounded-xl bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-colors font-medium shadow-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
