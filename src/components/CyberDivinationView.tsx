import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  createCyberReading,
  cyberBranches,
  cyberEarthStems,
  cyberGates,
  cyberHeavenStems,
  cyberHexagrams,
  cyberJiazi,
  cyberMansions,
  cyberMountains,
  cyberPalaces,
  cyberSpirits,
  cyberStars,
  cyberTrigrams,
  type CyberReading,
} from "@utils/qimenReading";

const CENTER = 500;

const dataBits = Array.from({ length: 48 }, (_, index) => ({
  id: index,
  label: index % 5 === 0 ? "01" : index % 3 === 0 ? "10" : index % 2 === 0 ? "0" : "1",
  angle: index * 7.5 - 90,
  radius: 555 + (index % 4) * 24,
  drift: index % 2 === 0 ? 1 : -1,
  delay: `${(index % 12) * 0.08}s`,
}));

const cyberLayers = [
  { key: "core", acceleration: 0.00002, maxSpeed: 0.12, lockFriction: 0.9 },
  { key: "trigram", acceleration: -0.000008, maxSpeed: 0.045, lockFriction: 0.92 },
  { key: "gate", acceleration: 0.000014, maxSpeed: 0.085, lockFriction: 0.89 },
  { key: "star", acceleration: -0.000017, maxSpeed: 0.105, lockFriction: 0.88 },
  { key: "spirit", acceleration: 0.000021, maxSpeed: 0.13, lockFriction: 0.87 },
  { key: "palace", acceleration: -0.000004, maxSpeed: 0.026, lockFriction: 0.94 },
  { key: "heavenStem", acceleration: 0.000009, maxSpeed: 0.058, lockFriction: 0.91 },
  { key: "earthStem", acceleration: -0.000005, maxSpeed: 0.032, lockFriction: 0.94 },
  { key: "branch", acceleration: 0.000004, maxSpeed: 0.028, lockFriction: 0.95 },
  { key: "mountain", acceleration: -0.000006, maxSpeed: 0.04, lockFriction: 0.93 },
  { key: "hexagram", acceleration: 0.000003, maxSpeed: 0.024, lockFriction: 0.955 },
  { key: "mansion", acceleration: -0.000004, maxSpeed: 0.03, lockFriction: 0.95 },
  { key: "jiazi", acceleration: 0.000002, maxSpeed: 0.018, lockFriction: 0.96 },
] as const;

type CyberLayerKey = (typeof cyberLayers)[number]["key"];
type CyberPhase = "idle" | "spinning" | "locking" | "revealed";

