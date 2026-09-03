export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

export interface AiChat {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type AiProviderId = "zhipu" | "deepseek" | "moonshot" | "openai" | "custom";
