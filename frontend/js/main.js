/**
 * Bootloader for Avatar (Clone AI) frontend.
 * Initializes configuration, services, state store, UI components, and router.
 */

import { APP_CONFIG } from "./config/appConfig.js";
import {
  getState,
  subscribe,
  startNewConversation,
  openConversation,
  addMessage,
  updateMessage,
  deleteConversation,
  clearAllConversations,
  setConnection,
  setSettings,
  resetSettings,
  getActiveConversation,
} from "./state/store.js";
import { initRouter } from "./utils/router.js";

function initApp() {
  console.log(`${APP_CONFIG.assistantName} (${APP_CONFIG.appSubtitle}) frontend boot initialized.`);

  // Expose store helper in debug mode (?debug in URL)
  if (window.location.search.includes("debug")) {
    window.__store = {
      getState,
      subscribe,
      startNewConversation,
      openConversation,
      addMessage,
      updateMessage,
      deleteConversation,
      clearAllConversations,
      setConnection,
      setSettings,
      resetSettings,
      getActiveConversation,
    };
    console.info("[Debug] window.__store is accessible for state inspection and testing.");
  }

  // Initialize router
  initRouter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
