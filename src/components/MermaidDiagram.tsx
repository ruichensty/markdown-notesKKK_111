import { useEffect, useRef, useState, useId } from "react";
import DOMPurify from "dompurify";
import type { Mermaid } from "mermaid";

let mermaidPromise: Promise<Mermaid> | null = null;

async function loadMermaid(): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(module => {
      module.default.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "strict",
      });
      return module.default;
    });
  }

  return mermaidPromise;
}

interface MermaidDiagramProps {
  code: string;
}

const supportedDiagramPattern =
  /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|timeline|gitGraph)\b/i;

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const instanceCounter = useRef(0);
  const reactId = useId().replace(/:/g, "_");
  const lastCodeRef = useRef<string>("");
  const unsupportedMessage = supportedDiagramPattern.test(code)
    ? null
    : "当前仅支持 graph、flowchart、sequenceDiagram、classDiagram、stateDiagram、erDiagram、gantt、pie、journey、timeline 和 gitGraph。";

  useEffect(() => {
    if (unsupportedMessage) return;

    if (code === lastCodeRef.current && svg) return;
    lastCodeRef.current = code;

    let cancelled = false;
    const id = `mermaid-${reactId}-${++instanceCounter.current}`;

    loadMermaid()
      .then(mermaid => mermaid.render(id, code))
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) {
          setSvg(
            DOMPurify.sanitize(renderedSvg, {
              USE_PROFILES: { svg: true, svgFilters: true },
            })
          );
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, reactId, svg, unsupportedMessage]);

  if (unsupportedMessage || error) {
    return (
      <div className="p-4 my-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
        <p className="font-medium mb-1">Mermaid 渲染错误</p>
        <pre className="text-xs whitespace-pre-wrap opacity-80">{unsupportedMessage || error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto [&>svg]:max-w-full"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
