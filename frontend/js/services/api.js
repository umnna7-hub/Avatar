/**
 * API service adapter for Avatar backend communication.
 * Implements health checks, chat requests, vision requests, response normalization,
 * request timeouts, network retries, and typed ApiError formatting.
 */

import { APP_CONFIG } from "../config/appConfig.js";
import { getState, setConnection } from "../state/store.js";

/**
 * Custom typed API error class.
 * Ensures user-facing messages are safe, clean, and actionable.
 */
export class ApiError extends Error {
  /**
   * @param {"offline" | "timeout" | "unreachable" | "validation" | "server" | "unsupported"} kind
   * @param {number|null} status
   * @param {string} userMessage
   */
  constructor(kind, status, userMessage) {
    super(userMessage);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.userMessage = userMessage;
  }
}

/**
 * Normalizes backend responses from either current format { reply: string }
 * or spec format { role, content, provider, conversationId }.
 * @param {Object} rawData - Response JSON from server
 * @returns {{ content: string, provider: "cloud" | "local" | "demo" | "unknown", conversationId: string | null }}
 */
export function normalizeApiResponse(rawData) {
  if (!rawData || typeof rawData !== "object") {
    throw new ApiError("server", 500, "Something went wrong on our side. Try again in a moment.");
  }

  const content = rawData.content ?? rawData.reply;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new ApiError("server", 500, "Something went wrong on our side. Try again in a moment.");
  }

  const validProviders = ["cloud", "local", "demo", "unknown"];
  const provider = validProviders.includes(rawData.provider) ? rawData.provider : "unknown";
  const conversationId = rawData.conversationId ? String(rawData.conversationId) : null;

  return {
    content: content.trim(),
    provider,
    conversationId,
  };
}

/**
 * Retrieves the current configured base API URL from store settings.
 * @returns {string}
 */
export function getApiBaseUrl() {
  const settings = getState().settings;
  const url = (settings && settings.apiBaseUrl) ? settings.apiBaseUrl.trim() : APP_CONFIG.apiBaseUrlDefault;
  return url.replace(/\/+$/, "");
}

/**
 * Checks the health of the backend server.
 * GET {base}/ -> { online: boolean, service?: string }
 * @param {string} [baseUrl] - Optional override
 * @returns {Promise<{ online: boolean, service?: string }>}
 */
