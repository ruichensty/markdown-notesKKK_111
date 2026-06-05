import { useMemo, useCallback, memo, lazy, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@context";
import { useDebounce } from "@hooks";
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

interface PreviewProps {
  note: Note;
  showLineNumbers?: boolean;
}

function Preview({ note, showLineNumbers = false }: PreviewProps) {
  const { theme } = useTheme();
  const debouncedContent = useDebounce(note.content || "", 300);

  const CodeComponent = useCallback(
    ({
      inline,
      className,
      children,
      ...props
    }: {
      inline?: boolean;
      className?: string;
      children?: React.ReactNode;
    } & React.HTMLAttributes<HTMLElement>) => {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline && match) {
        const lang = match[1];
        const code = String(children).replace(/\n$/, "");
        if (lang === "mermaid") {
          return (
            <Suspense
              fallback={
                <div className="my-4 text-center text-xs text-muted-foreground">
                  Loading diagram...
                </div>
              }
            >
              <MermaidDiagram code={code} />
            </Suspense>
          );
        }
        return (
          <SyntaxHighlighter
            {...props}
            style={theme === "dark" ? vscDarkPlus : vs}
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
        <code
          {...props}
          className={`${className || ""} bg-muted/60 px-1.5 py-0.5 rounded text-[0.8rem] text-foreground`}
        >
          {children}
        </code>
      );
    },
    [theme, showLineNumbers]
  );

  const memoizedContent = useMemo(
    () => debouncedContent || "Start typing to see preview...",
    [debouncedContent]
  );

  const ImgComponent = useCallback(
    ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
      if (src?.startsWith("attachment://")) {
        return <AttachmentImage src={src} alt={alt || ""} />;
      }
      return <img src={src} alt={alt || ""} className="max-w-full h-auto rounded-lg" {...props} />;
    },
    []
  );

  const memoizedComponents = useMemo<Components>(
    () => ({
      code: CodeComponent,
      img: ImgComponent,
    }),
    [CodeComponent, ImgComponent]
  );

  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(() => [rehypeRaw, rehypeSanitize, rehypeKatex], []);

  return (
    <div className="preview-pane flex-1 flex flex-col overflow-hidden print-area">
      <div className="preview-scroll flex-1 overflow-y-auto scrollbar-thin">
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
