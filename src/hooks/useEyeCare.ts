import { useState, useEffect, useRef } from "react";

interface EyeCareState {
  warmth: number;
  isActive: boolean;
}

function getSunTimes(): { sunrise: number; sunset: number } {
  const now = new Date();
  const month = now.getMonth();
  const baseSunrise = 6;
  const baseSunset = 18;
  const seasonalOffset = Math.sin(((month - 3) / 12) * Math.PI * 2) * 1.5;
  return {
    sunrise: baseSunrise + seasonalOffset,
    sunset: baseSunset - seasonalOffset,
  };
}

function calcWarmth(): number {
  if (!window.matchMedia("(prefers-color-scheme: dark)").matches) {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const { sunrise, sunset } = getSunTimes();

    if (hour >= sunset) {
      const progress = Math.min(1, (hour - sunset) / 3);
      return 15 + progress * 25;
    }
    if (hour <= sunrise) {
      const progress = Math.min(1, (sunrise - hour) / 2);
      return 15 + progress * 25;
    }
    if (hour >= sunset - 1) {
      return (hour - (sunset - 1)) * 15;
    }
    if (hour <= sunrise + 0.5) {
      return (sunrise + 0.5 - hour) * 30;
    }
    return 0;
  }
  return 0;
}

function applyStyle(styleEl: HTMLStyleElement, warmth: number) {
  if (warmth > 0.5) {
    const sepia = Math.min(0.2, (warmth / 100) * 0.2);
    const saturate = 1 + (warmth / 100) * 0.1;
    styleEl.textContent = `.app-shell { filter: sepia(${sepia}) saturate(${saturate}) !important; }`;
  } else {
    styleEl.textContent = "";
  }
}

export function useEyeCare(enabled: boolean) {
  const [state, setState] = useState<EyeCareState>({ warmth: 0, isActive: false });
  const timerRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const styleElRef = useRef<HTMLStyleElement | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const scheduleNext = useRef(() => {
    const now = new Date();
    const nextMinute = (60 - now.getSeconds()) * 1000;
    timerRef.current = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => {
        if (!enabledRef.current) return;
        const warmth = calcWarmth();
        setState({ warmth, isActive: warmth > 0.5 });
        if (styleElRef.current) applyStyle(styleElRef.current, warmth);
        scheduleNext.current();
      });
    }, nextMinute);
  });

  useEffect(() => {
    if (!enabled) {
      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }
      clearTimeout(timerRef.current);
      return;
    }

    if (!styleElRef.current) {
      styleElRef.current = document.createElement("style");
      styleElRef.current.id = "eyecare-filter";
      document.head.appendChild(styleElRef.current);
    }

    const warmth = calcWarmth();
    /* eslint-disable react-hooks/set-state-in-effect -- syncing external time data into state */
    setState({ warmth, isActive: warmth > 0.5 });
    /* eslint-enable react-hooks/set-state-in-effect */
    applyStyle(styleElRef.current, warmth);
    scheduleNext.current();

    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  const phaseLabel = state.warmth > 30 ? "深夜模式" : state.warmth > 10 ? "黄昏暖光" : "日光模式";

  return { ...state, phaseLabel };
}
