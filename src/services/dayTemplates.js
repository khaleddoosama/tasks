/**
 * Day template storage service.
 *
 * Centralizes all reads/writes of day templates so that the storage key,
 * JSON parsing, and error handling live in exactly one place instead of
 * being duplicated (and unguarded) across DayCard and useTaskManagement.
 */

const TEMPLATES_KEY = "dayTemplatesV1";

/**
 * Read all saved templates. Never throws — returns {} on missing/corrupt data.
 * @returns {Object<string, Object>} Map of templateName -> template
 */
export function readTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persist the full templates map.
 * @param {Object<string, Object>} templates
 */
export function writeTemplates(templates) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates || {}));
  } catch {
    // Storage may be full or unavailable; fail silently to match prior behavior.
  }
}

/**
 * Save a single template by name (merges into the existing map).
 * @param {string} name
 * @param {Object} template
 */
export function saveTemplate(name, template) {
  const templates = readTemplates();
  templates[name] = template;
  writeTemplates(templates);
}

/**
 * Look up a single template by name.
 * @param {string} name
 * @returns {Object | undefined}
 */
export function getTemplate(name) {
  return readTemplates()[name];
}
