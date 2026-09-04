import { AiClientError, classifyError } from "./aiClient";
import { splitIntoChunks, stripMarkdownForSpeech } from "./speech";

export interface TtsApiPreset {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  voiceHint: string;
  keyUrl: string;
}

export const TTS_API_PRESETS: TtsApiPreset[] = [
  {
    id: "siliconflow",
    label: "硅基流动（有免费额度）",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "FunAudioLLM/CosyVoice2-0.5B",
    voiceHint: "FunAudioLLM/CosyVoice2-0.5B:alex",
    keyUrl: "https://cloud.siliconflow.cn/account/ak",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini-tts",
    voiceHint: "alloy",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "custom",
    label: "自定义（OpenAI 兼容）",
    baseUrl: "",
    model: "",
    voiceHint: "",
    keyUrl: "",
  },
];

export function getTtsPreset(id: string): TtsApiPreset {
  return TTS_API_PRESETS.find(p => p.id === id) ?? TTS_API_PRESETS[TTS_API_PRESETS.length - 1];
}

export interface TtsApiSpeakOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  speed: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

let speakEpoch = 0;
let activeAbort: AbortController | null = null;
let activeAudio: HTMLAudioElement | null = null;

export function cancelTtsApi(): void {
  speakEpoch += 1;
  activeAbort?.abort();
  activeAbort = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio = null;
  }
}

function splitForApi(clean: string): string[] {
  const chunks = splitIntoChunks(clean, 300);
  if (chunks.length <= 1) return chunks;
  const first = chunks[0];
  if (first.length > 120) {
    const head = splitIntoChunks(first, 120);
    return [...head, ...chunks.slice(1)];
  }
  return chunks;
}

async function toHttpError(response: Response): Promise<AiClientError> {
  let detail = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    if (body.error?.message) detail = body.error.message;
    else if (body.message) detail = body.message;
  } catch {
    /* ignore body parse failure */
  }
  if (response.status === 401 || response.status === 403) {
    return new AiClientError("auth", `API Key 无效或无权限：${detail}`);
  }
  if (response.status === 429) {
    return new AiClientError("rateLimit", `请求过于频繁或额度不足：${detail}`);
  }
  if (response.status >= 500) {
    return new AiClientError("server", `服务端错误：${detail}`);
  }
  return new AiClientError("unknown", detail);
}

export async function speakViaApi(text: string, options: TtsApiSpeakOptions): Promise<void> {
  if (!options.apiKey.trim()) {
    options.onError?.("尚未配置云端语音 API Key，请在设置中填写");
    return;
  }
  if (!options.baseUrl.trim()) {
    options.onError?.("尚未配置云端语音 API 地址，请在设置中填写");
    return;
  }
  if (!options.model.trim()) {
    options.onError?.("尚未配置语音模型名称，请在设置中填写");
    return;
  }

  cancelTtsApi();
  const epoch = speakEpoch;
  const clean = stripMarkdownForSpeech(text);
  if (!clean) {
    options.onEnd?.();
    return;
  }

  const chunks = splitForApi(clean);
  const objectUrls: string[] = [];

  try {
    let started = false;
    for (const chunk of chunks) {
      if (epoch !== speakEpoch) return;

      const controller = new AbortController();
      activeAbort = controller;
      const response = await fetch(`${options.baseUrl.replace(/\/+$/, "")}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          voice: options.voice || undefined,
          input: chunk,
          speed: Math.min(4, Math.max(0.25, options.speed)),
          response_format: "mp3",
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw await toHttpError(response);
      }
      const blob = await response.blob();
      if (epoch !== speakEpoch) return;

      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      await new Promise<void>(resolve => {
        const audio = new Audio(url);
        activeAudio = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        if (!started) {
          started = true;
          options.onStart?.();
        }
        void audio.play().catch(() => resolve());
      });
      if (epoch !== speakEpoch) return;
    }
    options.onEnd?.();
  } catch (error) {
    if (epoch !== speakEpoch) return;
    const ttsError = classifyError(error);
    if (ttsError.kind === "abort") {
      options.onEnd?.();
      return;
    }
    options.onError?.(ttsError.message);
  } finally {
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
  }
}
