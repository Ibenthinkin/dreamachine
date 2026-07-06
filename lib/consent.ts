/**
 * Consent record (SPEC §3.1). Storage is injected so the read/write logic is
 * unit-testable without a browser.
 */

export const CONSENT_STORAGE_KEY = "dreamachine_consent_accepted_at";

/** Valid ISO timestamp of acceptance, or null if absent/malformed. */
export function readConsentTimestamp(storage: Pick<Storage, "getItem">): string | null {
  let raw: string | null;
  try {
    raw = storage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw || Number.isNaN(Date.parse(raw))) return null;
  return raw;
}

export function hasConsent(storage: Pick<Storage, "getItem">): boolean {
  return readConsentTimestamp(storage) !== null;
}

export function writeConsentTimestamp(
  storage: Pick<Storage, "setItem">,
  acceptedAt: Date = new Date(),
): string {
  const iso = acceptedAt.toISOString();
  storage.setItem(CONSENT_STORAGE_KEY, iso);
  return iso;
}

/**
 * useSyncExternalStore-shaped store over the localStorage record. The server
 * snapshot is always false — the gate is the default until a valid record is
 * confirmed client-side, so there is no code path to the strobe without it.
 */
const consentListeners = new Set<() => void>();

export const consentStore = {
  subscribe(listener: () => void): () => void {
    consentListeners.add(listener);
    return () => consentListeners.delete(listener);
  },
  getSnapshot(): boolean {
    return hasConsent(window.localStorage);
  },
  getServerSnapshot(): boolean {
    return false;
  },
  accept(): void {
    writeConsentTimestamp(window.localStorage);
    for (const listener of consentListeners) listener();
  },
};
