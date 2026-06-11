import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Particles, ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useTheme } from "@context";
import type { ISourceOptions } from "@tsparticles/engine";

interface ParticleBackgroundProps {
  hidden?: boolean;
  isMobile?: boolean;
}

const initEngine = async (engine: import("@tsparticles/engine").Engine) => {
  await loadSlim(engine);
};

function ParticleCanvas({ options }: { options: ISourceOptions }) {
  return (
    <Particles id="app-particles" options={options} style={{ position: "absolute", inset: 0 }} />
  );
}

export default function ParticleBackground({ hidden, isMobile }: ParticleBackgroundProps) {
  const { theme } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const options: ISourceOptions = useMemo(() => {
    const isDark = theme === "dark";

    const nodeColor = isDark ? "#38bdf8" : "#0284c7";
    const edgeColor = isDark ? "#0ea5e9" : "#0ea5e9";
    const glowColor = isDark ? "#0369a1" : "#bae6fd";
    const pulseColor = isDark ? "#7dd3fc" : "#7dd3fc";
    if (reduceMotion || isMobile) {
      return {
        fullScreen: false,
        fpsLimit: 20,
        background: { color: { value: "transparent" } },
        particles: {
          number: { value: 25, density: { enable: true, width: 1400, height: 900 } },
          color: { value: nodeColor },
          opacity: { value: { min: 0.15, max: 0.4 } },
          shape: { type: "polygon", options: { polygon: { sides: 6 } } },
          size: { value: { min: 2, max: 4 } },
          stroke: { color: glowColor, width: 0.5 },
          move: { enable: false },
        },
        detectRetina: true,
      };
    }

    return {
      fullScreen: false,
      fpsLimit: 60,
      background: { color: { value: "transparent" } },
      particles: {
        number: { value: 55, density: { enable: true, width: 1400, height: 900 } },
        color: { value: [nodeColor, pulseColor, glowColor] },
        opacity: {
          value: { min: 0.25, max: 0.6 },
          animation: {
            enable: true,
            speed: 0.8,
            sync: false,
            minimumValue: 0.15,
          },
        },
        shape: { type: "polygon", options: { polygon: { sides: 6 } } },
        size: {
          value: { min: 2, max: 5 },
          animation: {
            enable: true,
            speed: 1.5,
            sync: false,
            minimumValue: 1.5,
          },
        },
        stroke: { color: glowColor, width: 0.4 },
        move: {
          enable: true,
          speed: 0.4,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "bounce" },
        },
        links: {
          enable: true,
          distance: 120,
          color: edgeColor,
          opacity: {
            value: 0.2,
            animation: {
              enable: true,
              speed: 0.6,
              minimumValue: 0.08,
            },
          },
          width: { value: 0.6, animation: { enable: true, speed: 0.4, minimumValue: 0.2 } },
          triangles: { enable: true, opacity: 0.06, color: glowColor },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
          onClick: { enable: true, mode: "push" },
        },
        modes: {
          grab: {
            distance: 160,
            links: { opacity: 0.5, color: pulseColor },
          },
          push: { quantity: 3 },
        },
      },
      detectRetina: true,
    };
  }, [theme, reduceMotion, isMobile]);

  if (hidden || reduceMotion) return null;

  const containerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "auto",
  };

  return (
    <div className="particle-background" style={containerStyle}>
      <ParticlesProvider init={initEngine}>
        <ParticleCanvas options={options} />
      </ParticlesProvider>
    </div>
  );
}
