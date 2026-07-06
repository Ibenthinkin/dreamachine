import { expect, test, type Page } from "@playwright/test";

const CONSENT_KEY = "dreamachine_consent_accepted_at";
const ACCEPT_BUTTON = "text=I understand and accept";
const START_STOP = '[data-testid="start-stop"]';
const SURFACE = '[data-testid="strobe-surface"]';
const SLIDER = 'input[type="range"]';

declare global {
  interface Window {
    __audioContexts: AudioContext[];
  }
}

/** Track AudioContext instances so tests can assert on engine audio state. */
async function trackAudioContexts(page: Page) {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    window.__audioContexts = [];
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.__audioContexts.push(this);
      }
    };
  });
}

/** Pre-seed a valid consent record so tests land on the main screen. */
async function seedConsent(page: Page) {
  await page.addInitScript(
    ([key]) => window.localStorage.setItem(key, new Date().toISOString()),
    [CONSENT_KEY],
  );
}

/** Count strobe-surface style flips over `windowMs`. */
function countToggles(page: Page, windowMs: number) {
  return page.evaluate(
    ({ selector, windowMs }) =>
      new Promise<number>((resolve) => {
        const el = document.querySelector(selector)!;
        let flips = 0;
        const observer = new MutationObserver(() => flips++);
        observer.observe(el, { attributes: true, attributeFilter: ["style"] });
        setTimeout(() => {
          observer.disconnect();
          resolve(flips);
        }, windowMs);
      }),
    { selector: SURFACE, windowMs },
  );
}

test.describe("consent gate", () => {
  test("blocks the main screen until accepted", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(ACCEPT_BUTTON)).toBeVisible();
    await expect(page.locator(START_STOP)).toHaveCount(0);
    await expect(page.locator(SURFACE)).toHaveCount(0);
  });

  test("accepting reveals the main screen and writes the record", async ({ page }) => {
    await page.goto("/");
    await page.click(ACCEPT_BUTTON);
    await expect(page.locator(START_STOP)).toBeVisible();
    const record = await page.evaluate(
      ([key]) => window.localStorage.getItem(key),
      [CONSENT_KEY],
    );
    expect(record).not.toBeNull();
    expect(Number.isNaN(Date.parse(record!))).toBe(false);
  });

  test("acceptance persists across reload", async ({ page }) => {
    await page.goto("/");
    await page.click(ACCEPT_BUTTON);
    await page.reload();
    await expect(page.locator(START_STOP)).toBeVisible();
    await expect(page.locator(ACCEPT_BUTTON)).toHaveCount(0);
  });

  test("a malformed consent record re-shows the gate", async ({ page }) => {
    await page.addInitScript(
      ([key]) => window.localStorage.setItem(key, "garbage"),
      [CONSENT_KEY],
    );
    await page.goto("/");
    await expect(page.locator(ACCEPT_BUTTON)).toBeVisible();
    await expect(page.locator(START_STOP)).toHaveCount(0);
  });
});

test.describe("strobe playback", () => {
  test.beforeEach(async ({ page }) => {
    await trackAudioContexts(page);
    await seedConsent(page);
    await page.goto("/");
  });

  test("Start runs both outputs: AudioContext running + surface toggling", async ({
    page,
  }) => {
    await page.click(START_STOP);
    await expect
      .poll(() => page.evaluate(() => window.__audioContexts.at(0)?.state))
      .toBe("running");
    // ~8Hz default → ~16 style flips/second; allow generous headless jitter.
    const flips = await countToggles(page, 1000);
    expect(flips).toBeGreaterThan(8);
  });

  test("Stop button halts both outputs immediately", async ({ page }) => {
    await page.click(START_STOP);
    await expect(page.locator(START_STOP)).toHaveText("Stop");
    await page.click(START_STOP);
    await expect(page.locator(START_STOP)).toHaveText("Start");
    expect(await countToggles(page, 500)).toBe(0);
  });

  test("Escape halts the strobe", async ({ page }) => {
    await page.click(START_STOP);
    await expect(page.locator(START_STOP)).toHaveText("Stop");
    await page.keyboard.press("Escape");
    await expect(page.locator(START_STOP)).toHaveText("Start");
    expect(await countToggles(page, 500)).toBe(0);
  });

  test("Space toggles start and stop regardless of focus", async ({ page }) => {
    await page.keyboard.press("Space");
    await expect(page.locator(START_STOP)).toHaveText("Stop");
    // Move focus somewhere arbitrary — interrupt must still work (SPEC §3.5).
    await page.locator(SLIDER).focus();
    await page.keyboard.press("Space");
    await expect(page.locator(START_STOP)).toHaveText("Start");
    expect(await countToggles(page, 500)).toBe(0);
  });

  test("tap anywhere on the strobe surface halts it", async ({ page }) => {
    await page.click(START_STOP);
    await expect(page.locator(START_STOP)).toHaveText("Stop");
    await page.mouse.click(200, 200); // top-left area: surface, not controls
    await expect(page.locator(START_STOP)).toHaveText("Start");
    expect(await countToggles(page, 500)).toBe(0);
  });

  test("clicking the slider area does NOT stop the session", async ({ page }) => {
    await page.click(START_STOP);
    await page.locator(SLIDER).click();
    await expect(page.locator(START_STOP)).toHaveText("Stop");
  });

  test("slider changes the live toggle rate", async ({ page }) => {
    await page.click(START_STOP);
    const atDefault = await countToggles(page, 1500); // 8Hz → ~24 flips
    await page.locator(SLIDER).fill("13");
    await expect(page.locator('[data-testid="frequency-value"]')).toContainText("13.0");
    const atMax = await countToggles(page, 1500); // 13Hz → ~39 flips
    expect(atMax).toBeGreaterThan(atDefault * 1.3);
    // Still running — a live frequency change must not restart or stop.
    await expect(page.locator(START_STOP)).toHaveText("Stop");
  });

  test("arrow keys adjust the frequency eyes-closed", async ({ page }) => {
    await expect(page.locator('[data-testid="frequency-value"]')).toContainText("8.0");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('[data-testid="frequency-value"]')).toContainText("8.1");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[data-testid="frequency-value"]')).toContainText("8.0");
  });

  test("footer disclaimer stays visible on the main screen", async ({ page }) => {
    await expect(page.locator("footer")).toContainText("18+");
    await page.click(START_STOP);
    await expect(page.locator("footer")).toContainText("epilepsy");
  });
});
