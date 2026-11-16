// Fetches and caches shared master data (materials, object types, region
// codes, lighting company codes, etc.) from the backend bootstrap endpoint.
const STORAGE_KEY = "masterData";

// Backend refreshes its own master data cache every hour, so ours shouldn't
// outlive that — otherwise a long-lived tab could serve stale data all day.
const CACHE_TTL_MS = 60 * 60 * 1000;

// In-flight fetch promise, shared across all callers so simultaneous
// getMasterData() calls (e.g. from multi-purpose-project mounted components) don't
// trigger duplicate network requests.
let inFlightRequest = null;

function readCache() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const { data, cachedAt } = JSON.parse(raw);
    if (!data || typeof cachedAt !== "number") {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - cachedAt > CACHE_TTL_MS) {
      // Cache expired — treat it the same as no cache.
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    // Corrupt cache — drop it and let the caller re-fetch.
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeCache(data) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ data, cachedAt: Date.now() }),
  );
}

async function fetchBootstrap() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const response = await fetch(`${baseUrl}/api/master/bootstrap`);

  if (!response.ok) {
    throw new Error(`Failed to load master data (status ${response.status})`);
  }

  const json = await response.json();
  if (!json?.success || !json?.data) {
    throw new Error("Invalid master data response");
  }

  return json.data;
}

// Returns cached master data if available, otherwise fetches it from
// /api/master/bootstrap and caches the result in sessionStorage for the rest
// of the tab's lifetime (or until it expires per CACHE_TTL_MS, whichever
// comes first). Cleared automatically when the tab is closed.
export async function getMasterData() {
  const cached = readCache();
  if (cached) return cached;

  if (!inFlightRequest) {
    inFlightRequest = fetchBootstrap()
      .then((data) => {
        writeCache(data);
        return data;
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  return inFlightRequest;
}

export function getCachedMaterials() {
  const cached = readCache();
  return cached?.materials || [];
}

export async function getMasterMaterials() {
  const cached = getCachedMaterials();
  if (cached && cached.length > 0) return cached;
  try {
    const data = await getMasterData();
    return data?.materials || [];
  } catch (err) {
    console.warn("[masterDataService] Failed to load master materials:", err);
    return [];
  }
}

// ─── DYNAMIC DESIGN STANDARDS & REGIONS (ZERO HARDCODED UUID) ─────────────────
export const STORAGE_KEY_STANDARDS = "masterDesignStandards";
export const STORAGE_KEY_REGIONS = "masterRegions";

let inFlightStandards = null;
let inFlightRegions = null;

function readSpecificCache(key) {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    const { data, cachedAt } = JSON.parse(raw);
    if (!data || typeof cachedAt !== "number") {
      sessionStorage.removeItem(key);
      return null;
    }
    if (Date.now() - cachedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

function writeSpecificCache(key, data) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ data, cachedAt: Date.now() }),
    );
  } catch {
    // sessionStorage full or quota exceeded
  }
}

export async function getMasterDesignStandards() {
  const cached = readSpecificCache(STORAGE_KEY_STANDARDS);
  if (cached) return cached;

  if (!inFlightStandards) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    inFlightStandards = fetch(`${baseUrl}/api/master/design-standards`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const data = json?.data || [];
        writeSpecificCache(STORAGE_KEY_STANDARDS, data);
        return data;
      })
      .catch((err) => {
        console.warn("[masterDataService] Failed to load design standards:", err);
        return [];
      })
      .finally(() => {
        inFlightStandards = null;
      });
  }
  return inFlightStandards;
}

export async function getMasterRegions() {
  const cached = readSpecificCache(STORAGE_KEY_REGIONS);
  if (cached) return cached;

  if (!inFlightRegions) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    inFlightRegions = fetch(`${baseUrl}/api/master/regions`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const data = json?.data || [];
        writeSpecificCache(STORAGE_KEY_REGIONS, data);
        return data;
      })
      .catch((err) => {
        console.warn("[masterDataService] Failed to load regions:", err);
        return [];
      })
      .finally(() => {
        inFlightRegions = null;
      });
  }
  return inFlightRegions;
}

export function getCachedDesignStandards() {
  return readSpecificCache(STORAGE_KEY_STANDARDS) || [];
}

export function getCachedRegions() {
  return readSpecificCache(STORAGE_KEY_REGIONS) || [];
}

// ─── POLE CATEGORIES MASTER DATA ─────────────────────────────────────────────
export const STORAGE_KEY_POLE_CATEGORIES = "masterPoleCategories";
let inFlightPoleCategories = null;

export async function getMasterPoleCategories() {
  const cached = readSpecificCache(STORAGE_KEY_POLE_CATEGORIES);
  if (cached) return cached;

  if (!inFlightPoleCategories) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    inFlightPoleCategories = fetch(`${baseUrl}/api/master/pole-categories`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const data = json?.data || [];
        writeSpecificCache(STORAGE_KEY_POLE_CATEGORIES, data);
        return data;
      })
      .catch((err) => {
        console.warn("[masterDataService] Failed to load pole categories:", err);
        return [];
      })
      .finally(() => {
        inFlightPoleCategories = null;
      });
  }
  return inFlightPoleCategories;
}

export function getCachedPoleCategories() {
  return readSpecificCache(STORAGE_KEY_POLE_CATEGORIES) || [];
}

// Clears the cache so the next master data calls re-fetch from the API.
export function clearMasterDataCache() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY_STANDARDS);
  sessionStorage.removeItem(STORAGE_KEY_REGIONS);
  sessionStorage.removeItem(STORAGE_KEY_POLE_CATEGORIES);
}
