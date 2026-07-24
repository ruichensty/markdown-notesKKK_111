import { useEffect, useRef } from "react";

interface AwningCurtainProps {
  onNewNote: () => void;
}

const CHAR_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789◇◇◇※※··.?";

const LETTER_COLORS = ["#dceaff", "#c9d8ff", "#e8e4ff", "#fff4e0", "#ffd9a0"];

const CFG = {
  strandSpacing: 28,
  segLen: 24,
  gravity: 0.34,
  friction: 0.988,
  iters: 5,
  letterEvery: 4,
  mouseRadius: 90,
  push: 0.55,
  drag: 0.45,
} as const;

const SPRITE_SIZE = 34;

interface PPoint {
  x: number;
  y: number;
  px: number;
  py: number;
  pinned: boolean;
  ch: string;
  color: string;
  phase: number;
  twinkle: number;
  act: number;
}

interface Strand {
  pts: PPoint[];
  baseX: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  ph: number;
  base: number;
}

export default function AwningCurtain({ onNewNote }: AwningCurtainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let DPR = 1;
    let awningY = 84;
    let facadeH = 16;
    let strands: Strand[] = [];
    let stars: Star[] = [];
    let bgCanvas: HTMLCanvasElement | null = null;
    let rectCache = { x: 0, y: 0, w: 0, h: 0 };
    let rafId = 0;

    const ptr = { x: -9999, y: -9999, px: -9999, py: -9999, inside: false, has: false };

    const colorFor = (ch: string): string => {
      let h = 0;
      for (let i = 0; i < ch.length; i++) h = (h * 31 + ch.charCodeAt(i)) | 0;
      return LETTER_COLORS[Math.abs(h) % LETTER_COLORS.length];
    };

    const spriteCache = new Map<string, HTMLCanvasElement>();
    const getSprite = (ch: string, color: string): HTMLCanvasElement => {
      const key = ch + color;
      const cached = spriteCache.get(key);
      if (cached) return cached;
      const c = document.createElement("canvas");
      c.width = SPRITE_SIZE;
      c.height = SPRITE_SIZE;
      const g = c.getContext("2d", { willReadFrequently: false });
      if (g) {
        g.font =
          '600 15px ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.shadowColor = color;
        g.shadowBlur = 6;
        g.fillStyle = color;
        g.fillText(ch, SPRITE_SIZE / 2, SPRITE_SIZE / 2 + 0.5);
      }
      spriteCache.set(key, c);
      return c;
    };

    const randChar = (): string => CHAR_POOL[(Math.random() * CHAR_POOL.length) | 0];

    const buildStrands = () => {
      const target = CFG.strandSpacing;
      const n = Math.max(24, Math.round(W / target));
      const step = W / n;
      const len = H - awningY + 60;
      const segs = Math.max(6, Math.ceil(len / CFG.segLen));
      strands = [];
      for (let i = 0; i <= n; i++) {
        const x = i * step + step * 0.5;
        const pts: PPoint[] = [];
        for (let j = 0; j <= segs; j++) {
          const py = awningY + j * CFG.segLen;
          const ch = randChar();
          pts.push({
            x,
            y: py,
            px: x,
            py,
            pinned: j === 0,
            ch,
            color: colorFor(ch),
            phase: Math.random() * Math.PI * 2,
            twinkle: Math.random() < 0.3 ? 0.25 + Math.random() * 0.2 : 0,
            act: 0,
          });
        }
        strands.push({ pts, baseX: x });
      }
    };

    const buildStars = () => {
      stars = [];
      const count = Math.floor((W * H) / 16000);
      const span = Math.max(1, H - awningY);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: awningY + Math.random() * span,
          r: Math.random() * 0.9 + 0.25,
          ph: Math.random() * Math.PI * 2,
          base: 0.18 + Math.random() * 0.32,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 1.75);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      rectCache = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      facadeH = 16;
      awningY = Math.max(74, Math.min(120, Math.round(H * 0.1)));
      buildStrands();
      buildStars();
      rebuildBg();
    };

    const step = (timeMs: number) => {
      let mvx = ptr.x - ptr.px;
      let mvy = ptr.y - ptr.py;
      const mspeed = Math.hypot(mvx, mvy);
      const maxV = 42;
      if (mspeed > maxV) {
        const k = maxV / mspeed;
        mvx *= k;
        mvy *= k;
      }
      const usePtr = ptr.has && (ptr.inside || mspeed > 0.4);
      const R = CFG.mouseRadius;
      const R2 = R * R;
      const fr = CFG.friction;
      const gr = CFG.gravity;
      const push = CFG.push;
      const drag = CFG.drag;
      const t = timeMs * 0.001;

      for (let s = 0, sl = strands.length; s < sl; s++) {
        const pts = strands[s].pts;
        const n = pts.length;
        const sway = Math.sin(t * 0.55 + s * 0.31) * 0.03 + Math.sin(t * 1.6 + s * 0.13) * 0.014;
        for (let i = 1; i < n; i++) {
          const p = pts[i];
          if (p.pinned) continue;
          p.act *= 0.94;
          const vx = (p.x - p.px) * fr;
          const vy = (p.y - p.py) * fr;
          p.px = p.x;
          p.py = p.y;
          const depth = i / n;
          p.x += vx + sway * depth * depth;
          p.y += vy + gr;
        }
        if (usePtr) {
          for (let i = 1, n = pts.length; i < n; i++) {
            const p = pts[i];
            const dx = p.x - ptr.x;
            const dy = p.y - ptr.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              const d = Math.sqrt(d2) || 0.0001;
              const f = 1 - d / R;
              const ff = f * f;
              const nx = dx / d;
              const ny = dy / d;
              p.x += nx * ff * push + mvx * ff * drag;
              p.y += ny * ff * push + mvy * ff * drag;
              if (ff > p.act) p.act = ff;
            }
          }
        }
        for (let it = 0; it < CFG.iters; it++) {
          for (let i = 0, n = pts.length - 1; i < n; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
            const diff = ((dist - CFG.segLen) / dist) * 0.5;
            const ox = dx * diff;
            const oy = dy * diff;
            if (!a.pinned) {
              a.x += ox;
              a.y += oy;
            }
            if (!b.pinned) {
              b.x -= ox;
              b.y -= oy;
            }
          }
        }
      }

      ptr.px = ptr.x;
      ptr.py = ptr.y;
    };

    const valancePathG = (g: CanvasRenderingContext2D) => {
      const top = facadeH;
      const scallopW = 34;
      const controlY = 2 * awningY - top;
      g.beginPath();
      g.moveTo(0, top);
      g.lineTo(W, top);
      for (let x = W; x > 0; x -= scallopW) {
        const nx = Math.max(0, x - scallopW);
        g.quadraticCurveTo(x - scallopW / 2, controlY, nx, top);
      }
      g.lineTo(0, top);
      g.closePath();
    };

    const drawStaticBackground = (g: CanvasRenderingContext2D) => {
      const lg = g.createLinearGradient(0, 0, 0, H);
      lg.addColorStop(0, "#0b1322");
      lg.addColorStop(0.45, "#070c17");
      lg.addColorStop(1, "#03050a");
      g.fillStyle = lg;
      g.fillRect(0, 0, W, H);

      const rg = g.createRadialGradient(
        W * 0.5,
        awningY * 0.5,
        8,
        W * 0.5,
        awningY * 0.5,
        Math.max(W, H) * 0.65
      );
      rg.addColorStop(0, "rgba(86,124,200,0.12)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);

      g.fillStyle = "#cfe0ff";
      for (let i = 0, n = stars.length; i < n; i++) {
        const s = stars[i];
        g.globalAlpha = s.base;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      const vg = g.createRadialGradient(
        W * 0.5,
        H * 0.55,
        Math.min(W, H) * 0.3,
        W * 0.5,
        H * 0.55,
        Math.max(W, H) * 0.75
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    };

    const drawStaticAwning = (g: CanvasRenderingContext2D) => {
      const top = facadeH;

      const fg = g.createLinearGradient(0, 0, 0, top);
      fg.addColorStop(0, "rgba(12,18,32,0.55)");
      fg.addColorStop(1, "rgba(12,18,32,0.2)");
      g.fillStyle = fg;
      g.fillRect(0, 0, W, top);

      g.fillStyle = "rgba(150,180,240,0.16)";
      g.fillRect(0, top - 1, W, 1);

      g.save();
      valancePathG(g);
      g.clip();

      g.transform(1, 0, 0.55, 1, 0, 0);
      const stripeW = 18;
      for (let x = -H; x < W + H; x += stripeW * 2) {
        const sg = g.createLinearGradient(x, top, x, awningY);
        sg.addColorStop(0, "rgba(40,58,96,0.16)");
        sg.addColorStop(1, "rgba(30,44,76,0.05)");
        g.fillStyle = sg;
        g.fillRect(x, top, stripeW, awningY - top + 24);
      }
      g.restore();

      g.save();
      valancePathG(g);
      g.clip();
      const sh = g.createLinearGradient(0, top, 0, awningY);
      sh.addColorStop(0, "rgba(120,150,210,0.04)");
      sh.addColorStop(0.55, "rgba(0,0,0,0)");
      sh.addColorStop(1, "rgba(0,0,0,0.32)");
      g.fillStyle = sh;
      g.fillRect(0, top, W, awningY - top + 8);
      g.restore();

      g.save();
      valancePathG(g);
      g.strokeStyle = "rgba(150,180,235,0.12)";
      g.lineWidth = 1;
      g.stroke();
      g.restore();

      for (let s = 0; s < strands.length; s += 2) {
        const x = strands[s].baseX;
        g.beginPath();
        g.arc(x, awningY, 1.4, 0, Math.PI * 2);
        g.fillStyle = "rgba(120,150,200,0.32)";
        g.fill();
      }
    };

    const rebuildBg = () => {
      if (!bgCanvas) bgCanvas = document.createElement("canvas");
      bgCanvas.width = canvas.width;
      bgCanvas.height = canvas.height;
      const g = bgCanvas.getContext("2d", { willReadFrequently: false });
      if (!g) return;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawStaticBackground(g);
      drawStaticAwning(g);
    };

    const drawCurtain = (now: number, fast: boolean) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = "lighter";

      if (!fast) {
        ctx.strokeStyle = "rgba(120,152,200,0.07)";
        ctx.beginPath();
        for (let s = 0, sl = strands.length; s < sl; s++) {
          const pts = strands[s].pts;
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1, n = pts.length; i < n; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
        }
        ctx.stroke();
      }

      const half = SPRITE_SIZE / 2;
      const every = CFG.letterEvery;
      const maxY = H + 40;
      const twBase = now * 0.0022;
      const fadeK = 0.4 / H;
      for (let s = 0, sl = strands.length; s < sl; s++) {
        const pts = strands[s].pts;
        for (let i = 2, n = pts.length; i < n; i += every) {
          const p = pts[i];
          if (p.y > maxY) continue;
          const prev = pts[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const ang = Math.atan2(dy, dx) - Math.PI / 2;
          const spd = Math.hypot(p.x - p.px, p.y - p.py);

          let a = 0.22 + Math.min(0.4, spd * 0.07);
          a += p.act * 0.55;
          if (p.twinkle > 0) {
            const tw = 0.5 + 0.5 * Math.sin(twBase * (p.twinkle * 8) + p.phase);
            a += p.twinkle * tw * 0.4;
          }
          a *= 1 - Math.min(0.4, p.y * fadeK);
          if (a < 0.04) continue;
          if (a > 1) a = 1;

          const spr = getSprite(p.ch, p.color);
          ctx.globalAlpha = a;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(ang);
          ctx.drawImage(spr, -half, -half);
          ctx.restore();
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const draw = (now: number, fast: boolean) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (bgCanvas)
        ctx.drawImage(
          bgCanvas,
          0,
          0,
          bgCanvas.width,
          bgCanvas.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawCurtain(now, fast);
    };

    const frame = () => {
      rafId = 0;
      const now = performance.now();
      if (!last) last = now;
      let dt = now - last;
      last = now;
      if (dt > 120) dt = 120;
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        step(now - acc);
        acc -= STEP;
        guard++;
      }
      const fast = !(ptr.has && (ptr.inside || Math.hypot(ptr.x - ptr.px, ptr.y - ptr.py) > 0.4));
      draw(now, fast);
      rafId = requestAnimationFrame(frame);
    };

    let last = 0;
    let acc = 0;
    const STEP = 1000 / 60;

    const toLocal = (clientX: number, clientY: number) => {
      ptr.x = clientX - rectCache.x;
      ptr.y = clientY - rectCache.y;
    };

    const onMouseMove = (e: MouseEvent) => {
      toLocal(e.clientX, e.clientY);
      if (ptr.px < -9000) {
        ptr.px = ptr.x;
        ptr.py = ptr.y;
      }
      ptr.has = true;
      ptr.inside = true;
    };
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) ptr.inside = false;
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      toLocal(t.clientX, t.clientY);
      ptr.px = ptr.x;
      ptr.py = ptr.y;
      ptr.has = true;
      ptr.inside = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      toLocal(t.clientX, t.clientY);
      ptr.has = true;
      ptr.inside = true;
      e.preventDefault();
    };
    const onTouchEnd = () => {
      ptr.inside = false;
    };

    resize();
    ptr.px = ptr.x;
    ptr.py = ptr.y;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const startLoop = () => {
      if (rafId || reducedMotion) return;
      last = 0;
      acc = 0;
      rafId = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (reducedMotion) draw(performance.now(), false);
    });
    ro.observe(canvas);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseout", onMouseOut);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    document.addEventListener("visibilitychange", onVisibility);

    if (reducedMotion) draw(performance.now(), false);
    else startLoop();

    return () => {
      stopLoop();
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseOut);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05070d]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "none" }}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 shadow-[0_0_40px_rgba(56,189,248,0.25)] backdrop-blur-sm">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
              <rect
                x="13"
                y="8"
                width="38"
                height="48"
                rx="6"
                className="fill-transparent stroke-sky-100"
                strokeWidth="2"
              />
              <rect
                x="20"
                y="18"
                width="24"
                height="3"
                rx="1.5"
                className="fill-sky-100 opacity-90"
              />
              <rect
                x="20"
                y="28"
                width="24"
                height="3"
                rx="1.5"
                className="fill-sky-100 opacity-55"
              />
              <rect
                x="20"
                y="38"
                width="18"
                height="3"
                rx="1.5"
                className="fill-sky-100 opacity-35"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-sky-50 sm:text-2xl">
            Markdown Notes
          </h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-sky-200/50">
            Write · Organize · Create
          </p>
        </div>

        <button
          onClick={onNewNote}
          className="pointer-events-auto group inline-flex items-center gap-2 rounded-xl bg-sky-400/90 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:bg-sky-300 hover:shadow-[0_16px_50px_rgba(56,189,248,0.6)]"
        >
          <svg
            className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          开始书写
        </button>

        <p className="mt-10 text-[11px] uppercase tracking-[0.3em] text-sky-200/35">
          用鼠标或手指划过字帘
        </p>
      </div>
    </div>
  );
}
