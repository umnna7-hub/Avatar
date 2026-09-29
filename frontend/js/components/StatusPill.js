/**
 * StatusPill component for Avatar.
 * Renders the backend connection status pill:
 * Online / Demo mode / Offline / Connecting.
 * Pairs distinct SVG icons with text labels and links directly to Settings.
 */

import { el, clearChildren } from "../utils/dom.js";
import { getState, subscribe } from "../state/store.js";
import { navigateTo } from "../utils/router.js";

/**
 * Returns icon SVG markup and text configuration for a status.
 * @param {"online" | "demo" | "offline" | "connecting"} status
 * @returns {{ label: string, className: string, iconSvg: string }}
 */
function getStatusConfig(status) {
  switch (status) {
    case "online":
      return {
        label: "Online",
        className: "status-pill--online",
        iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>`,
      };
    case "demo":
      return {
        label: "Demo mode",
        className: "status-pill--demo",
        iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      };
    case "offline":
      return {
        label: "Offline",
        className: "status-pill--offline",
        iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/></svg>`,
      };
    case "connecting":
    default:
      return {
        label: "Connecting...",
        className: "status-pill--connecting",
        iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin-icon" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg>`,
      };
  }
}

/**
 * Initializes and binds the StatusPill in the header.
 * @param {HTMLElement} mountElement
 */
export function initStatusPill(mountElement) {
  if (!mountElement) return;

  function render() {
    clearChildren(mountElement);
    const { connectionStatus, settings } = getState();

    // If forceDemo is active, display Demo mode pill
    const effectiveStatus = settings.forceDemo ? "demo" : connectionStatus;
    const config = getStatusConfig(effectiveStatus);

    const pill = el(
      "button",
      {
        type: "button",
        className: `status-pill ${config.className}`,
        "aria-label": `Connection status: ${config.label}. Click to open connection settings.`,
        title: `Status: ${config.label} (Click to open settings)`,
        onClick: () => navigateTo("settings"),
      },
      el("span", { className: "status-pill-icon" }),
      el("span", { className: "status-pill-label" }, config.label)
    );

    // Insert icon SVG
    const iconContainer = pill.querySelector(".status-pill-icon");
    if (iconContainer) {
      iconContainer.innerHTML = config.iconSvg;
    }

    mountElement.appendChild(pill);
  }

  subscribe(render);
  render();
}
