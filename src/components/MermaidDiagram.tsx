import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
});

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const instanceCounter = useRef(0);
  const reactId = useId().replace(/:/g, "_");
  const lastCodeRef = useRef<string>("");

  useEffect(() => {
    if (code === lastCodeRef.current && svg) return;
    lastCodeRef.current = code;

    let cancelled = false;
    const id = `mermaid-${reactId}-${++instanceCounter.current}`;

    mermaid
      .render(id, code)
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) {
          setSvg(renderedSvg);
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
  }, [code, reactId, svg]);

  if (error) {
    return (
      <div className="p-4 my-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
        <p className="font-medium mb-1">Mermaid 渲染错误</p>
        <pre className="text-xs whitespace-pre-wrap opacity-80">{error}</pre>
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
