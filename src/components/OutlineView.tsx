import { memo } from "react";
import type { Heading } from "@hooks/useOutline";

interface OutlineViewProps {
  headings: Heading[];
  currentLine: number;
  onJumpToLine: (line: number) => void;
}

export const OutlineView = memo(function OutlineView({
  headings,
  currentLine,
  onJumpToLine,
}: OutlineViewProps) {
  if (headings.length === 0) {
    return (
      <div className="sidebar-empty">
        <svg
          className="w-6 h-6 text-muted-foreground/20 mb-1.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M4 12h8M4 18h12" />
        </svg>
        <p className="text-[10px] text-muted-foreground/40">无标题</p>
        <p className="text-[9px] text-muted-foreground/25 mt-0.5">使用 # 添加标题</p>
      </div>
    );
  }

  let activeIdx = 0;
  for (let i = headings.length - 1; i >= 0; i--) {
    if (headings[i].line <= currentLine) {
      activeIdx = i;
      break;
    }
  }

  return (
    <div className="py-1">
      {headings.map((h, idx) => {
        const isActive = idx === activeIdx;
        const indent = (h.level - 1) * 12;
        return (
          <button
            key={`${h.line}-${idx}`}
            onClick={() => onJumpToLine(h.line)}
            className={`w-full text-left px-3 py-1 text-[11px] truncate transition-colors outline-none ${
              isActive
                ? "text-primary bg-primary/8"
                : "text-foreground/65 hover:text-foreground hover:bg-muted/40"
            }`}
            style={{ paddingLeft: `${indent + 12}px` }}
            title={h.text}
          >
            {h.text}
          </button>
        );
      })}
    </div>
  );
});
