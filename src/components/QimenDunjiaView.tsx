import { useEffect, useRef } from "react";

const CENTER = 500;

const trigrams = [
  { name: "坎", symbol: "☵", angle: -90 },
  { name: "艮", symbol: "☶", angle: -45 },
  { name: "震", symbol: "☳", angle: 0 },
  { name: "巽", symbol: "☴", angle: 45 },
  { name: "离", symbol: "☲", angle: 90 },
  { name: "坤", symbol: "☷", angle: 135 },
  { name: "兑", symbol: "☱", angle: 180 },
  { name: "乾", symbol: "☰", angle: 225 },
];

const gates = ["休", "生", "伤", "杜", "景", "死", "惊", "开"];
const stars = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
const spirits = ["值符", "螣蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
const palaces = ["一坎", "二坤", "三震", "四巽", "五中", "六乾", "七兑", "八艮", "九离"];
const heavenStems = [
  "天甲",
  "天乙",
  "天丙",
  "天丁",
  "天戊",
  "天己",
  "天庚",
  "天辛",
  "天壬",
  "天癸",
];
const earthStems = ["地甲", "地乙", "地丙", "地丁", "地戊", "地己", "地庚", "地辛", "地壬", "地癸"];
const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const mountains = [
  "子",
  "癸",
  "丑",
  "艮",
  "寅",
  "甲",
  "卯",
  "乙",
  "辰",
  "巽",
  "巳",
  "丙",
  "午",
  "丁",
  "未",
  "坤",
  "申",
  "庚",
  "酉",
  "辛",
  "戌",
  "乾",
  "亥",
  "壬",
];

const spinLayers = [
  { key: "center", acceleration: 0.000018, maxSpeed: 0.14, friction: 0.972 },
  { key: "earth", acceleration: -0.000006, maxSpeed: 0.05, friction: 0.982 },
  { key: "human", acceleration: 0.00001, maxSpeed: 0.08, friction: 0.978 },
  { key: "heaven", acceleration: -0.000014, maxSpeed: 0.105, friction: 0.976 },
  { key: "spirit", acceleration: 0.000018, maxSpeed: 0.13, friction: 0.974 },
  { key: "subtle", acceleration: -0.000004, maxSpeed: 0.035, friction: 0.984 },
  { key: "mountain", acceleration: 0.000003, maxSpeed: 0.028, friction: 0.986 },
] as const;

type SpinLayerKey = (typeof spinLayers)[number]["key"];
interface QimenDunjiaViewProps {
  onBack: () => void;
}

function polar(radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function rotateText(angle: number, radius: number) {
  const point = polar(radius, angle);
  return `translate(${point.x} ${point.y}) rotate(${angle + 90})`;
}

function radialLine(angle: number, inner: number, outer: number) {
  const start = polar(inner, angle);
  const end = polar(outer, angle);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

export function QimenDunjiaView({ onBack }: QimenDunjiaViewProps) {
  const hoverRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const layerRefs = useRef<Record<SpinLayerKey, SVGGElement | null>>({
    center: null,
    earth: null,
    human: null,
    heaven: null,
    spirit: null,
    subtle: null,
    mountain: null,
  });
  const motionRef = useRef<Record<SpinLayerKey, { angle: number; speed: number }>>({
    center: { angle: 0, speed: 0 },
    earth: { angle: 0, speed: 0 },
    human: { angle: 0, speed: 0 },
    heaven: { angle: 0, speed: 0 },
    spirit: { angle: 0, speed: 0 },
    subtle: { angle: 0, speed: 0 },
    mountain: { angle: 0, speed: 0 },
  });

  function setLayerRef(key: SpinLayerKey) {
    return (node: SVGGElement | null) => {
      layerRefs.current[key] = node;
    };
  }

  function animate(time: number) {
    const lastTime = lastTimeRef.current ?? time;
    const delta = Math.min(time - lastTime, 32);
    lastTimeRef.current = time;
    let shouldContinue = hoverRef.current;

    for (const layer of spinLayers) {
      const motion = motionRef.current[layer.key];
      if (hoverRef.current) {
        motion.speed += layer.acceleration * delta;
        motion.speed = Math.max(-layer.maxSpeed, Math.min(layer.maxSpeed, motion.speed));
      } else {
        motion.speed *= Math.pow(layer.friction, delta / 16.67);
        if (Math.abs(motion.speed) < 0.0008) motion.speed = 0;
      }

      motion.angle = (motion.angle + motion.speed * delta) % 360;
      layerRefs.current[layer.key]?.setAttribute(
        "transform",
        `rotate(${motion.angle} ${CENTER} ${CENTER})`
      );
      if (motion.speed !== 0) shouldContinue = true;
    }

    if (shouldContinue) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      frameRef.current = null;
      lastTimeRef.current = null;
    }
  }

  function startAnimation() {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(animate);
  }

  function handlePointerEnter() {
    hoverRef.current = true;
    startAnimation();
  }

  function handlePointerLeave() {
    hoverRef.current = false;
    startAnimation();
  }

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="qimen-page qimen-page--minimal">
      <header className="qimen-header qimen-header--minimal">
        <button type="button" onClick={onBack} className="qimen-back-btn">
          返回笔记
        </button>
        <div>
          <p className="qimen-kicker">Fenghou Qimen</p>
          <h1>太极八卦奇门图</h1>
        </div>
        <div className="qimen-date-card">
          <span>悬浮旋转</span>
          <strong>分层异速</strong>
        </div>
      </header>

      <main className="qimen-layout qimen-layout--minimal">
        <svg
          className="qimen-svg"
          viewBox="0 0 1000 1000"
          role="img"
          aria-label="太极八卦奇门图"
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <rect width="1000" height="1000" fill="#fff" />
          <g className="qimen-layer qimen-layer--rings">
            <circle className="qimen-ring-line" cx={CENTER} cy={CENTER} r="110" />
            <circle className="qimen-ring-line" cx={CENTER} cy={CENTER} r="205" />
            <circle className="qimen-ring-line" cx={CENTER} cy={CENTER} r="305" />
            <circle className="qimen-ring-line" cx={CENTER} cy={CENTER} r="405" />
            <circle
              className="qimen-ring-line qimen-ring-line--outer"
              cx={CENTER}
              cy={CENTER}
              r="485"
            />
            {mountains.map((mountain, index) => {
              const major = index % 3 === 0;
              const line = radialLine(index * 15 - 90, major ? 460 : 472, 492);
              return (
                <line
                  key={`tick-${mountain}-${index}`}
                  className={
                    major ? "qimen-mountain-tick qimen-mountain-tick--major" : "qimen-mountain-tick"
                  }
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                />
              );
            })}
          </g>

          <g ref={setLayerRef("center")} className="qimen-layer qimen-layer--center">
            <circle cx={CENTER} cy={CENTER} r="82" fill="#fff" stroke="#000" strokeWidth="2" />
            <path d="M500 418a82 82 0 0 1 0 164a41 41 0 0 0 0-82a41 41 0 0 1 0-82z" fill="#000" />
            <path d="M500 418a41 41 0 0 0 0 82a41 41 0 0 1 0 82a82 82 0 0 1 0-164z" fill="#fff" />
            <circle cx="500" cy="459" r="12" fill="#fff" />
            <circle cx="500" cy="541" r="12" fill="#000" />
          </g>

          <g ref={setLayerRef("earth")} className="qimen-layer qimen-layer--earth">
            {trigrams.map(item => (
              <g key={item.name} transform={rotateText(item.angle, 170)}>
                <text className="qimen-trigram-symbol-svg" y="-9">
                  {item.symbol}
                </text>
                <text className="qimen-trigram-name-svg" y="24">
                  {item.name}
                </text>
              </g>
            ))}
          </g>

          <g ref={setLayerRef("human")} className="qimen-layer qimen-layer--human">
            {gates.map((gate, index) => (
              <text
                key={gate}
                className="qimen-ring-text qimen-ring-text--primary"
                transform={rotateText(index * 45 - 90, 255)}
              >
                {gate}门
              </text>
            ))}
          </g>

          <g ref={setLayerRef("heaven")} className="qimen-layer qimen-layer--heaven">
            {stars.map((star, index) => (
              <text
                key={star}
                className="qimen-ring-text"
                transform={rotateText(index * 40 - 90, 350)}
              >
                {star}
              </text>
            ))}
          </g>

          <g ref={setLayerRef("spirit")} className="qimen-layer qimen-layer--spirit">
            {spirits.map((spirit, index) => (
              <text
                key={spirit}
                className="qimen-ring-text"
                transform={rotateText(index * 45 - 90, 445)}
              >
                {spirit}
              </text>
            ))}
          </g>

          <g
            ref={setLayerRef("subtle")}
            className="qimen-layer qimen-subtle-layer"
            aria-hidden="true"
          >
            {palaces.map((palace, index) => (
              <text key={palace} transform={rotateText(index * 40 - 90, 118)}>
                {palace}
              </text>
            ))}
            {heavenStems.map((stem, index) => (
              <text key={stem} transform={rotateText(index * 36 - 90, 305)}>
                {stem}
              </text>
            ))}
            {earthStems.map((stem, index) => (
              <text key={stem} transform={rotateText(index * 36 - 72, 390)}>
                {stem}
              </text>
            ))}
            {branches.map((branch, index) => (
              <text key={branch} transform={rotateText(index * 30 - 90, 470)}>
                {branch}
              </text>
            ))}
          </g>

          <g
            ref={setLayerRef("mountain")}
            className="qimen-layer qimen-mountain-layer"
            aria-label="二十四山"
          >
            {mountains.map((mountain, index) => (
              <text key={`${mountain}-${index}`} transform={rotateText(index * 15 - 90, 468)}>
                {mountain}
              </text>
            ))}
          </g>
        </svg>
      </main>
    </div>
  );
}
