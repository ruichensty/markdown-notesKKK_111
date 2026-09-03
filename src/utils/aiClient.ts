import type { AiChatMessage, AiProviderId } from "@types";

export interface AiProviderPreset {
  id: AiProviderId;
  label: string;
  baseUrl: string;
  model: string;
  keyUrl: string;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: "zhipu",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "moonshot",
    label: "Moonshot 月之暗面",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    keyUrl: "https://platform.moonshot.cn/console/api-keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "custom",
    label: "自定义（OpenAI 兼容）",
    baseUrl: "",
    model: "",
    keyUrl: "",
  },
];

export function getPreset(id: AiProviderId): AiProviderPreset {
  return AI_PROVIDER_PRESETS.find(p => p.id === id) ?? AI_PROVIDER_PRESETS[0];
}

export class AiClientError extends Error {
  kind: "noKey" | "auth" | "cors" | "network" | "rateLimit" | "server" | "abort" | "unknown";

  constructor(kind: AiClientError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface StreamAiOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

function classifyError(error: unknown): AiClientError {
  if (error instanceof AiClientError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AiClientError("abort", "已停止生成");
  }
  if (error instanceof TypeError) {
    return new AiClientError(
      "cors",
      "网络请求失败：可能是跨域（CORS）限制或断网。若服务商不支持浏览器直连，请改用支持 CORS 的服务商或自定义中转地址。"
    );
  }
  return new AiClientError("unknown", error instanceof Error ? error.message : String(error));
}

export async function streamAiCompletion(options: StreamAiOptions): Promise<string> {
  const { baseUrl, apiKey, model, messages, signal, onDelta } = options;

  if (!apiKey.trim()) {
    throw new AiClientError("noKey", "尚未配置 API Key，请在设置中填写");
  }
  if (!baseUrl.trim()) {
    throw new AiClientError("noKey", "尚未配置 API 地址（baseURL）");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
      signal,
    });
  } catch (error) {
    throw classifyError(error);
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) detail = body.error.message;
    } catch {
      /* ignore body parse failure */
    }
    if (response.status === 401 || response.status === 403) {
      throw new AiClientError("auth", `API Key 无效或无权限：${detail}`);
    }
    if (response.status === 429) {
      throw new AiClientError("rateLimit", `请求过于频繁或余额不足：${detail}`);
    }
    if (response.status >= 500) {
      throw new AiClientError("server", `服务端错误：${detail}`);
    }
    throw new AiClientError("unknown", detail);
  }

  const body = response.body;
  if (!body) {
    throw new AiClientError("unknown", "响应没有内容流");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let full = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        } catch {
          /* skip malformed frame */
        }
      }
    }
  } catch (error) {
    throw classifyError(error);
  }

  return full;
}

export function buildContextMessages(
  history: AiChatMessage[],
  noteContext: { title: string; content: string } | null,
  maxHistory = 20,
  maxNoteChars = 8000
): { role: string; content: string }[] {
  const result: { role: string; content: string }[] = [];

  if (noteContext) {
    const truncated =
      noteContext.content.length > maxNoteChars
        ? `${noteContext.content.slice(0, maxNoteChars)}\n…（内容过长已截断）`
        : noteContext.content;
    result.push({
      role: "system",
      content: `用户正在使用 Markdown 笔记应用，当前打开的笔记标题为「${noteContext.title || "Untitled"}」，内容如下（markdown 源码）：\n\n${truncated}\n\n你可以基于这篇笔记回答问题、总结、润色或续写。涉及代码时给出 markdown 代码块。`,
    });
  }

  const recent = history.filter(m => m.role !== "system").slice(-maxHistory);
  for (const m of recent) {
    result.push({ role: m.role, content: m.content });
  }

  return result;
}
