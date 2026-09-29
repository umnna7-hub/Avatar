/**
 * Safe DOM manipulation utilities for Avatar.
 * Provides element creation, class toggling, and event attachment helpers
 * to prevent innerHTML injection and ensure accessible attribute management.
 */

/**
 * Creates an HTML element with attributes, class names, children, and event listeners.
 * @param {string} tag - HTML tag name
 * @param {Object} [props={}] - Attributes, classes, dataset, and event handlers
 * @param {...(Node|string|null|undefined)} children - Child nodes or text strings
 * @returns {HTMLElement} The created DOM element
 */
export function el(tag, props = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;

    if (key === "className" || key === "class") {
      element.className = value;
    } else if (key === "dataset" && typeof value === "object") {
      for (const [dataKey, dataVal] of Object.entries(value)) {
        if (dataVal != null) element.dataset[dataKey] = String(dataVal);
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (typeof value === "boolean") {
      if (value) {
        element.setAttribute(key, "");
      }
    } else {
      element.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child == null) continue;
    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Safely removes all child nodes from a container element.
 * @param {HTMLElement} parent - Target container element
 */
export function clearChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}
