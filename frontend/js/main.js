/**
 * Bootloader for Avatar (Clone AI) frontend.
 * Initializes configuration, services, state store, UI components, and router.
 */

import { APP_CONFIG } from "./config/appConfig.js";
import { initRouter } from "./utils/router.js";

function initApp() {
  console.log(`${APP_CONFIG.assistantName} (${APP_CONFIG.appSubtitle}) frontend boot initialized.`);

  // Initialize router
  initRouter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
