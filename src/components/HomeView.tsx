import { useState, useEffect, useMemo, memo } from "react";
import type { Note } from "@types";
import AwningCurtain from "./AwningCurtain";

const quotes = [
  {
    zh: "写字是思考的延伸，每一次落笔都是与自己的对话。",
    en: "Writing is an extension of thought, every stroke a conversation with yourself.",
  },
  {
    zh: "简单的工具，往往能激发最纯粹的创造力。",
    en: "Simple tools often inspire the purest creativity.",
  },
  {
    zh: "好的笔记不是记录过去，而是为未来的自己铺路。",
    en: "Good notes are not about recording the past, but paving the way for your future self.",
  },
  {
    zh: "在信息洪流中，写下属于自己的那行文字。",
    en: "In the flood of information, write your own line of words.",
  },
  {
    zh: "记录不是为了不忘记，而是为了更好地前行。",
    en: "Documenting is not about not forgetting, but about moving forward better.",
  },
  { zh: "每一个想法都值得被妥善安放。", en: "Every thought deserves a proper place to land." },
];

type HomeLayout = "quotes" | "dashboard" | "minimal" | "curtain" | "writer";

interface HomeViewProps {
  onNewNote: () => void;
  notes?: Note[];
  onNoteSelect?: (id: string) => void;
  layout?: HomeLayout;
  onOpenQimen?: () => void;
  onOpenCyber?: () => void;
}

function countWords(text: string): number {
  if (!text) return 0;
  const cjk = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjk ? cjk.length : 0;
  const withoutCjk = text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ");
  const enWords = withoutCjk.match(/\b[a-zA-Z]+\b/g);
  return cjkCount + (enWords ? enWords.length : 0);
}

function isThisWeek(ts: number): boolean {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay());
  return ts >= start.getTime();
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(ts).toLocaleDateString();
}

function NewNoteButton({ onNewNote }: { onNewNote: () => void }) {
  return (
    <button
      onClick={onNewNote}
      className="group inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-95 transition-all duration-200 text-sm font-semibold shadow-[0_8px_24px_hsl(var(--primary)/0.24)] hover:shadow-[0_14px_36px_hsl(var(--primary)/0.32)] hover:-translate-y-0.5"
    >
      <svg
        className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      开始书写
    </button>
  );
}

function HomeNavbar({
  onNewNote,
  onOpenQimen,
  onOpenCyber,
}: {
  onNewNote: () => void;
  onOpenQimen?: () => void;
  onOpenCyber?: () => void;
}) {
  const links = ["Explore", "Collections", "Flows", "Patterns"];

  return (
    <nav className="mobbin-home-nav" aria-label="首页导航">
      <button type="button" className="mobbin-home-brand" aria-label="Markdown Notes 首页">
        <span className="mobbin-home-brand-mark">MN</span>
        <span className="mobbin-home-brand-copy">
          <span>Markdown Notes</span>
          <small>Pattern library for thoughts</small>
        </span>
      </button>

      <div className="mobbin-home-links" aria-label="笔记分类导航">
        {links.map(link => (
          <button key={link} type="button">
            {link}
          </button>
        ))}
      </div>

      <div className="mobbin-home-actions">
        <button type="button" onClick={onOpenQimen} className="mobbin-home-login">
          奇门图
        </button>
        <button type="button" onClick={onOpenCyber} className="mobbin-home-login">
          赛博算卦
        </button>
        <button type="button" onClick={onNewNote} className="mobbin-home-join">
          New note
        </button>
      </div>
    </nav>
  );
}

