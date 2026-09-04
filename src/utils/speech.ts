export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stripMarkdownForSpeech(text: string): string {
  let result = text;

  result = result.replace(/```[\s\S]*?```/g, " ");
  result = result.replace(/`([^`]*)`/g, "$1");
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  result = result.replace(/^#{1,6}\s+/gm, "");
  result = result.replace(/^>\s?/gm, "");
  result = result.replace(/^(\s*)[-*+]\s+/gm, "$1");
  result = result.replace(/^(\s*)\d+[.)]\s+/gm, "$1");
  result = result.replace(/(\*\*|__|\*|_|~~)/g, "");
  result = result.replace(/^[-*_=\s]{3,}$/gm, " ");
  result = result.replace(/^\|(.+)\|$/gm, "$1");
  result = result.replace(/\|/g, "，");
  result = result.replace(/\n{2,}/g, "\n");

  return result.trim();
}

export function splitIntoChunks(text: string, maxLen = 200): string[] {
  const chunks: string[] = [];
  let buffer = "";

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) chunks.push(trimmed);
    buffer = "";
  };

  const parts = text.split(/(?<=[。！？!?；;])/);
  for (const part of parts) {
    if ((buffer + part).length > maxLen) {
      flush();
      if (part.length > maxLen) {
        let rest = part;
        while (rest.length > maxLen) {
          const slice = rest.slice(0, maxLen);
          const softCut = Math.max(
            slice.lastIndexOf("，"),
            slice.lastIndexOf("、"),
            slice.lastIndexOf(","),
            slice.lastIndexOf(" ")
          );
          const cut = softCut > maxLen * 0.5 ? softCut + 1 : maxLen;
          const piece = rest.slice(0, cut).trim();
          if (piece) chunks.push(piece);
          rest = rest.slice(cut);
        }
        buffer = rest;
      } else {
        buffer = part;
      }
    } else {
      buffer += part;
    }
  }
  flush();

  return chunks;
}

export function getVoicesAsync(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (!isSpeechSupported()) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };

    synth.addEventListener("voiceschanged", finish);
    window.setTimeout(finish, timeoutMs);
  });
}

const PREFERRED_VOICE_PATTERNS: RegExp[] = [
  /xiaoxiao|晓晓/i,
  /yunxi|云希/i,
  /yunyang|云扬/i,
  /huihui|慧慧/i,
  /yaoyao|瑶瑶/i,
  /kangkang|康康/i,
  /google/i,
];

export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const zh = voices.filter(v => /^zh([-_]|$)/i.test(v.lang) || /普通话|中文/i.test(v.name));
  if (zh.length === 0) return voices[0];
  for (const pattern of PREFERRED_VOICE_PATTERNS) {
    const found = zh.find(v => pattern.test(v.name));
    if (found) return found;
  }
  return zh.find(v => v.localService) ?? zh[0];
}

export function findVoiceByName(
  voices: SpeechSynthesisVoice[],
  name: string
): SpeechSynthesisVoice | null {
  if (!name) return null;
  return voices.find(v => v.name === name) ?? null;
}

export interface SpeakTextOptions {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

let speakEpoch = 0;
let activeSession: SpeechSynthesisUtterance[] | null = null;

export function cancelSpeech(): void {
  speakEpoch += 1;
  activeSession = null;
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(text: string, options: SpeakTextOptions): void {
  if (!isSpeechSupported()) {
    options.onError?.("当前浏览器不支持语音合成");
    return;
  }

  cancelSpeech();
  const epoch = speakEpoch;
  const clean = stripMarkdownForSpeech(text);
  if (!clean) {
    options.onEnd?.();
    return;
  }

  const chunks = splitIntoChunks(clean);
  const utterances: SpeechSynthesisUtterance[] = [];
  let started = false;

  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    if (options.voice) {
      utterance.voice = options.voice;
      utterance.lang = options.voice.lang;
    }
    utterance.rate = Math.min(2, Math.max(0.5, options.rate));

    utterance.onstart = () => {
      if (epoch !== speakEpoch) return;
      if (!started) {
        started = true;
        options.onStart?.();
      }
    };
    if (index === chunks.length - 1) {
      utterance.onend = () => {
        if (epoch !== speakEpoch) return;
        if (activeSession === utterances) {
          activeSession = null;
        }
        options.onEnd?.();
      };
    }
    utterance.onerror = event => {
      if (epoch !== speakEpoch) return;
      if (event.error === "canceled" || event.error === "interrupted") return;
      activeSession = null;
      options.onError?.(event.error);
    };

    utterances.push(utterance);
  });

  activeSession = utterances;
  for (const utterance of utterances) {
    window.speechSynthesis.speak(utterance);
  }
}