interface CyberDivinationViewProps {
  onBack: () => void;
  onOpenQimen: () => void;
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

function createOracleId(reading: CyberReading) {
  let hash = 0;
  for (const char of reading.code) {
    hash = (hash * 31 + char.charCodeAt(0)) % 0xfffff;
  }
  return `QMDJ-${hash.toString(16).toUpperCase().padStart(5, "0")}`;
}

export function CyberDivinationView({ onBack, onOpenQimen }: CyberDivinationViewProps) {
  const phaseRef = useRef<CyberPhase>("idle");
  const frameRef = useRef<number | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const layerRefs = useRef<Record<CyberLayerKey, SVGGElement | null>>({
    core: null,
    trigram: null,
    gate: null,
    star: null,
    spirit: null,
    palace: null,
    heavenStem: null,
    earthStem: null,
    branch: null,
    mountain: null,
    hexagram: null,
    mansion: null,
    jiazi: null,
  });
  const motionRef = useRef<Record<CyberLayerKey, { angle: number; speed: number }>>({
    core: { angle: 0, speed: 0 },
    trigram: { angle: 0, speed: 0 },
    gate: { angle: 0, speed: 0 },
    star: { angle: 0, speed: 0 },
    spirit: { angle: 0, speed: 0 },
    palace: { angle: 0, speed: 0 },
    heavenStem: { angle: 0, speed: 0 },
    earthStem: { angle: 0, speed: 0 },
    branch: { angle: 0, speed: 0 },
    mountain: { angle: 0, speed: 0 },
    hexagram: { angle: 0, speed: 0 },
    mansion: { angle: 0, speed: 0 },
    jiazi: { angle: 0, speed: 0 },
  });
  const [phase, setPhase] = useState<CyberPhase>("idle");
  const [reading, setReading] = useState<CyberReading | null>(null);

  function setLayerRef(key: CyberLayerKey) {
    return (node: SVGGElement | null) => {
      layerRefs.current[key] = node;
    };
  }

  function setPhaseState(next: CyberPhase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function revealReading() {
    const current = motionRef.current;
    setReading(
      createCyberReading({
        trigramAngle: current.trigram.angle,
        gateAngle: current.gate.angle,
        starAngle: current.star.angle,
        spiritAngle: current.spirit.angle,
        palaceAngle: current.palace.angle,
        heavenStemAngle: current.heavenStem.angle,
        earthStemAngle: current.earthStem.angle,
        branchAngle: current.branch.angle,
        mountainAngle: current.mountain.angle,
        hexagramAngle: current.hexagram.angle,
        mansionAngle: current.mansion.angle,
        jiaziAngle: current.jiazi.angle,
      })
    );
    setPhaseState("revealed");
  }

  function animate(time: number) {
    const lastTime = lastTimeRef.current ?? time;
    const delta = Math.min(time - lastTime, 32);
    lastTimeRef.current = time;
    const shouldContinue = phaseRef.current === "spinning" || phaseRef.current === "locking";
    let allStopped = phaseRef.current === "locking";

    for (const layer of cyberLayers) {
      const motion = motionRef.current[layer.key];
      if (phaseRef.current === "spinning") {
        motion.speed += layer.acceleration * delta;
        motion.speed = Math.max(-layer.maxSpeed, Math.min(layer.maxSpeed, motion.speed));
      } else if (phaseRef.current === "locking") {
        motion.speed *= Math.pow(layer.lockFriction, delta / 16.67);
        if (Math.abs(motion.speed) < 0.001) motion.speed = 0;
        if (motion.speed !== 0) allStopped = false;
      }

      motion.angle = (motion.angle + motion.speed * delta) % 360;
      layerRefs.current[layer.key]?.setAttribute(
        "transform",
        `rotate(${motion.angle} ${CENTER} ${CENTER})`
      );
    }

    if (allStopped) {
      frameRef.current = null;
      lastTimeRef.current = null;
      revealReading();
      return;
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

  function beginSpin() {
    if (phaseRef.current === "locking") return;
    if (lockTimerRef.current !== null) window.clearTimeout(lockTimerRef.current);
    setReading(null);
    setPhaseState("spinning");
    startAnimation();
    lockTimerRef.current = window.setTimeout(() => {
      lockTimerRef.current = null;
      if (phaseRef.current === "spinning") {
        setPhaseState("locking");
        startAnimation();
      }
    }, 2800);
  }

  function reset() {
    if (lockTimerRef.current !== null) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    setReading(null);
    setPhaseState("idle");
    for (const layer of cyberLayers) {
      motionRef.current[layer.key] = { angle: 0, speed: 0 };
      layerRefs.current[layer.key]?.setAttribute("transform", `rotate(0 ${CENTER} ${CENTER})`);
    }
  }

  useEffect(() => {
    return () => {
      if (lockTimerRef.current !== null) window.clearTimeout(lockTimerRef.current);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="cyber-page">
      <header className="cyber-header">
        <button type="button" onClick={onBack} className="cyber-nav-btn">
          返回笔记
        </button>
        <div>
          <p>Cyber Oracle</p>
          <h1>赛博算卦</h1>
        </div>
        <button type="button" onClick={onOpenQimen} className="cyber-nav-btn">
          奇门图
        </button>
      </header>
      <p className="oracle-disclaimer">
        提示：赛博算卦仅供娱乐和灵感参考，不作为决策、预测或专业建议依据。
      </p>

      <main className="cyber-layout">
        <section className={`cyber-oracle cyber-oracle--${phase}`}>
          <div
            className={`cyber-oracle-stage ${phase === "locking" ? "cyber-oracle-stage--locking" : ""}`}
          >
            <svg
              className="cyber-svg"
              viewBox="-190 -190 1380 1380"
              role="img"
              aria-label="赛博算卦图"
            >
              <rect x="-190" y="-190" width="1380" height="1380" fill="#fff" />
              <g className="cyber-data-field" aria-hidden="true">
                {dataBits.map(bit => {
                  const point = polar(bit.radius, bit.angle);
                  return (
                    <text
                      key={bit.id}
                      x={point.x}
                      y={point.y}
                      style={
                        {
                          "--bit-drift": bit.drift,
                          "--bit-delay": bit.delay,
                        } as CSSProperties
                      }
                    >
                      {bit.label}
                    </text>
                  );
                })}
              </g>
              <circle className="cyber-ring" cx={CENTER} cy={CENTER} r="120" />
              <circle className="cyber-ring cyber-ring--subtle" cx={CENTER} cy={CENTER} r="155" />
              <circle className="cyber-ring" cx={CENTER} cy={CENTER} r="210" />
              <circle className="cyber-ring cyber-ring--subtle" cx={CENTER} cy={CENTER} r="255" />
              <circle className="cyber-ring" cx={CENTER} cy={CENTER} r="300" />
              <circle className="cyber-ring cyber-ring--subtle" cx={CENTER} cy={CENTER} r="345" />
              <circle className="cyber-ring" cx={CENTER} cy={CENTER} r="390" />
              <circle className="cyber-ring cyber-ring--subtle" cx={CENTER} cy={CENTER} r="430" />
              <circle className="cyber-ring" cx={CENTER} cy={CENTER} r="470" />
              <circle className="cyber-ring cyber-ring--subtle" cx={CENTER} cy={CENTER} r="515" />
              <circle className="cyber-ring" cx={CENTER} cy={CENTER} r="565" />
              <circle className="cyber-ring cyber-ring--subtle" cx={CENTER} cy={CENTER} r="615" />

              <g ref={setLayerRef("core")} className="cyber-layer cyber-core">
                <circle cx={CENTER} cy={CENTER} r="76" fill="#fff" stroke="#000" strokeWidth="2" />
                <path
                  d="M500 424a76 76 0 0 1 0 152a38 38 0 0 0 0-76a38 38 0 0 1 0-76z"
                  fill="#000"
                />
                <path
                  d="M500 424a38 38 0 0 0 0 76a38 38 0 0 1 0 76a76 76 0 0 1 0-152z"
                  fill="#fff"
                />
                <circle cx="500" cy="462" r="10" fill="#fff" />
                <circle cx="500" cy="538" r="10" fill="#000" />
              </g>

              <g ref={setLayerRef("trigram")} className="cyber-layer">
                {cyberTrigrams.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--trigram"
                    transform={rotateText(index * 45 - 90, 170)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("palace")} className="cyber-layer cyber-aux-layer">
                {cyberPalaces.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--aux"
                    transform={rotateText(index * 40 - 90, 128)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("gate")} className="cyber-layer">
                {cyberGates.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--gate"
                    transform={rotateText(index * 45 - 90, 255)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("heavenStem")} className="cyber-layer cyber-aux-layer">
                {cyberHeavenStems.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--stem"
                    transform={rotateText(index * 36 - 90, 300)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("star")} className="cyber-layer">
                {cyberStars.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text"
                    transform={rotateText(index * 40 - 90, 345)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("earthStem")} className="cyber-layer cyber-aux-layer">
                {cyberEarthStems.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--stem"
                    transform={rotateText(index * 36 - 72, 382)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("spirit")} className="cyber-layer">
                {cyberSpirits.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text"
                    transform={rotateText(index * 45 - 90, 425)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("branch")} className="cyber-layer cyber-aux-layer">
                {cyberBranches.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--branch"
                    transform={rotateText(index * 30 - 90, 450)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("mountain")} className="cyber-layer cyber-mountain-layer">
                {cyberMountains.map((item, index) => (
                  <text
                    key={`${item}-${index}`}
                    className="cyber-text cyber-text--mountain"
                    transform={rotateText(index * 15 - 90, 485)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("hexagram")} className="cyber-layer cyber-hexagram-layer">
                {cyberHexagrams.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--hexagram"
                    transform={rotateText(index * 5.625 - 90, 526)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("mansion")} className="cyber-layer cyber-mansion-layer">
                {cyberMansions.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--mansion"
                    transform={rotateText(index * (360 / cyberMansions.length) - 90, 570)}
                  >
                    {item}
                  </text>
                ))}
              </g>

              <g ref={setLayerRef("jiazi")} className="cyber-layer cyber-jiazi-layer">
                {cyberJiazi.map((item, index) => (
                  <text
                    key={item}
                    className="cyber-text cyber-text--jiazi"
                    transform={rotateText(index * 6 - 90, 622)}
                  >
                    {item}
                  </text>
                ))}
              </g>
            </svg>

            {phase === "locking" && (
              <div className="cyber-lock-overlay" aria-hidden="true">
                <span className="cyber-lock-sweep cyber-lock-sweep--vertical" />
                <span className="cyber-lock-sweep cyber-lock-sweep--horizontal" />
                <span className="cyber-lock-corner cyber-lock-corner--tl" />
                <span className="cyber-lock-corner cyber-lock-corner--tr" />
                <span className="cyber-lock-corner cyber-lock-corner--bl" />
                <span className="cyber-lock-corner cyber-lock-corner--br" />
                <div className="cyber-lock-targets">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="cyber-lock-readout">
                  <span>01 FIELD SCAN</span>
                  <span>02 GATE SYNC</span>
                  <span>03 STAR MATCH</span>
                  <span>04 HEXAGRAM LOCK</span>
                </div>
              </div>
            )}
            {(phase === "spinning" || phase === "locking") && (
              <div className="cyber-motion-effects" aria-hidden="true">
                <span className="cyber-motion-ring cyber-motion-ring--one" />
                <span className="cyber-motion-ring cyber-motion-ring--two" />
                <span className="cyber-motion-ring cyber-motion-ring--three" />
                <span className="cyber-motion-line cyber-motion-line--a" />
                <span className="cyber-motion-line cyber-motion-line--b" />
                <span className="cyber-motion-line cyber-motion-line--c" />
                <span className="cyber-glitch-band cyber-glitch-band--top" />
                <span className="cyber-glitch-band cyber-glitch-band--bottom" />
              </div>
            )}
            <div className="cyber-reticle" aria-hidden="true">
              <span className="cyber-reticle-line cyber-reticle-line--x" />
              <span className="cyber-reticle-line cyber-reticle-line--y" />
              <span className="cyber-reticle-ring" />
            </div>
          </div>

          <button
            type="button"
            className="cyber-cast-btn"
            onClick={phase === "spinning" || phase === "locking" ? undefined : beginSpin}
            disabled={phase === "spinning" || phase === "locking"}
          >
            {phase === "locking" ? "LOCKING" : phase === "spinning" ? "CASTING" : "起卦"}
          </button>
        </section>

        <aside className="cyber-panel">
          <div className="cyber-panel-label">Oracle Output</div>
          {reading ? (
            <>
              <div className="cyber-oracle-id">ORACLE-ID: {createOracleId(reading)}</div>
              <div className="cyber-code">{reading.code}</div>
              <div className="cyber-terminal-lines" aria-label="锁定序列">
                <span>&gt; FIELD CAPTURED</span>
                <span>&gt; GATE: {reading.gate}</span>
                <span>&gt; STAR: {reading.star}</span>
                <span>&gt; HEXAGRAM: {reading.hexagram}</span>
                <span>&gt; MANSION: {reading.mansion}</span>
                <span>&gt; RESULT LOCKED</span>
              </div>
              <dl className="cyber-reading-grid">
                <div>
                  <dt>卦象</dt>
                  <dd>{reading.trigram}</dd>
                </div>
                <div>
                  <dt>八门</dt>
                  <dd>{reading.gate}</dd>
                </div>
                <div>
                  <dt>九星</dt>
                  <dd>{reading.star}</dd>
                </div>
                <div>
                  <dt>八神</dt>
                  <dd>{reading.spirit}</dd>
                </div>
                <div>
                  <dt>九宫</dt>
                  <dd>{reading.palace}</dd>
                </div>
                <div>
                  <dt>本卦</dt>
                  <dd>{reading.hexagram}</dd>
                </div>
                <div>
                  <dt>天盘干</dt>
                  <dd>{reading.heavenStem}</dd>
                </div>
                <div>
                  <dt>地盘干</dt>
                  <dd>{reading.earthStem}</dd>
                </div>
                <div>
                  <dt>地支</dt>
                  <dd>{reading.branch}</dd>
                </div>
                <div>
                  <dt>方位</dt>
                  <dd>{reading.mountain}</dd>
                </div>
                <div>
                  <dt>二十八宿</dt>
                  <dd>{reading.mansion}</dd>
                </div>
                <div>
                  <dt>六十甲子</dt>
                  <dd>{reading.jiazi}</dd>
                </div>
              </dl>
              <p>{reading.summary}</p>
              <strong>建议：{reading.advice}</strong>
              <span>风险：{reading.risk}</span>
              <button type="button" onClick={reset}>
                重新起卦
              </button>
            </>
          ) : (
            <>
              <div className="cyber-code">AWAITING SIGNAL</div>
              <p>点击「起卦」启动赛博盘。系统会自动完成旋转、扫描、锁定，并生成本地解读。</p>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
