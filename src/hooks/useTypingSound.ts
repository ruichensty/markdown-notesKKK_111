import { useCallback, useRef, useEffect } from "react";

export function useTypingSound(enabled: boolean, volume = 0.15) {
  const ctxRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBuffer | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const getNoise = useCallback((sampleRate: number, duration = 0.04) => {
    if (noiseRef.current) return noiseRef.current;
    const length = Math.floor(sampleRate * duration);
    const buffer = new AudioBuffer({ length, sampleRate });
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.008));
    }
    noiseRef.current = buffer;
    return buffer;
  }, []);

  const playKey = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      const noise = getNoise(ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = noise;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * (0.7 + Math.random() * 0.6), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2000 + Math.random() * 3000, now);
      filter.Q.setValueAtTime(1 + Math.random() * 2, now);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      source.stop(now + 0.05);
    } catch {
      /* ignore audio errors */
    }
  }, [enabled, volume, getCtx, getNoise]);

  const playEnter = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      /* ignore */
    }
  }, [enabled, volume, getCtx]);

  const playBackspace = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      /* ignore */
    }
  }, [enabled, volume, getCtx]);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      ctxRef.current = null;
      noiseRef.current = null;
    };
  }, []);

  return { playKey, playEnter, playBackspace };
}
