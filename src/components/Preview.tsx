import { useMemo, memo, lazy, Suspense, createContext, useContext } from "react";
import ReactMarkdown from "react-markdown";
import type { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@context";
import { useAdaptiveDebounce } from "@hooks";
import { AttachmentImage } from "./AttachmentImage";
import type { Note } from "@types";
import "katex/dist/katex.min.css";

import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import xml from "react-syntax-highlighter/dist/esm/languages/prism/xml-doc";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";

SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("tsx", typescript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("c", cpp);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);
SyntaxHighlighter.registerLanguage("xml", xml);
SyntaxHighlighter.registerLanguage("html", xml);
SyntaxHighlighter.registerLanguage("docker", docker);
SyntaxHighlighter.registerLanguage("dockerfile", docker);

const MermaidDiagram = lazy(() =>
  import("./MermaidDiagram").then(module => ({ default: module.MermaidDiagram }))
);

interface PreviewConfig {
  theme: string;
  showLineNumbers: boolean;
}

const PreviewConfigContext = createContext<PreviewConfig>({
  theme: "light",
  showLineNumbers: false,
});

const SAFE_STYLE_PATTERN = /^(?:[a-zA-Z-]+\s*:\s*[^;]+;\s*)*[a-zA-Z-]+\s*:\s*[^;]+$/;

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), ["style", SAFE_STYLE_PATTERN]],
  },
};

function CodeBlock({
  className,
  children,
  node: _node,
  ...props
}: ExtraProps & React.HTMLAttributes<HTMLElement>) {
  const { theme, showLineNumbers } = useContext(PreviewConfigContext);
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");
  const isBlock = match !== null || code.includes("\n");

  const isDarkTheme = theme === "dark" || theme === "black-rainbow";

  if (isBlock) {
    const lang = match?.[1];
    if (lang === "mermaid") {
      return (
        <Suspense
          fallback={
            <div className="my-4 text-center text-xs text-muted-foreground">Loading diagram...</div>
          }
        >
          <MermaidDiagram code={code} />
        </Suspense>
      );
    }
    if (lang) {
      return (
        <SyntaxHighlighter
          {...props}
          style={isDarkTheme ? vscDarkPlus : vs}
          language={lang}
          PreTag="div"
          showLineNumbers={showLineNumbers}
          customStyle={{
            background: "transparent",
            padding: "1rem",
            borderRadius: "0.5rem",
            margin: "1rem 0",
            fontSize: "0.875rem",
          }}
        >
          {code}
        </SyntaxHighlighter>
      );
    }
    return (
      <code {...props} className="font-mono">
        {code}
      </code>
    );
  }
  return (
    <code
      {...props}
      className={`${className || ""} bg-muted/60 px-1.5 py-0.5 rounded text-[0.8rem] text-foreground`}
    >
      {children}
    </code>
  );
}

const MemoizedCodeBlock = memo(CodeBlock);

function ImgComponent({
  src,
  alt,
  node: _node,
  ...props
}: ExtraProps & React.ImgHTMLAttributes<HTMLImageElement>) {
  if (src?.startsWith("attachment://")) {
    return <AttachmentImage src={src} alt={alt || ""} />;
  }
  return <img src={src} alt={alt || ""} className="max-w-full h-auto rounded-lg" {...props} />;
}

const MemoizedImg = memo(ImgComponent);

interface PreviewProps {
  note: Note;
  showLineNumbers?: boolean;
}

function Preview({ note, showLineNumbers = false }: PreviewProps) {
  const { theme } = useTheme();
  const debouncedContent = useAdaptiveDebounce(note.content || "", 150, 600, 1200);

  const config = useMemo<PreviewConfig>(
    () => ({ theme, showLineNumbers }),
    [theme, showLineNumbers]
  );

  const memoizedContent = useMemo(
    () => debouncedContent || "Start typing to see preview...",
    [debouncedContent]
  );

  const memoizedComponents = useMemo<Components>(
    () => ({
      code: MemoizedCodeBlock,
      img: MemoizedImg,
    }),
    []
  );

  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo<React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"]>(
    () => [rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex],
    []
  );

  return (
    <PreviewConfigContext.Provider value={config}>
      <div className="preview-pane flex-1 flex flex-col overflow-hidden print-area">
        <div className="preview-scroll flex-1 overflow-y-auto scrollbar-thin">
          <div className="preview-reading-surface">
            <div className="preview-kicker">Preview</div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={memoizedComponents}
              >
                {memoizedContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </PreviewConfigContext.Provider>
  );
}

export default memo(Preview, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.showLineNumbers === nextProps.showLineNumbers
  );
});
