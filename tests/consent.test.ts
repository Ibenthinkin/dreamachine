import { describe, expect, it } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  hasConsent,
  readConsentTimestamp,
  writeConsentTimestamp,
} from "@/lib/consent";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe("consent record", () => {
  it("has no consent when the key is absent", () => {
    const storage = fakeStorage();
    expect(readConsentTimestamp(storage)).toBeNull();
    expect(hasConsent(storage)).toBe(false);
  });

  it("rejects a malformed timestamp", () => {
    const storage = fakeStorage({ [CONSENT_STORAGE_KEY]: "definitely-not-a-date" });
    expect(readConsentTimestamp(storage)).toBeNull();
    expect(hasConsent(storage)).toBe(false);
  });

  it("rejects an empty value", () => {
    const storage = fakeStorage({ [CONSENT_STORAGE_KEY]: "" });
    expect(hasConsent(storage)).toBe(false);
  });

  it("round-trips write → read as an ISO timestamp", () => {
    const storage = fakeStorage();
    const acceptedAt = new Date("2026-07-06T12:00:00.000Z");
    const written = writeConsentTimestamp(storage, acceptedAt);
    expect(written).toBe("2026-07-06T12:00:00.000Z");
    expect(readConsentTimestamp(storage)).toBe(written);
    expect(hasConsent(storage)).toBe(true);
  });

  it("survives a storage that throws (private browsing)", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
    };
    expect(hasConsent(storage)).toBe(false);
  });
});
