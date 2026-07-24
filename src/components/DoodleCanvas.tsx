import {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  type MouseEvent as ReactMouseEvent,
} from "react";

interface DoodleCanvasProps {
  visible: boolean;
  onClear?: () => void;
}

type Tool = "pen" | "eraser";

function DoodleCanvasInner({ visible, onClear }: DoodleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#3b82f6");
  const [lineWidth, setLineWidth] = useState(3);
  const [hasContent, setHasContent] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const saved = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    if (saved) canvas.getContext("2d")?.putImageData(saved, 0, 0);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize, visible]);

  const getPos = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setIsDrawing(true);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      lastPosRef.current = pos;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [getPos]
  );

  const draw = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || !lastPosRef.current) return;

      const pos = getPos(e);
      ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 1;
      }

      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      lastPosRef.current = pos;
      setHasContent(true);
    },
    [isDrawing, tool, lineWidth, color, getPos]
  );

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onClear?.();
  }, [onClear]);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  if (!visible) return null;

  const colors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#ffffff"];

  return (
    <div className="doodle-canvas-container">
      <canvas
        ref={canvasRef}
        className="doodle-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
      />
      <div className="doodle-toolbar">
        <button
          type="button"
          className={`doodle-tool-btn ${tool === "pen" ? "doodle-tool-active" : ""}`}
          onClick={() => setTool("pen")}
          title="画笔"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>
        <button
          type="button"
          className={`doodle-tool-btn ${tool === "eraser" ? "doodle-tool-active" : ""}`}
          onClick={() => setTool("eraser")}
          title="橡皮"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.8 1.4c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L11 20" />
          </svg>
        </button>
        <div className="doodle-toolbar-sep" />
        <div className="doodle-color-palette">
          {colors.map(c => (
            <button
              key={c}
              type="button"
              className={`doodle-color-swatch ${color === c && tool === "pen" ? "doodle-color-active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
            />
          ))}
        </div>
        <div className="doodle-toolbar-sep" />
        <input
          type="range"
          className="doodle-size-slider"
          min="1"
          max="8"
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          title="画笔粗细"
        />
        <div className="doodle-toolbar-sep" />
        <button type="button" className="doodle-tool-btn" onClick={handleUndo} title="撤销">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        {hasContent && (
          <button type="button" className="doodle-tool-btn" onClick={handleClear} title="清空全部">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export const DoodleCanvas = memo(DoodleCanvasInner);
export default DoodleCanvas;
