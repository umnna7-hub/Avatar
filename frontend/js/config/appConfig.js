/**
 * Application configuration constants for Avatar (Clone AI).
 * Centralizes assistant identity, API base URL defaults, and system limits.
 */

export const APP_CONFIG = Object.freeze({
  assistantName: "Avatar",
  appSubtitle: "Clone AI",
  apiBaseUrlDefault: "http://localhost:3000",
  contextSizeDefault: 12,
  contextSizeMin: 4,
  contextSizeMax: 20,
  maxMessageLength: 4000,
  softCounterThreshold: 3500,
  healthCheckIntervalMs: 20000,
  healthCheckBackoffMs: 60000,
  requestTimeoutMs: 30000,
  avatarThinkingMinMs: 400,
  silenceTimeoutMs: 8000,
  maxConversations: 100,
  maxMessagesPerConversation: 500,
  storageKeys: Object.freeze({
    conversations: "avatar.conversations.v1",
    settings: "avatar.settings.v1",
    activeConversation: "avatar.activeConversation.v1",
  }),
});
