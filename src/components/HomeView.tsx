import { useState, useEffect } from "react";

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

export function HomeView({ onNewNote }: { onNewNote: () => void }) {
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
    <div className="flex-1 flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.055] dark:opacity-[0.08]">
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6 sm:px-8 text-center">
        <div className="mb-8">
          <div className="mx-auto mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-primary shadow-[0_18px_50px_hsl(var(--primary)/0.22)]">
            <svg
              className="text-primary-foreground"
              width="48"
              height="48"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
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
          <h1 className="mt-4 text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            Markdown Notes
          </h1>
          <p className="mt-2 text-[11px] text-muted-foreground/60 tracking-[0.28em] uppercase">
            Write · Organize · Create
          </p>
        </div>

        <div className="mb-10 h-28 flex items-center justify-center">
          <div
            className={`transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}
          >
            <p className="text-lg sm:text-xl leading-relaxed text-foreground/80 font-light tracking-wide">
              {quote.zh}
            </p>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground/60 italic">
              {quote.en}
            </p>
          </div>
        </div>

        <button
          onClick={onNewNote}
          className="group inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-300 text-sm font-semibold shadow-[0_10px_30px_hsl(var(--primary)/0.22)] hover:shadow-[0_16px_40px_hsl(var(--primary)/0.28)]"
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
      </div>
    </div>
  );
}