function QuoteLayout({ onNewNote }: { onNewNote: () => void }) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * quotes.length));
  const [mounted, setMounted] = useState(true);
  const quote = quotes[quoteIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setMounted(false);
      setTimeout(() => {
        setQuoteIndex(prev => (prev + 1) % quotes.length);
        setMounted(true);
      }, 500);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative z-10 max-w-xl mx-auto px-6 sm:px-8 text-center">
      <div className="mb-10">
        <div className="mx-auto mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-[1.75rem] bg-primary shadow-[0_20px_55px_hsl(var(--primary)/0.24)] ring-1 ring-primary/10">
          <svg
            className="text-primary-foreground"
            width="48"
            height="48"
            viewBox="0 0 64 64"
            fill="none"
          >
            <rect
              x="13"
              y="8"
              width="38"
              height="48"
              rx="6"
              className="fill-transparent stroke-current"
              strokeWidth="2"
            />
            <rect
              x="20"
              y="18"
              width="24"
              height="3"
              rx="1.5"
              className="fill-current opacity-90"
            />
            <rect
              x="20"
              y="28"
              width="24"
              height="3"
              rx="1.5"
              className="fill-current opacity-55"
            />
            <rect
              x="20"
              y="38"
              width="18"
              height="3"
              rx="1.5"
              className="fill-current opacity-35"
            />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
          Markdown Notes
        </h1>
        <p className="mt-2 text-[11px] text-muted-foreground/55 tracking-[0.28em] uppercase">
          Write · Organize · Create
        </p>
      </div>

      <div className="mb-12 h-32 flex items-center justify-center relative">
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <svg
            className="w-6 h-6 text-primary/25 mb-3"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-8.632 6.631-9.468 1.025-.303 1.752-.082 1.752.961V21c0 1.103-.897 2-2 2H6c-1.103 0-2-.897-2-2V3h8.017v18zM2 3h6v18H2V3z" />
          </svg>
          <p className="text-lg sm:text-xl leading-relaxed text-foreground/80 font-light tracking-wide max-w-lg">
            {quote.zh}
          </p>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground/55 italic">
            {quote.en}
          </p>
        </div>
      </div>

      <NewNoteButton onNewNote={onNewNote} />
    </div>
  );
}

function MinimalLayout({ onNewNote }: { onNewNote: () => void }) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-8">
      <button
        onClick={onNewNote}
        className="group flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/[0.03] active:scale-95 transition-all duration-300 shadow-[0_0_0_0_hsl(var(--primary)/0)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.12)]"
        aria-label="新建笔记"
      >
        <svg
          className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <p className="text-sm text-muted-foreground/60 tracking-wide">点击开始一篇新笔记</p>
    </div>
  );
}