export async function checkHealth(baseUrl) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { online: false };
  }

  const base = baseUrl || getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${base}/`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { online: true, service: data.service || "Avatar AI Backend" };
    }
    return { online: false };
  } catch (err) {
    clearTimeout(timeoutId);
    return { online: false };
  }
}

/**
 * Sends messages to the chat backend.
 * POST {base}/api/chat
 * Automatically handles timeout, single network retry, and typed ApiError.
 * @param {Array<{role: string, content: string}>} messages - Filtered text messages
 * @param {Object} [opts={}]
 * @param {AbortSignal} [opts.signal] - Caller-provided abort signal
 * @param {string} [opts.conversationId] - Conversation ID if supported
 * @returns {Promise<{ content: string, provider: string, conversationId: string | null }>}
 */
export async function sendChat(messages, opts = {}) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiError("offline", null, "You're offline. Check your connection.");
  }

  const base = getApiBaseUrl();
  const payload = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (opts.conversationId) {
    payload.conversationId = opts.conversationId;
  }

  const executeFetch = async (isRetry = false) => {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), APP_CONFIG.requestTimeoutMs);

    // Merge external abort signal if provided
    if (opts.signal) {
      opts.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        timeoutController.abort();
      });
    }

    try {
      const response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: timeoutController.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 400) {
        throw new ApiError("validation", 400, "That message couldn't be sent. Try rephrasing it.");
      }

      if (response.status >= 500) {
        throw new ApiError("server", response.status, "Something went wrong on our side. Try again in a moment.");
      }

      if (!response.ok) {
        throw new ApiError("server", response.status, "Something went wrong on our side. Try again in a moment.");
      }

      const json = await response.json().catch(() => {
        throw new ApiError("server", 500, "Something went wrong on our side. Try again in a moment.");
      });

      return normalizeApiResponse(json);
    } catch (err) {
      clearTimeout(timeoutId);

      // Explicit abort from user
      if (opts.signal && opts.signal.aborted) {
        throw new ApiError("timeout", null, "Request was stopped.");
      }

      // Timeout abort
      if (timeoutController.signal.aborted) {
        throw new ApiError("timeout", null, "That's taking too long. Try again.");
      }

      // If already an ApiError (e.g. 400 or 500), don't retry
      if (err instanceof ApiError) {
        throw err;
      }

      // Network / TypeError: attempt 1 retry if not already retried
      if (!isRetry && navigator.onLine) {
        await new Promise((r) => setTimeout(r, 600));
        return executeFetch(true);
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new ApiError("offline", null, "You're offline. Check your connection.");
      }

      throw new ApiError("unreachable", null, "Can't reach the server. Is the backend running?");
    }
  };

  return executeFetch(false);
}

/**
 * Sends an image and prompt to the vision backend.
 * POST {base}/api/vision
 * @param {string} imageDataUrl - Base64 data URL
 * @param {string} prompt - User prompt
 * @param {Object} [opts={}]
 * @returns {Promise<{ content: string }>}
 */
export async function sendVision(imageDataUrl, prompt, opts = {}) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiError("offline", null, "You're offline. Check your connection.");
  }

  const base = getApiBaseUrl();
  const payload = {
    image: imageDataUrl,
    prompt: prompt || "Describe what is visible.",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);

  if (opts.signal) {
    opts.signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  try {
    const response = await fetch(`${base}/api/vision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      throw new ApiError("unsupported", 404, "Image understanding isn't available yet.");
    }

    if (!response.ok) {
      throw new ApiError("server", response.status, "Something went wrong analyzing the image.");
    }

    const data = await response.json();
    const content = data.content ?? data.reply ?? "";
    return { content: String(content).trim() };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) throw err;
    if (controller.signal.aborted) {
      throw new ApiError("timeout", null, "Image analysis timed out. Try again.");
    }
    throw new ApiError("unreachable", null, "Can't reach the server for image understanding.");
  }
}

let monitorIntervalId = null;
let consecutiveFailures = 0;

/**
 * Runs a single health check cycle and updates the connection state in the store.
 * @returns {Promise<{ online: boolean, service?: string }>}
 */
export async function runHealthCheckOnce() {
  const result = await checkHealth();
  if (result.online) {
    consecutiveFailures = 0;
    setConnection("online");
  } else {
    consecutiveFailures++;
    setConnection("offline");
  }
  return result;
}

/**
 * Starts the periodic connection monitoring loop per spec §8.3:
 * - Re-checks every 20s
 * - Pauses when the tab is hidden
 * - Backs off to 60s after 3 consecutive failures
 * - Listens for online/offline events
 */
export function startConnectionMonitor() {
  runHealthCheckOnce();

  const scheduleNext = () => {
    if (monitorIntervalId) clearTimeout(monitorIntervalId);
    if (typeof document !== "undefined" && document.hidden) return;

    const interval = consecutiveFailures >= 3
      ? APP_CONFIG.healthCheckBackoffMs
      : APP_CONFIG.healthCheckIntervalMs;

    monitorIntervalId = setTimeout(async () => {
      await runHealthCheckOnce();
      scheduleNext();
    }, interval);
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        runHealthCheckOnce().then(scheduleNext);
      } else if (monitorIntervalId) {
        clearTimeout(monitorIntervalId);
      }
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      runHealthCheckOnce().then(scheduleNext);
    });

    window.addEventListener("offline", () => {
      setConnection("offline");
    });
  }

  scheduleNext();
}

