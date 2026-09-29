/**
 * Hash router for Avatar (Clone AI).
 * Manages hash-based routing between Chat, History, and Settings screens.
 * Updates DOM visibility via `hidden` attribute, updates aria-current indicators,
 * and manages keyboard focus to meet WCAG 2.2 AA standards.
 */

const VALID_ROUTES = ["chat", "history", "settings"];
const DEFAULT_ROUTE = "chat";

/** @type {((route: string) => void)[]} */
const listeners = [];

let currentRoute = DEFAULT_ROUTE;

/**
 * Extracts and sanitizes the route name from the current window.location.hash.
 * @returns {string} The active route identifier ("chat", "history", or "settings")
 */
export function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase().trim();
  return VALID_ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
}

/**
 * Returns the currently active route identifier.
 * @returns {string}
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Subscribes a listener callback to route changes.
 * @param {(route: string) => void} fn - Callback function
 * @returns {() => void} Unsubscribe function
 */
export function onRouteChanged(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Programmatically transitions the application to a new route.
 * @param {string} route - Target route ("chat" | "history" | "settings")
 */
export function navigateTo(route) {
  const target = VALID_ROUTES.includes(route) ? route : DEFAULT_ROUTE;
  if (window.location.hash === `#/${target}`) {
    applyRoute(target);
  } else {
    window.location.hash = `#/${target}`;
  }
}

/**
 * Applies the given route to the DOM and informs subscribers.
 * @param {string} route
 * @param {boolean} [shouldFocus=false]
 */
function applyRoute(route, shouldFocus = false) {
  currentRoute = route;

  // 1. Toggle screen container visibility
  const screens = {
    chat: document.getElementById("screen-chat"),
    history: document.getElementById("screen-history"),
    settings: document.getElementById("screen-settings"),
  };

  for (const [key, section] of Object.entries(screens)) {
    if (!section) continue;
    if (key === route) {
      section.removeAttribute("hidden");
    } else {
      section.setAttribute("hidden", "");
    }
  }

  // 2. Update navigation aria-current attributes
  const allNavLinks = document.querySelectorAll("[data-route]");
  allNavLinks.forEach((link) => {
    const linkRoute = link.getAttribute("data-route");
    if (linkRoute === route) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  // 3. Move keyboard focus to screen heading if requested (accessibility)
  if (shouldFocus) {
    const activeSection = screens[route];
    if (activeSection) {
      const heading = activeSection.querySelector("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }

  // 4. Notify subscribers
  for (const fn of listeners) {
    try {
      fn(route);
    } catch (err) {
      console.error("[Router] Listener error:", err);
    }
  }
}

/**
 * Initializes the hash router and binds hashchange events.
 */
export function initRouter() {
  const handleHashChange = () => {
    const nextRoute = getRouteFromHash();
    applyRoute(nextRoute, true);
  };

  window.addEventListener("hashchange", handleHashChange);

  // Initial route application on load
  const initialRoute = getRouteFromHash();
  if (window.location.hash !== `#/${initialRoute}`) {
    window.location.replace(`#/${initialRoute}`);
  }
  applyRoute(initialRoute, false);
}
