import type { PersistedLibrary } from "../domain";

const STORAGE_KEY = "flopsic.library.v1";

export function loadLibrary(): PersistedLibrary | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as PersistedLibrary : null;
  } catch { return null; }
}

export function saveLibrary(value: PersistedLibrary) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
