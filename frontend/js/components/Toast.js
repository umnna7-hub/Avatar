/**
 * Transient non-modal Toast component for Avatar.
 * Manages announcements, action buttons (e.g., "Use demo mode"),
 * and dismiss timers without blocking the chat composer.
 */

import { el, clearChildren } from "../utils/dom.js";

let toastTimer = null;

/**
 * Displays a non-modal toast message.
 * @param {string} message - Message text to display
 * @param {Object} [opts={}]
 * @param {number} [opts.duration=5000] - Duration in ms before auto-dismiss
 * @param {string} [opts.actionLabel] - Label for optional interactive action button
 * @param {() => void} [opts.onAction] - Callback when action button is clicked
 */
export function showToast(message, opts = {}) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  clearChildren(container);

  const duration = typeof opts.duration === "number" ? opts.duration : 5000;

  const toastEl = el(
    "div",
    {
      className: "toast-item",
      role: "status",
      "aria-live": "polite",
    },
    el("span", { className: "toast-text" }, message)
  );

  if (opts.actionLabel && typeof opts.onAction === "function") {
    const actionBtn = el(
      "button",
      {
        type: "button",
        className: "toast-action-btn",
        onClick: () => {
          dismissToast();
          opts.onAction();
        },
      },
      opts.actionLabel
    );
    toastEl.appendChild(actionBtn);
  }

  const closeBtn = el(
    "button",
    {
      type: "button",
      className: "toast-close-btn",
      "aria-label": "Dismiss notification",
      title: "Dismiss",
      onClick: dismissToast,
    },
    "×"
  );
  toastEl.appendChild(closeBtn);

  container.appendChild(toastEl);

  if (duration > 0) {
    toastTimer = setTimeout(dismissToast, duration);
  }
}

/**
 * Dismisses the active toast.
 */
export function dismissToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  const container = document.getElementById("toast-container");
  if (container) {
    clearChildren(container);
  }
}
