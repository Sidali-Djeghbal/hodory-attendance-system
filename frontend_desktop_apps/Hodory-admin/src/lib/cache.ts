type CacheEnvelope<T> = { ts: number; data: T };

export function readCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    const payload: CacheEnvelope<T> = { ts: Date.now(), data };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

