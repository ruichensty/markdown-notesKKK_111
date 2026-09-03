import { useCallback, useEffect, useRef, useState } from "react";
import type { AiChat, AiChatMessage } from "@types";
import { idbDeleteAiChat, idbGetAllAiChats, idbSaveAiChat } from "@utils/indexedDBStorage";
import { AiClientError, buildContextMessages, streamAiCompletion } from "@utils/aiClient";

export interface AiChatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function makeId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAiChat(config: AiChatConfig) {
  const [chats, setChats] = useState<AiChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const flushTimerRef = useRef(0);
  const pendingDeltaRef = useRef("");
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    idbGetAllAiChats()
      .then(list => {
        setChats(list);
        if (list.length > 0) setActiveChatId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(flushTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId) ?? null;

  const updateChat = useCallback((chatId: string, updater: (chat: AiChat) => AiChat) => {
    setChats(prev => {
      const next = prev.map(c => (c.id === chatId ? updater(c) : c));
      const changed = next.find(c => c.id === chatId);
      if (changed) {
        void idbSaveAiChat(changed).catch(() => {});
      }
      return next;
    });
  }, []);

  const flushDelta = useCallback(
    (chatId: string) => {
      const pending = pendingDeltaRef.current;
      if (!pending) return;
      pendingDeltaRef.current = "";
      updateChat(chatId, chat => ({
        ...chat,
        messages: chat.messages.map((m, i) =>
          i === chat.messages.length - 1 && m.role === "assistant"
            ? { ...m, content: m.content + pending }
            : m
        ),
      }));
    },
    [updateChat]
  );

  const send = useCallback(
    async (text: string, noteContext: { title: string; content: string } | null) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setError(null);

      let chatId = activeChatId;
      let historyMessages: AiChatMessage[] = [];

      if (!chatId || !chats.some(c => c.id === chatId)) {
        const now = Date.now();
        const newChat: AiChat = {
          id: makeId(),
          title: trimmed.slice(0, 24),
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        chatId = newChat.id;
      } else {
        const existing = chats.find(c => c.id === chatId);
        if (existing) historyMessages = existing.messages;
      }

      const userMessage: AiChatMessage = { role: "user", content: trimmed, ts: Date.now() };
      const assistantMessage: AiChatMessage = { role: "assistant", content: "", ts: Date.now() };

      setChats(prev =>
        prev.map(c =>
          c.id === chatId
            ? {
                ...c,
                messages: [...c.messages, userMessage, assistantMessage],
                updatedAt: Date.now(),
              }
            : c
        )
      );

      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const targetChatId = chatId;

      const requestMessages = buildContextMessages([...historyMessages, userMessage], noteContext);

      try {
        await streamAiCompletion({
          ...configRef.current,
          messages: requestMessages,
          signal: controller.signal,
          onDelta: delta => {
            pendingDeltaRef.current += delta;
            if (!flushTimerRef.current) {
              flushTimerRef.current = window.setTimeout(() => {
                flushTimerRef.current = 0;
                flushDelta(targetChatId);
              }, 50);
            }
          },
        });
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = 0;
        flushDelta(targetChatId);
        updateChat(targetChatId, chat => ({ ...chat, updatedAt: Date.now() }));
      } catch (err) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = 0;
        flushDelta(targetChatId);
        const aiError = err instanceof AiClientError ? err : null;
        if (aiError?.kind === "abort") {
          updateChat(targetChatId, chat => ({
            ...chat,
            messages: chat.messages.map(m =>
              m === assistantMessage || (m.role === "assistant" && m.content === "")
                ? { ...m, content: m.content || "（已停止）" }
                : m
            ),
          }));
        } else {
          setError(err instanceof Error ? err.message : String(err));
          updateChat(targetChatId, chat => {
            const hasEmpty = chat.messages.some(m => m.role === "assistant" && !m.content);
            return {
              ...chat,
              messages: hasEmpty
                ? chat.messages.filter(m => !(m.role === "assistant" && !m.content))
                : chat.messages,
            };
          });
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [activeChatId, chats, streaming, flushDelta, updateChat]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newChat = useCallback(() => {
    setActiveChatId(null);
    setError(null);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setChats(prev => {
        const next = prev.filter(c => c.id !== id);
        if (activeChatId === id) setActiveChatId(next[0]?.id ?? null);
        return next;
      });
      void idbDeleteAiChat(id).catch(() => {});
    },
    [activeChatId]
  );

  return {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    streaming,
    error,
    send,
    stop,
    newChat,
    deleteChat,
  };
}
