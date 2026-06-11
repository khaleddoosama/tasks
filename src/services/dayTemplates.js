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

/**
 * Merge two template maps by name for Gist sync. The union of both sides is
 * kept; on a name collision the template with the newer `updatedAt` wins (ties
 * and missing timestamps keep the local copy). This lets templates created on
 * different devices coexist instead of one side clobbering the other on pull.
 * @param {Object<string, Object>} local
 * @param {Object<string, Object>} remote
 * @returns {Object<string, Object>}
 */
export function mergeTemplates(local = {}, remote = {}) {
  const merged = { ...local };
  const timestamp = (template) => Date.parse(template?.updatedAt) || 0;

  for (const [name, remoteTemplate] of Object.entries(remote)) {
    const localTemplate = merged[name];
    if (!localTemplate || timestamp(remoteTemplate) > timestamp(localTemplate)) {
      merged[name] = remoteTemplate;
    }
  }

  return merged;
}
