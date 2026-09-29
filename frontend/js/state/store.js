/**
 * Central state store for Avatar (pub/sub pattern).
 * Manages active conversation, messages, connection status, settings,
 * and handles persistent synchronization with storage.
 */

import { APP_CONFIG } from "../config/appConfig.js";
import { safeGetItem, safeSetItem, sanitizeConversationsForStorage } from "./storage.js";

/**
 * Generates a unique identifier.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
}

/**
 * Default settings configuration.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  apiBaseUrl: APP_CONFIG.apiBaseUrlDefault,
  autoSpeak: true,
  voiceURI: "",
  rate: 1.0,
  pitch: 1.0,
  recognitionLang: "",
  autoSendVoice: true,
  contextSize: APP_CONFIG.contextSizeDefault,
  forceDemo: false,
  reduceMotion: false,
});

// Load persisted state or fallback
const savedConversations = safeGetItem(APP_CONFIG.storageKeys.conversations, []);
const savedSettings = { ...DEFAULT_SETTINGS, ...safeGetItem(APP_CONFIG.storageKeys.settings, {}) };
const savedActiveId = safeGetItem(APP_CONFIG.storageKeys.activeConversation, null);

// Initial conversation resolution
let initialActiveId = savedActiveId;
if (!initialActiveId && savedConversations.length > 0) {
  initialActiveId = savedConversations[0].id;
}

let state = {
  conversations: savedConversations,
  activeConversationId: initialActiveId,
  connectionStatus: "connecting", // "online" | "demo" | "offline" | "connecting"
  settings: savedSettings,
  inFlight: false,
};

/** @type {((state: typeof state) => void)[]} */
const subscribers = [];

/**
 * Subscribes a listener to store updates.
 * @param {(state: typeof state) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribe(listener) {
  subscribers.push(listener);
  return () => {
    const idx = subscribers.indexOf(listener);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

/**
 * Returns a snapshot of the current application state.
 * @returns {typeof state}
 */
export function getState() {
  return state;
}

/**
 * Notifies all subscribers with the updated state and writes to persistent storage.
 */
function notify() {
  // Sync to storage safely
  safeSetItem(
    APP_CONFIG.storageKeys.conversations,
    sanitizeConversationsForStorage(state.conversations)
  );
  safeSetItem(APP_CONFIG.storageKeys.settings, state.settings);
  safeSetItem(APP_CONFIG.storageKeys.activeConversation, state.activeConversationId);

  // Notify subscribers
  for (const fn of subscribers) {
    try {
      fn(state);
    } catch (err) {
      console.error("[Store] Subscriber error:", err);
    }
  }
}

/**
 * Returns the currently active conversation, or null if none active.
 * @returns {Object|null}
 */
export function getActiveConversation() {
  return state.conversations.find((c) => c.id === state.activeConversationId) || null;
}

// --- Store Actions ---

/**
 * Creates and activates a fresh new conversation.
 * @param {string} [initialTitle="New chat"]
 * @returns {Object} The created conversation object
 */
export function startNewConversation(initialTitle = "New chat") {
  const newConv = {
    id: generateId(),
    title: initialTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };

  state = {
    ...state,
    conversations: [newConv, ...state.conversations],
    activeConversationId: newConv.id,
  };
  notify();
  return newConv;
}

/**
 * Switches the active conversation to the specified ID.
 * @param {string} conversationId
 */
export function openConversation(conversationId) {
  if (state.activeConversationId === conversationId) return;
  const exists = state.conversations.some((c) => c.id === conversationId);
  if (!exists) return;

  state = {
    ...state,
    activeConversationId: conversationId,
  };
  notify();
}

/**
 * Appends a message to the active conversation.
 * Auto-creates a new conversation if none exists.
 * Auto-generates conversation title from the first user message.
 * @param {Object} message - Message object
 * @returns {Object} Added message
 */
export function addMessage(message) {
  let activeConv = getActiveConversation();

  if (!activeConv) {
    activeConv = startNewConversation();
  }

  const now = Date.now();
  const msgWithId = {
    id: message.id || generateId(),
    role: message.role,
    content: message.content || "",
    ts: message.ts || now,
    source: message.source || "typed",
    provider: message.provider || "unknown",
    status: message.status || "sent",
    error: message.error || null,
    image: message.image || null,
  };

  const updatedMessages = [...activeConv.messages, msgWithId];

  // Auto-generate title if this is the first user message
  let updatedTitle = activeConv.title;
  if (activeConv.messages.length === 0 && message.role === "user" && message.content) {
    const trimmed = message.content.trim();
    updatedTitle = trimmed.length > 40 ? trimmed.slice(0, 37) + "..." : trimmed;
  }

  const updatedConv = {
    ...activeConv,
    title: updatedTitle,
    updatedAt: now,
    messages: updatedMessages,
  };

  const updatedConversations = state.conversations.map((c) =>
    c.id === updatedConv.id ? updatedConv : c
  );

  state = {
    ...state,
    conversations: updatedConversations,
  };
  notify();
  return msgWithId;
}

/**
 * Updates an existing message in the active conversation (e.g. status, error, reply content).
 * @param {string} messageId
 * @param {Object} patch
 */
export function updateMessage(messageId, patch) {
  const activeConv = getActiveConversation();
  if (!activeConv) return;

  const updatedMessages = activeConv.messages.map((m) =>
    m.id === messageId ? { ...m, ...patch } : m
  );

  const updatedConv = {
    ...activeConv,
    updatedAt: Date.now(),
    messages: updatedMessages,
  };

  const updatedConversations = state.conversations.map((c) =>
    c.id === updatedConv.id ? updatedConv : c
  );

  state = {
    ...state,
    conversations: updatedConversations,
  };
  notify();
}

/**
 * Deletes a conversation by ID.
 * If the deleted conversation was active, switches to the newest or creates a new empty one.
 * @param {string} conversationId
 */
export function deleteConversation(conversationId) {
  const remaining = state.conversations.filter((c) => c.id !== conversationId);
  let nextActiveId = state.activeConversationId;

  if (state.activeConversationId === conversationId) {
    nextActiveId = remaining.length > 0 ? remaining[0].id : null;
  }

  state = {
    ...state,
    conversations: remaining,
    activeConversationId: nextActiveId,
  };
  notify();
}

/**
 * Deletes all conversations and starts a fresh one.
 */
export function clearAllConversations() {
  state = {
    ...state,
    conversations: [],
    activeConversationId: null,
  };
  notify();
}

/**
 * Updates the backend connection status.
 * @param {"online" | "demo" | "offline" | "connecting"} status
 */
export function setConnection(status) {
  if (state.connectionStatus === status) return;
  state = {
    ...state,
    connectionStatus: status,
  };
  notify();
}

/**
 * Updates user settings with partial overrides.
 * @param {Object} patch
 */
export function setSettings(patch) {
  state = {
    ...state,
    settings: {
      ...state.settings,
      ...patch,
    },
  };
  notify();
}

/**
 * Resets settings to default values.
 */
export function resetSettings() {
  state = {
    ...state,
    settings: { ...DEFAULT_SETTINGS },
  };
  notify();
}

/**
 * Sets the network in-flight status.
 * @param {boolean} inFlight
 */
export function setInFlight(inFlight) {
  if (state.inFlight === inFlight) return;
  state = {
    ...state,
    inFlight,
  };
  notify();
}
