/**
 * Safe localStorage persistence wrapper for Avatar.
 * Handles try/catch error boundaries, storage quota recovery,
 * image thumbnail sanitization, and versioned keys.
 */

import { APP_CONFIG } from "../config/appConfig.js";

let storageBlockedNotified = false;

/**
 * Safely reads and parses a JSON item from localStorage.
 * @template T
 * @param {string} key
 * @param {T} fallbackValue
 * @returns {T}
 */
export function safeGetItem(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Storage] Failed to read key "${key}":`, err);
    return fallbackValue;
  }
}

/**
 * Safely serializes and saves an item to localStorage.
 * Handles QuotaExceededError by keeping state in-memory and notifying the app.
 * @param {string} key
 * @param {*} value
 * @param {((msg: string) => void)} [onErrorToast] - Optional toast notifier
 * @returns {boolean} True if persisted successfully, false otherwise
 */
export function safeSetItem(key, value, onErrorToast) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to write key "${key}":`, err);
    if (!storageBlockedNotified) {
      storageBlockedNotified = true;
      if (typeof onErrorToast === "function") {
        onErrorToast("Storage limit reached or disabled. Changes kept in memory.");
      }
    }
    return false;
  }
}

/**
 * Safely removes an item from localStorage.
 * @param {string} key
 */
export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to remove key "${key}":`, err);
  }
}

/**
 * Sanitizes conversations before saving to prevent quota overflow:
 * - Drops oldest conversations exceeding APP_CONFIG.maxConversations
 * - Truncates messages to APP_CONFIG.maxMessagesPerConversation
 * - Replaces any raw base64 image data with thumbnail-only representation
 * @param {Array<Object>} conversations
 * @returns {Array<Object>} Sanitized conversation list
 */
export function sanitizeConversationsForStorage(conversations) {
  if (!Array.isArray(conversations)) return [];

  const sorted = [...conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const capped = sorted.slice(0, APP_CONFIG.maxConversations);

  return capped.map((conv) => {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    const cappedMessages = messages.slice(-APP_CONFIG.maxMessagesPerConversation).map((msg) => {
      // Strip large image data if present, preserve only name & thumb
      if (msg.image && msg.image.dataUrl) {
        return {
          ...msg,
          image: {
            name: msg.image.name || "image.jpg",
            thumb: msg.image.thumb || msg.image.thumbDataUrl || null,
          },
        };
      }
      return msg;
    });

    return {
      ...conv,
      messages: cappedMessages,
    };
  });
}
