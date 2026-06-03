import { memo } from "react";

interface EditorToolbarProps {
  onHeading: (level: number) => void;
  onBold: () => void;
  onItalic: () => void;
  onStrike: () => void;
  onUnorderedList: () => void;
  onOrderedList: () => void;
  onQuote: () => void;
  onCode: () => void;
  onCodeBlock: () => void;
  onLink: () => void;
  onSearch: () => void;
  onFontSize: (size: number) => void;
  onColor: (color: string) => void;
  onLineBreak: () => void;
  textColor: string;
}

export const EditorToolbar = memo(function EditorToolbar({
  onHeading,
  onBold,
  onItalic,
  onStrike,
  onUnorderedList,
  onOrderedList,
  onQuote,
  onCode,
  onCodeBlock,
  onLink,
  onSearch,
  onFontSize,
  onColor,
  onLineBreak,
  textColor,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/50 bg-muted/30 flex-wrap">
      <button onClick={() => onHeading(1)} className="format-btn" title="一级标题">
        <span className="text-[10px] font-bold">H1</span>
      </button>
      <button onClick={() => onHeading(2)} className="format-btn" title="二级标题">
        <span className="text-[10px] font-bold">H2</span>
      </button>
      <button onClick={() => onHeading(3)} className="format-btn" title="三级标题">
        <span className="text-[10px] font-bold">H3</span>
      </button>
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <button onClick={onBold} className="format-btn" title="粗体 (Ctrl+B)">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>
      <button onClick={onItalic} className="format-btn" title="斜体 (Ctrl+I)">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>
      <button onClick={onStrike} className="format-btn" title="删除线">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="12" x2="20" y2="12" />
          <path d="M17.5 7.5c0-2-1.5-3.5-5.5-3.5S6.5 5.5 6.5 7.5c0 4 11 4 11 8 0 2-1.5 3.5-5.5 3.5S6.5 18 6.5 16" />
        </svg>
      </button>
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <button onClick={onUnorderedList} className="format-btn" title="无序列表">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="9" y1="6" x2="20" y2="6" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="5" cy="6" r="1" fill="currentColor" />
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="5" cy="18" r="1" fill="currentColor" />
        </svg>
      </button>
      <button onClick={onOrderedList} className="format-btn" title="有序列表">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="10" y1="6" x2="20" y2="6" />
          <line x1="10" y1="12" x2="20" y2="12" />
          <line x1="10" y1="18" x2="20" y2="18" />
          <text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">
            1
          </text>
          <text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">
            2
          </text>
          <text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">
            3
          </text>
        </svg>
      </button>
      <button onClick={onQuote} className="format-btn" title="引用">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.074 0-2.148-.497-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.074 0-2.148-.497-2.917-1.179z" />
        </svg>
      </button>
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <button onClick={onCode} className="format-btn" title="行内代码 (Ctrl+\)">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>
      <button onClick={onCodeBlock} className="format-btn" title="代码块">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polyline points="9 8 5 12 9 16" />
          <polyline points="15 8 19 12 15 16" />
        </svg>
      </button>
      <button onClick={onLink} className="format-btn" title="链接">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <button onClick={onSearch} className="format-btn" title="查找 (Ctrl+F)">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6.5" cy="6.5" r="4.5" />
          <line x1="10" y1="10" x2="14" y2="14" />
        </svg>
      </button>
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <div className="relative flex items-center">
        <select
          onChange={e => onFontSize(Number(e.target.value))}
          className="format-btn appearance-none pr-3 pl-1 text-[10px] cursor-pointer bg-transparent"
          title="字体大小"
          defaultValue=""
        >
          <option value="" disabled>
            字号
          </option>
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
          <option value="32">32px</option>
        </select>
      </div>
      <div className="relative flex items-center">
        <input
          type="color"
          value={textColor}
          onChange={e => onColor(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border border-border/50 bg-transparent p-0"
          title="文字颜色"
        />
      </div>
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <button onClick={onLineBreak} className="format-btn" title="换行">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4v16" />
          <path d="M18 4v8a4 4 0 01-4 4H6" />
          <polyline points="10 12 6 16 10 20" />
        </svg>
      </button>
    </div>
  );
});
