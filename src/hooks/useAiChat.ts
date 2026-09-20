import { useCallback, useEffect, useRef, useState } from "react";
import type { AiChat, AiChatMessage, AiNoteContext } from "@types";
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
  const chatsRef = useRef<AiChat[]>([]);
  const persistTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const persistChatNow = useCallback(async (chatId: string) => {
    const timer = persistTimersRef.current.get(chatId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      persistTimersRef.current.delete(chatId);
    }
    const chat = chatsRef.current.find(item => item.id === chatId);
    if (chat) await idbSaveAiChat(chat);
  }, []);

  const scheduleChatPersist = useCallback(
    (chatId: string) => {
      if (persistTimersRef.current.has(chatId)) return;
      const timer = window.setTimeout(() => {
        persistTimersRef.current.delete(chatId);
        void persistChatNow(chatId).catch(() => {});
      }, 1000);
      persistTimersRef.current.set(chatId, timer);
    },
    [persistChatNow]
  );

  useEffect(() => {
    idbGetAllAiChats()
      .then(list => {
        chatsRef.current = list;
        setChats(list);
        if (list.length > 0) setActiveChatId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const persistTimers = persistTimersRef.current;
    return () => {
      window.clearTimeout(flushTimerRef.current);
      for (const [chatId, timer] of persistTimers) {
        window.clearTimeout(timer);
        const chat = chatsRef.current.find(item => item.id === chatId);
        if (chat) void idbSaveAiChat(chat).catch(() => {});
      }
      persistTimers.clear();
      abortRef.current?.abort();
    };
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId) ?? null;

  const updateChat = useCallback(
    (
      chatId: string,
      updater: (chat: AiChat) => AiChat,
      persist: "none" | "throttled" | "immediate" = "throttled"
    ) => {
      const current = chatsRef.current;
      const target = current.find(chat => chat.id === chatId);
      if (!target) return;
      const changed = updater(target);
      const next = current.map(chat => (chat.id === chatId ? changed : chat));
      chatsRef.current = next;
      setChats(next);
      if (persist === "immediate") void persistChatNow(chatId).catch(() => {});
      else if (persist === "throttled") scheduleChatPersist(chatId);
    },
    [persistChatNow, scheduleChatPersist]
  );

  const flushDelta = useCallback(
    (chatId: string) => {
      const pending = pendingDeltaRef.current;
      if (!pending) return;
      pendingDeltaRef.current = "";
      updateChat(
        chatId,
        chat => ({
          ...chat,
          messages: chat.messages.map((m, i) =>
            i === chat.messages.length - 1 && m.role === "assistant"
              ? { ...m, content: m.content + pending }
              : m
          ),
        }),
        "throttled"
      );
    },
    [updateChat]
  );

  const send = useCallback(
    async (text: string, noteContext: AiNoteContext | null) => {
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
        const next = [newChat, ...chatsRef.current];
        chatsRef.current = next;
        setChats(next);
        setActiveChatId(newChat.id);
        chatId = newChat.id;
      } else {
        const existing = chats.find(c => c.id === chatId);
        if (existing) historyMessages = existing.messages;
      }

      const userMessage: AiChatMessage = { role: "user", content: trimmed, ts: Date.now() };
      const assistantMessage: AiChatMessage = { role: "assistant", content: "", ts: Date.now() };

      updateChat(
        chatId,
        chat => ({
          ...chat,
          messages: [...chat.messages, userMessage, assistantMessage],
          updatedAt: Date.now(),
        }),
        "immediate"
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
        updateChat(targetChatId, chat => ({ ...chat, updatedAt: Date.now() }), "immediate");
      } catch (err) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = 0;
        flushDelta(targetChatId);
        const aiError = err instanceof AiClientError ? err : null;
        if (aiError?.kind === "abort") {
          updateChat(
            targetChatId,
            chat => ({
              ...chat,
              messages: chat.messages.map((m, index) =>
                index === chat.messages.length - 1 && m.role === "assistant"
                  ? { ...m, content: m.content || "（已停止）" }
                  : m
              ),
            }),
            "immediate"
          );
        } else {
          setError(err instanceof Error ? err.message : String(err));
          updateChat(
            targetChatId,
            chat => {
              const hasEmpty = chat.messages.some(m => m.role === "assistant" && !m.content);
              return {
                ...chat,
                messages: hasEmpty
                  ? chat.messages.filter(m => !(m.role === "assistant" && !m.content))
                  : chat.messages,
              };
            },
            "immediate"
          );
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
      const timer = persistTimersRef.current.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      persistTimersRef.current.delete(id);
      const next = chatsRef.current.filter(chat => chat.id !== id);
      chatsRef.current = next;
      setChats(next);
      if (activeChatId === id) setActiveChatId(next[0]?.id ?? null);
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
