// src/utils/storageScope.js
import { PROJECT_TYPES } from "../features/calculations/constants/projectTypes";

const PROJECT_TOOLS_PREFIX = "projectTools_";
const PROJECT_TYPE_IDS = PROJECT_TYPES.map((p) => p.id);

/**
 * Resolves a storage key based on current route context.
 * When inside `/project-tools/*`:
 * Any key starting with `${projectType}_` (e.g. `lighting-project_drawing_general`)
 * or matching standalone project state (`projectMode`)
 * is redirected to `projectTools_${key}` so it never collides with My Works drafts.
 */
export function resolveScopedKey(storage, key) {
  if (typeof key !== "string") return key;
  if (typeof window === "undefined") return key;
  if (storage !== window.sessionStorage) return key;

  const pathname = window.location.pathname || "";
  const isProjectTools = pathname.startsWith("/project-tools");
  if (!isProjectTools) return key;

  // Don't double-prefix if caller already passed "projectTools_..."
  if (key.startsWith(PROJECT_TOOLS_PREFIX)) return key;

  // Check if key belongs to a project type (e.g. lighting-project_...)
  const isProjectTypeKey = PROJECT_TYPE_IDS.some((id) =>
    key.startsWith(`${id}_`)
  );

  const isProjectScopedStandalone = key === "projectMode";

  if (isProjectTypeKey || isProjectScopedStandalone) {
    return `${PROJECT_TOOLS_PREFIX}${key}`;
  }

  return key;
}

let isInstalled = false;

export function initStorageScoping() {
  if (isInstalled || typeof window === "undefined" || !window.Storage) return;

  const origGetItem = Storage.prototype.getItem;
  const origSetItem = Storage.prototype.setItem;
  const origRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.getItem = function (key) {
    const resolvedKey = resolveScopedKey(this, key);
    return origGetItem.call(this, resolvedKey);
  };

  Storage.prototype.setItem = function (key, value) {
    const resolvedKey = resolveScopedKey(this, key);
    return origSetItem.call(this, resolvedKey, value);
  };

  Storage.prototype.removeItem = function (key) {
    const resolvedKey = resolveScopedKey(this, key);
    return origRemoveItem.call(this, resolvedKey);
  };

  isInstalled = true;
}