const DashboardLayout = memo(function DashboardLayout({
  onNewNote,
  notes,
  onNoteSelect,
  onOpenQimen,
  onOpenCyber,
}: {
  onNewNote: () => void;
  notes: Note[];
  onNoteSelect?: (id: string) => void;
  onOpenQimen?: () => void;
  onOpenCyber?: () => void;
}) {
  const stats = useMemo(() => {
    const totalNotes = notes.length;
    const totalWords = notes.reduce((sum, n) => sum + countWords(n.content || ""), 0);
    const weekNotes = notes.filter(n => isThisWeek(n.updatedAt));
    return { totalNotes, totalWords, weekCount: weekNotes.length };
  }, [notes]);

  const recent = useMemo(() => {
    return [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
  }, [notes]);

  const patternTags = ["Daily note", "Research", "Ideas", "Meeting", "Writing", "Archive"];

  return (
    <div className="mobbin-home-shell relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
      <HomeNavbar onNewNote={onNewNote} onOpenQimen={onOpenQimen} onOpenCyber={onOpenCyber} />
      <div className="mobbin-hero-card mb-5">
        <div>
          <p className="mobbin-eyebrow">Searchable workspace</p>
          <h1 className="mobbin-hero-title">像浏览设计案例一样，快速回到你的笔记流。</h1>
          <p className="mobbin-hero-subtitle">
            收集、筛选、继续书写，把灵感整理成可复用的知识屏幕。
          </p>
        </div>
        <NewNoteButton onNewNote={onNewNote} />
      </div>

      <div className="mobbin-pattern-strip mb-5" aria-label="常用笔记模式">
        {patternTags.map(tag => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "笔记总数", value: stats.totalNotes, icon: "notes" },
          { label: "累计字数", value: stats.totalWords.toLocaleString(), icon: "words" },
          { label: "本周更新", value: stats.weekCount, icon: "week" },
        ].map(s => (
          <div key={s.label} className="mobbin-stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {s.label}
              </span>
              {s.icon === "notes" && (
                <svg
                  className="w-4 h-4 text-primary/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              )}
              {s.icon === "words" && (
                <svg
                  className="w-4 h-4 text-primary/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              )}
              {s.icon === "week" && (
                <svg
                  className="w-4 h-4 text-primary/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mobbin-eyebrow">Latest screens</p>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">最近笔记</h2>
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 py-14 text-center transition-colors hover:border-primary/25 hover:bg-card/50">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 text-primary/60">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <p className="text-sm text-foreground/80 font-medium">还没有任何笔记</p>
          <p className="text-xs text-muted-foreground/50 mt-1">创建第一篇笔记开始记录吧</p>
        </div>
      ) : (
        <div className="mobbin-note-grid">
          {recent.map(note => (
            <button
              key={note.id}
              onClick={() => onNoteSelect?.(note.id)}
              className="mobbin-note-card group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {note.title || "Untitled"}
                </span>
                <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                  {relTime(note.updatedAt)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground/65 line-clamp-2 leading-relaxed">
                {(note.content || "").replace(/[#*`>-]/g, "").trim() || "空白笔记"}
              </span>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                继续编辑
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

function WriterLayout({
  onNewNote,
  notes,
  onNoteSelect,
}: {
  onNewNote: () => void;
  notes: Note[];
  onNoteSelect?: (id: string) => void;
}) {
  const stats = useMemo(() => {
    const totalWords = notes.reduce((sum, n) => sum + countWords(n.content || ""), 0);
    return {
      count: notes.length,
      words: totalWords,
    };
  }, [notes]);

  const recent = useMemo(() => {
    return [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  }, [notes]);

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 h-full flex flex-col justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
              Markdown Notes
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight leading-[1.1]">
              写下
              <br />
              <span className="text-muted-foreground/40">今日的想法</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-md leading-relaxed">
              一个安静的角落，让思绪沉淀成文字。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <NewNoteButton onNewNote={onNewNote} />
            {recent.length > 0 && (
              <button
                onClick={() => onNoteSelect?.(recent[0].id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-foreground/80 hover:bg-card/60 hover:border-primary/30 transition-all active:scale-95"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                继续上次
              </button>
            )}
          </div>

          <div className="flex items-center gap-8 text-sm text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground tabular-nums">
                {stats.count}
              </span>
              <span>笔记</span>
            </div>
            <div className="w-px h-4 bg-border/60" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground tabular-nums">
                {stats.words.toLocaleString()}
              </span>
              <span>字</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:col-span-5 flex-col gap-4 perspective-[1200px]">
          {recent.length === 0 ? (
            <div className="relative h-72 rounded-2xl border border-dashed border-border/60 bg-card/30 flex flex-col items-center justify-center text-center p-6 rotate-y-[-8deg] hover:rotate-y-0 transition-transform duration-500">
              <svg
                className="w-10 h-10 text-primary/30 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <p className="text-sm text-muted-foreground/70">第一张纸，等你落笔</p>
            </div>
          ) : (
            recent.map((note, i) => (
              <button
                key={note.id}
                onClick={() => onNoteSelect?.(note.id)}
                className="group text-left rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
                style={{
                  transform: `rotateX(${2 - i * 1.5}deg) rotateY(${6 - i * 2}deg) translateZ(${40 - i * 10}px)`,
                  opacity: 1 - i * 0.12,
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {note.title || "Untitled"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                    {relTime(note.updatedAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed">
                  {(note.content || "").replace(/[#*`>-]/g, "").trim() || "空白笔记"}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function HomeView({
  onNewNote,
  notes = [],
  onNoteSelect,
  layout = "writer",
  onOpenQimen,
  onOpenCyber,
}: HomeViewProps) {
  return (
    <div className="home-view flex-1 flex flex-col bg-background relative overflow-y-auto overflow-x-hidden min-h-0">
      {layout === "curtain" ? (
        <AwningCurtain onNewNote={onNewNote} />
      ) : (
        <>
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
            <div className="absolute left-1/4 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary blur-[8rem]" />
            <div className="absolute right-1/4 bottom-0 h-[30rem] w-[30rem] translate-y-1/3 rounded-full bg-primary/60 blur-[7rem]" />
          </div>

          {layout === "quotes" && (
            <div className="home-layout-frame flex-1 flex items-center justify-center py-12">
              <QuoteLayout onNewNote={onNewNote} />
            </div>
          )}
          {layout === "minimal" && (
            <div className="home-layout-frame flex-1 flex items-center justify-center py-12">
              <MinimalLayout onNewNote={onNewNote} />
            </div>
          )}
          {layout === "dashboard" && (
            <div className="home-layout-frame home-layout-frame--dashboard flex-1 flex items-start justify-center py-8 sm:py-12">
              <DashboardLayout
                onNewNote={onNewNote}
                notes={notes}
                onNoteSelect={onNoteSelect}
                onOpenQimen={onOpenQimen}
                onOpenCyber={onOpenCyber}
              />
            </div>
          )}
          {layout === "writer" && (
            <WriterLayout onNewNote={onNewNote} notes={notes} onNoteSelect={onNoteSelect} />
          )}
        </>
      )}
    </div>
  );
}
