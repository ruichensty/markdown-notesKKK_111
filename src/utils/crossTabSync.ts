export type CrossTabDataDomain =
  "notes" | "note-versions" | "settings" | "folders" | "templates" | "theme" | "ai-chats";

export interface CrossTabSyncMessage {
  type: "data-changed";
  domain: CrossTabDataDomain;
  sourceId: string;
  timestamp: number;
}

const CHANNEL_NAME = "markdown-notes-data-sync-v1";
const DOMAINS = new Set<CrossTabDataDomain>([
  "notes",
  "note-versions",
  "settings",
  "folders",
  "templates",
  "theme",
  "ai-chats",
]);
const SOURCE_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const listeners = new Map<CrossTabDataDomain, Set<() => void>>();
let channel: BroadcastChannel | null = null;

export function isCrossTabSyncMessage(value: unknown): value is CrossTabSyncMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<CrossTabSyncMessage>;
  return (
    message.type === "data-changed" &&
    typeof message.domain === "string" &&
    DOMAINS.has(message.domain as CrossTabDataDomain) &&
    typeof message.sourceId === "string" &&
    typeof message.timestamp === "number"
  );
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = event => {
    if (!isCrossTabSyncMessage(event.data) || event.data.sourceId === SOURCE_ID) return;
    for (const listener of listeners.get(event.data.domain) || []) listener();
  };
  return channel;
}

export function publishCrossTabChange(domain: CrossTabDataDomain): void {
  getChannel()?.postMessage({
    type: "data-changed",
    domain,
    sourceId: SOURCE_ID,
    timestamp: Date.now(),
  } satisfies CrossTabSyncMessage);
}

export function subscribeCrossTabChange(
  domain: CrossTabDataDomain,
  listener: () => void
): () => void {
  getChannel();
  const domainListeners = listeners.get(domain) ?? new Set<() => void>();
  domainListeners.add(listener);
  listeners.set(domain, domainListeners);
  return () => {
    domainListeners.delete(listener);
    if (domainListeners.size === 0) listeners.delete(domain);
  };
}
